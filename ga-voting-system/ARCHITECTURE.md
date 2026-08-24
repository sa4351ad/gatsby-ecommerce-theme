# نظام إدارة الجمعيات العمومية والتصويت الإلكتروني
## وثيقة التصميم المعماري (Architecture Document)

> هذه الوثيقة تُكتب **قبل** الشروع في الكتابة الفعلية للكود، وتُحدّث كلما تغيّر قرار معماري.
> المشروع حسّاس (نتائج تصويت رسمية قابلة للتدقيق) لذا Backend هو المصدر الوحيد للحقيقة (Source of Truth) في كل قرار أمني أو منطقي.

---

## 1. نظرة عامة على المعمارية

```
                         ┌────────────────────────┐
                         │        المستخدم          │
                         │  (عضو / مدير / مسؤول)     │
                         └───────────┬────────────┘
                                     │ HTTPS
                       ┌─────────────▼──────────────┐
                       │   apps/web  (Next.js 14)    │
                       │   RSC + Client Components    │
                       │   RTL / عربي أساسي            │
                       └─────────────┬───────────────┘
                                     │ REST JSON (fetch + httpOnly cookie session)
                       ┌─────────────▼───────────────┐
                       │   apps/api  (Node.js + TS)   │
                       │   Express, Layered Modules    │
                       │  Auth → RBAC → Validation →   │
                       │  Business Rules → Audit Log   │
                       └───┬───────────┬─────────────┘
                           │           │
                 ┌─────────▼──┐   ┌────▼─────────────┐
                 │ PostgreSQL │   │ Providers (Pluggable) │
                 │  (Prisma)  │   │ SMS / Email / (WhatsApp lat.) │
                 └────────────┘   └────────────────────┘
```

**فصل صريح بين Frontend و Backend** (Section 2 من المتطلبات): `apps/web` لا يتحدث مع قاعدة البيانات مباشرة أبدًا، وكل عملية حساسة (تصويت، اعتماد، صلاحيات) تمر عبر `apps/api` فقط. هذا يضمن أن أي محاولة تلاعب من الـ Frontend أو عبر استدعاء API مباشر (Postman/cURL) تخضع لنفس التحقق الصارم.

### لماذا Monorepo؟
`pnpm workspaces` مع 4 حزم:
- `apps/web` – واجهة Next.js
- `apps/api` – خادم API مستقل (قابل للنشر على حاويته الخاصة، يمكن توسيعه لاحقًا لعدة خدمات microservices)
- `packages/db` – Prisma schema + client موحّد (مصدر وحيد للـ schema)
- `packages/shared` – أنواع TypeScript، Zod validation schemas، خرائط الصلاحيات، ثوابت مشتركة بين الواجهة والخادم

هذا يسمح مستقبلًا بفصل `apps/api` إلى خدمات مصغّرة (مثلاً voting-service منفصل) دون إعادة كتابة العقود المشتركة.

---

## 2. Technology Stack

| الطبقة | التقنية | السبب |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript | SSR/RSC، أداء جيد على الجوال، دعم ممتاز لـ SEO والتوجيه |
| التنسيق | Tailwind CSS + `dir="rtl"` + خط عربي (Cairo/IBM Plex Arabic) | تحكم دقيق بالـ RTL و Responsive |
| الحالة/البيانات | React Query (fetch wrapper) + Server Components للقراءة الأولية | تقليل الكود المكرر، تجربة تحميل سلسة |
| i18n | قاموس ترجمة `packages/shared/src/i18n` (مفاتيح → نص عربي)، بنية تسمح بإضافة `en.ts` لاحقًا دون تغيير الكود | العربية افتراضية، الإنجليزية قابلة للإضافة |
| Backend | Node.js 20 + TypeScript + Express | نضج، مرونة في بناء Middleware صارمة للأمان |
| ORM | Prisma + PostgreSQL 15 | Type-safety، Migrations، أداء جيد مع الفهرسة |
| Auth | جلسات httpOnly Cookie موقّعة (JWT قصير العمر + Refresh Token rotation) + OTP عبر SMS/Email | لا تخزين توكن في localStorage (حماية من XSS) |
| قوائم الانتظار/الجدولة | Node `node-cron` لإغلاق التصويتات المنتهية + إرسال التذكيرات | لا حاجة لبنية معقّدة في هذه المرحلة، قابلة للاستبدال بـ BullMQ لاحقًا |
| الملفات | `multer` (تحقق نوع MIME حقيقي عبر `file-type`) + `sharp` لضغط الصور + `exceljs` لقراءة/كتابة Excel | أمان رفع الملفات |
| الاختبارات | Vitest/Jest + Supertest | اختبار منطق التصويت الحسّاس |
| الحاويات | Docker + docker-compose (api, web, postgres, adminer اختياري) | نشر سهل على أي VPS |

---

## 3. هيكل المجلدات (Folder Structure)

```
ga-voting-system/
├── ARCHITECTURE.md
├── README.md
├── .env.example
├── docker-compose.yml
├── package.json                 # pnpm workspace root
├── pnpm-workspace.yaml
├── packages/
│   ├── db/
│   │   ├── prisma/schema.prisma # المخطط الكامل (Section 35)
│   │   ├── prisma/seed.ts
│   │   └── src/index.ts         # PrismaClient singleton
│   └── shared/
│       └── src/
│           ├── enums.ts         # الأدوار، حالات التصويت، أنواع الأسئلة...
│           ├── permissions.ts   # مصفوفة RBAC (Section 3)
│           ├── validation/      # Zod schemas مشتركة (Frontend + Backend)
│           └── i18n/ar.ts
├── apps/
│   ├── api/
│   │   └── src/
│   │       ├── server.ts
│   │       ├── app.ts           # Express app + security middleware
│   │       ├── env.ts           # تحميل والتحقق من env vars
│   │       ├── middleware/      # auth, rbac, rateLimit, error, audit
│   │       ├── lib/             # jwt, otp, hash, sms/*, email/*, integrity
│   │       ├── modules/
│   │       │   ├── auth/        # Auth APIs
│   │       │   ├── members/     # Members APIs + Excel import
│   │       │   ├── groups/      # Groups APIs
│   │       │   ├── meetings/    # Meetings APIs
│   │       │   ├── votings/     # Voting APIs (الأهم أمنيًا)
│   │       │   ├── notifications/
│   │       │   ├── settings/    # Settings APIs (SMS/Email/Security/General)
│   │       │   ├── reports/     # Reports APIs (CSV/Excel/PDF)
│   │       │   └── audit/       # Audit Log APIs (قراءة فقط)
│   │       └── jobs/            # إغلاق التصويت تلقائيًا، تذكيرات
│   │   └── tests/               # اختبارات الوظائف الحسّاسة
│   └── web/
│       └── src/
│           ├── app/
│           │   ├── (auth)/login, (auth)/login/otp
│           │   ├── (member)/dashboard, (member)/voting/[id]
│           │   └── (admin)/admin/{dashboard,members,groups,meetings,votings,settings,audit-log,reports}
│           ├── components/
│           └── lib/apiClient.ts
```

---

## 4. الأدوار والصلاحيات (RBAC)

جدول `roles` + `permissions` + `role_permissions` (Many-to-Many) بدل أدوار مُبَرمَجة يدويًا، بحيث تكون الصلاحيات **قابلة للتخصيص** من لوحة التحكم كما طُلب.

الأدوار الأساسية المزروعة (Seed) — قابلة للتعديل لاحقًا دون تغيير الكود:

| الدور | مفاتيح صلاحيات أساسية |
|---|---|
| `SUPER_ADMIN` | `*` (كل الصلاحيات، بما فيها إدارة المدراء والأمان وسجلات التدقيق الكاملة) |
| `SYSTEM_ADMIN` | `members.*`, `groups.*`, `meetings.*`, `votings.*`, `reports.view` |
| `VOTING_MANAGER` | `votings.create`, `votings.update`, `votings.publish`, `votings.close`, `voting_questions.*`, `notifications.send`, `results.view` |
| `MEMBER` | `self.view`, `self.update.limited`, `votings.view.assigned`, `votes.cast`, `votes.confirm` |

قاعدة التحقق: **كل Endpoint في الـ API يمر عبر `requirePermission("resource.action")`**، ولا يُسمح بأي عملية استنادًا فقط لإخفاء عنصر في الواجهة. التحقق من الصلاحية يتم دائمًا على الخادم قبل الوصول لأي بيانات.

---

## 5. منطق التصويت (Voting Logic) — قلب النظام

### 5.1 دورة حياة التصويت (State Machine)
```
DRAFT → SCHEDULED → OPEN → CLOSED → ARCHIVED
                       ↘  CANCELLED
```
الانتقال `OPEN → CLOSED` يحدث تلقائيًا من الخادم (Cron Job كل دقيقة) بمجرد تجاوز `endAt`، بالإضافة إلى إمكانية إغلاق يدوي مبكر من `VOTING_MANAGER`. لا يُسمح بالتصويت إلا عندما تكون الحالة الفعلية (المُحسوبة من الوقت، وليس الحقل المخزَّن فقط) هي `OPEN`.

### 5.2 التحقق قبل كل تصويت (Pipeline إلزامي بالترتيب)
عند POST `/votings/:id/vote` يجب أن تمر العملية عبر جميع الخطوات التالية بدون استثناء (Section 47/50):

1. **Authentication** – جلسة صالحة (Cookie موقّع + لم تنتهِ).
2. **Authorization** – الدور `MEMBER` ولديه صلاحية `votes.cast`.
3. **Member Status** – العضو `ACTIVE` وغير محذوف وعضويته لم تنتهِ.
4. **Eligibility Snapshot** – وجود سجل في `voting_eligibility` لهذا العضو + هذا التصويت (يُنشأ لحظة **فتح** التصويت بأخذ Snapshot لوزن العضو وحالته في تلك اللحظة — Section 37، لا يتأثر بتغييرات لاحقة).
5. **Voting Status** – حالة التصويت المُحسوبة = `OPEN`.
6. **Time Window** – `now (server time, Asia/Riyadh) ∈ [startAt, endAt]`.
7. **Duplicate Check** – `UNIQUE(memberId, votingId, questionId)` على جدول `votes` + فحص منطقي مسبق. حتى محاولة إرسال Request مباشر تُرفض بواسطة الفهرس الفريد في قاعدة البيانات (ليس فقط منطق التطبيق).
8. **Question Rules** – نوع السؤال (رأي/نعم-لا/اختيار واحد/متعدد بحد أدنى وأقصى/انتخاب بعدد مقاعد محدد...) والتحقق أن الاختيارات ضمن القواعد المحدَّدة له.
9. **Vote Creation** – تُكتب الإجابات ضمن معاملة DB واحدة (Transaction).
10. **Confirmation Step** – العضو يجب أن يستدعي endpoint منفصل `/votings/:id/confirm` بعد المراجعة؛ هذا هو ما يُنشئ سجل `vote_confirmations` (اعتماد رسمي، لا يُعتبر التصويت نهائيًا قبله). يمكن اشتراط OTP إضافي هنا حسب إعدادات الأمان.
11. **Integrity Hash** – عند الاعتماد يُحسب `SHA-256` على (memberId + votingId + الإجابات المرتّبة + timestamp + سرّ خادم) ويُخزَّن كـ `vote_signatures.hash`، ويُولَّد رقم مرجعي فريد مثل `VOTE-2026-000001`.
12. **Audit Log** – تسجيل `VOTE_CAST` و`VOTE_CONFIRMED` بكل التفاصيل (IP, UA, وقت).

بعد الاعتماد: **لا تعديل ولا حذف** لسجلات `votes`/`vote_confirmations` (لا صلاحية DB ولا مسار API يسمح بذلك). أي تصحيح إداري يُنشئ سجل تصحيح منفصل مرتبط ويُوثَّق في Audit Log مع الاحتفاظ بالنسخة الأصلية (Append-only Ledger pattern).

### 5.3 الوزن (Weighted Voting)
كل `voting_eligibility.snapshotWeight` يُستخدم في الاحتساب بدل `member.votingWeight` الحيّ. النتائج تُعرض دائمًا بـ 3 مقاييس: عدد الأصوات، مجموع الأوزان، النسبة المئوية من كل منهما.

### 5.4 النصاب (Quorum)
يُحسب بعد الإغلاق (أو عند الطلب أثناء الفتح للعرض الإداري فقط) استنادًا إلى:
- عدد الأعضاء المؤهلين (`voting_eligibility` وليس كل المستخدمين) الذين لديهم `vote_confirmations`.
- المقارنة بـ `quorumType` (نسبة من عدد الأعضاء / عدد ثابت / نسبة من مجموع الأوزان).

### 5.5 أنواع الأسئلة (Extensible Strategy Pattern)
جدول `voting_questions.type` (enum قابل للتوسع) + جدول `voting_options` عام. منطق الاحتساب لكل نوع مُنفَّذ كوحدة مستقلة تحت `apps/api/src/modules/votings/question-types/*` تُنفّذ واجهة موحّدة:
```ts
interface QuestionTypeStrategy {
  validateAnswer(question, options, answerPayload, eligibility): void; // يرمي خطأ إن خالف القواعد
  tally(question, votes): TallyResult;
}
```
إضافة نوع جديد (تقييم 1-5، ترتيب Ranking...) = إضافة ملف واحد جديد وربطه في السجل، دون تعديل باقي النظام — يحقق متطلب "أنواع تصويت مستقبلية دون إعادة بناء" (Section 15/39/46).

### 5.6 الانتخابات (Elections)
حالة خاصة من `MULTI_CHOICE` بقيد `min = max = عدد المقاعد` (أو `min..max` قابل للتخصيص) + بيانات مرشح إضافية (صورة/نبذة) في جدول `candidates` مرتبط بـ `voting_options`.

### 5.7 السرية (Secret / Anonymous Voting)
عند `voting.isSecret = true`:
- جدول `votes` **لا يخزّن `memberId` في نفس السجل الذي تُقرأ منه الإجابة مباشرة من واجهة الإدارة** — بل يُفصل عبر جدولين:
  - `vote_participation` (يثبت أن العضو صوّت، `memberId + votingId`, للتحقق من عدم التكرار وحساب المشاركة).
  - `votes` / `vote_answers` تُخزَّن بمعرّف عشوائي (`anonymousToken`) غير قابل للربط المباشر من الواجهة الإدارية بجدول الأعضاء (لا يوجد Foreign Key إلى `members` في مسار العرض؛ الربط الوحيد موجود داخل معاملة الإنشاء نفسها ولا يُعرض عبر أي API للأدوار الإدارية العادية). فقط `SUPER_ADMIN` عبر إجراء تدقيق موثّق (مسار API منفصل ومُسجَّل بالكامل في Audit Log) يمكنه ذلك عند الحاجة القانونية القصوى، وهذا بحد ذاته يُسجَّل كحدث حسّاس.
- الـ API الذي يعرض النتائج التفصيلية (`/votings/:id/results`) يتحقق من `isSecret` ويُرجع **تجميعات فقط** (Aggregates) لأي دور أقل من `SUPER_ADMIN`، ولا يعيد أبدًا حقل `memberId` مرتبطًا بإجابة عندما يكون التصويت سريًا.

### 5.8 التصويت بالوكالة (Proxy Voting) — نقطة توسّع مستقبلية
جدول `votes` يحتوي عمود `castByProxyOfMemberId NULL` (غير مُفعَّل حاليًا، Nullable) بحيث يمكن مستقبلًا السماح لعضو بالتصويت نيابة عن آخر دون تعديل بنية الجدول — فقط تفعيل منطق تحقق إضافي.

---

## 6. النموذج الأمني (Security Model)

| التهديد | الحماية |
|---|---|
| XSS | React (تعقيم افتراضي) + `Content-Security-Policy` + عدم استخدام `dangerouslySetInnerHTML` |
| CSRF | جلسة Cookie بـ `SameSite=Lax` + `httpOnly` + `Secure` + رمز CSRF لطلبات الكتابة عبر Header مخصص يُتحقق منه على الخادم |
| SQL Injection | Prisma (Parameterized queries حصرًا) |
| Brute Force / OTP | Rate limiting لكل IP ولكل حساب + قفل مؤقت بعد N محاولات فاشلة + `express-rate-limit` + تتبّع في `login_attempts` |
| كشف الأسرار | مفاتيح SMS/SMTP مشفّرة (`AES-256-GCM`) في العمود قبل التخزين، لا تُعاد أبدًا كاملة في أي استجابة API (Masking) |
| رفع ملفات خبيثة | `file-type` للتحقق من التوقيع الحقيقي للملف + حد أقصى للحجم + قائمة امتدادات مسموحة + تخزين خارج مسار قابل للتنفيذ |
| Session Hijacking | JWT قصير العمر (15 دقيقة) + Refresh Token في Cookie منفصل httpOnly مع Rotation ومنع إعادة استخدام Refresh Token قديم |
| Privilege Escalation | لا اعتماد على أي حقل قادم من الطلب لتحديد الدور؛ الدور يُقرأ من الجلسة/DB فقط |
| Headers | `helmet` (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy...) |
| Enumeration | رسائل خطأ عامة موحّدة عند فشل تسجيل الدخول (لا تكشف إن كان رقم العضوية موجودًا) |

---

## 7. هيكلة الـ API (REST)

جميع المسارات تحت `/api/v1`. أمثلة (التفصيل الكامل في كود كل Module):

```
POST   /auth/login/request-otp        # إدخال رقم العضوية/الهوية
POST   /auth/login/verify-otp
POST   /auth/admin/login              # بريد/كلمة مرور + OTP اختياري للإداريين
POST   /auth/logout
POST   /auth/refresh

GET    /members            POST /members            PATCH /members/:id
POST   /members/import/preview        # رفع Excel → معاينة
POST   /members/import/commit
GET    /members/import/:jobId/errors-report

GET/POST /groups           POST /groups/:id/members

GET/POST /meetings         PATCH /meetings/:id

GET/POST /votings          PATCH /votings/:id
POST   /votings/:id/publish   POST /votings/:id/open   POST /votings/:id/close   POST /votings/:id/cancel
POST   /votings/:id/vote               # تسجيل الاختيارات (مسودة العضو)
POST   /votings/:id/confirm            # الاعتماد النهائي
GET    /votings/:id/my-status
GET    /votings/:id/results
GET    /votings/mine                   # التصويتات المستهدَفة للعضو الحالي

GET    /notifications/mine   PATCH /notifications/:id/read
POST   /notifications/broadcast

GET/PUT /settings/general|voting|sms|email|security|notifications
POST   /settings/sms/test    POST /settings/email/test

GET    /reports/members|attendance|voting|participation|non-voters|audit-log|sms|email?format=csv|xlsx|pdf

GET    /audit-log
```

---

## 8. قاعدة البيانات — ملخص (التفصيل الكامل Prisma Schema في `packages/db/prisma/schema.prisma`)

الجداول المنطقية المطلوبة (Section 35) وأكثر، مع كل العلاقات، `@@unique`, `@@index`, و`deletedAt` للحذف الناعم حيث يلزم:
`users, members, roles, permissions, role_permissions, groups, group_members, meetings, votings, voting_questions, voting_options, candidates, voting_eligibility, votes, vote_answers, vote_participation, vote_confirmations, vote_signatures, notifications, sms_logs, email_logs, audit_logs, system_settings, otp_codes, login_attempts, sessions, member_import_jobs, member_import_errors`.

نقاط أداء: فهارس على `members(nationalId), members(phone), members(membershipNumberSystem), votes(votingId, memberId), voting_eligibility(votingId, memberId)`، وتقسيم منطقي للاستعلامات الكبيرة عبر `cursor pagination`.

---

## 9. خطة مراحل التنفيذ

1. **Scaffold + Prisma Schema + Shared package** (هذه المرحلة)
2. **API Core**: env/security middleware, auth+OTP, RBAC, audit log service
3. **API Modules**: members(+import), groups, meetings
4. **API Voting Engine**: votings CRUD + lifecycle + eligibility + vote casting + confirmation + results + quorum + question-types
5. **API**: notifications (SMS/Email pluggable providers)، settings، reports، seed data
6. **Tests** للوظائف الحسّاسة
7. **Frontend**: تسجيل الدخول للعضو (OTP) + لوحة العضو + صفحة التصويت + عداد الوقت
8. **Frontend**: لوحة تحكم المدير الكاملة (أعضاء/مجموعات/اجتماعات/تصويتات/إعدادات/تدقيق/تقارير)
9. **Docker + README + .env.example + تحقق نهائي**

كل مرحلة تُبنى فوق التي قبلها وتُختبر قبل الانتقال للتالية، ويُدفع (git push) commit في نهاية كل مرحلة رئيسية.
