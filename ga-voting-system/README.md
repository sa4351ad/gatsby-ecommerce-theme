# نظام إدارة الجمعية العمومية والتصويت الإلكتروني

منصة متكاملة لإدارة عضوية الجمعيات العمومية، والاجتماعات، والتصويت الإلكتروني الآمن على القرارات والانتخابات، مع سجل تدقيق شامل وتكامل قابل للتوسع مع مزودي SMS والبريد الإلكتروني.

راجع [`ARCHITECTURE.md`](./ARCHITECTURE.md) للتفاصيل الكاملة عن المعمارية، مخطط قاعدة البيانات، منطق التصويت، والنموذج الأمني.

---

## 1. لمحة سريعة عن المشروع

| | |
|---|---|
| Frontend | Next.js 14 (App Router) + React 18 + TypeScript + Tailwind CSS — عربي RTL بالكامل |
| Backend | Node.js 20 + TypeScript + Express — API منظمة ومحمية |
| Database | PostgreSQL 15 + Prisma ORM |
| Auth | جلسات Cookie آمنة (JWT قصير العمر + Refresh Token Rotation) + OTP عبر SMS للأعضاء، بريد/كلمة مرور للإداريين |
| البنية | pnpm workspace monorepo: `apps/api`, `apps/web`, `packages/db`, `packages/shared` |

---

## 2. متطلبات التشغيل

- Node.js ≥ 20
- pnpm ≥ 9 (`corepack enable` كافٍ لتفعيله)
- PostgreSQL ≥ 14 (محليًا أو عبر Docker)
- (اختياري) Docker + Docker Compose للنشر السريع

---

## 3. التثبيت (تطوير محلي)

```bash
cd ga-voting-system
pnpm install
```

### إعداد متغيرات البيئة

انسخ `.env.example` وأنشئ:
- `apps/api/.env` (يحتاج `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `VOTE_HASH_SECRET`, `SETTINGS_ENCRYPTION_KEY`, `WEB_APP_URL`, ...)
- `packages/db/.env` (يحتاج `DATABASE_URL` فقط — يُستخدم من أوامر Prisma CLI مباشرة)
- `apps/web/.env.local` (يحتاج `NEXT_PUBLIC_API_URL`)

```bash
cp .env.example apps/api/.env
cp .env.example packages/db/.env
echo "NEXT_PUBLIC_API_URL=http://localhost:4000" > apps/web/.env.local
```

**لا تستخدم القيم الافتراضية في `.env.example` في بيئة إنتاجية.** ولّد أسرارًا عشوائية:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### إعداد قاعدة البيانات

```bash
# تأكد من تشغيل PostgreSQL وإنشاء قاعدة بيانات باسم مطابق لـ DATABASE_URL
pnpm db:generate     # توليد Prisma Client
pnpm db:migrate      # تطبيق الـ Migrations (تفاعلي، ينشئ migration جديدة عند أول تشغيل)
pnpm db:seed         # تعبئة بيانات تجريبية (أدوار، مدراء، أعضاء، تصويتات...)
```

للنشر (بدون migrate dev التفاعلي):

```bash
pnpm --filter @ga/db exec prisma migrate deploy
```

### تشغيل المشروع

في نافذتي طرفية منفصلتين:

```bash
pnpm dev:api    # http://localhost:4000
pnpm dev:web    # http://localhost:3000
```

---

## 4. بيانات الدخول التجريبية (بعد تشغيل `pnpm db:seed`)

| الدور | البريد | كلمة المرور |
|---|---|---|
| Super Admin | `superadmin@example.com` | `SuperAdmin@123` |
| System Admin | `sysadmin@example.com` | `SysAdmin@123` |
| Voting Manager | `votingmanager@example.com` | `VotingMgr@123` |

الدخول من `http://localhost:3000/admin/login`.

**دخول عضو تجريبي:** من `http://localhost:3000/login`، أدخل رقم الهوية `1000000001` (أو رقم العضوية `M-000001`). في وضع التطوير، مزود الرسائل الافتراضي هو `CONSOLE` الذي يطبع رمز OTP في سجلات (logs) خادم API بدل إرساله فعليًا — راقب الطرفية التي تُشغّل `pnpm dev:api`.

يحتوي الإعداد التجريبي على 8 أعضاء بأوزان تصويت مختلفة (1، 5، 10)، مجموعة "مجلس الإدارة"، اجتماع، وثلاثة تصويتات جاهزة للتجربة فورًا: قرار موزون، انتخابات (3 مقاعد من 5 مرشحين)، وتصويت سري.

---

## 5. إنشاء مدير إضافي

لا توجد حاليًا واجهة لإنشاء إداريين جدد من لوحة التحكم (نقطة تحسين مستقبلية طبيعية). لإنشاء مدير جديد يدويًا:

```ts
// شغّلها عبر: pnpm --filter @ga/db exec tsx <ملف مؤقت>.ts
import { prisma } from "@ga/db";
import bcrypt from "bcryptjs";

const role = await prisma.role.findUniqueOrThrow({ where: { key: "SYSTEM_ADMIN" } }); // أو SUPER_ADMIN / VOTING_MANAGER
await prisma.user.create({
  data: { email: "admin2@example.com", passwordHash: await bcrypt.hash("StrongPassword@123", 12), roleId: role.id },
});
```

---

## 6. إعداد SMS

النظام لا يرتبط بمزود واحد — راجع `apps/api/src/lib/sms/provider.interface.ts`. المزوّدان الجاهزان:

- **`CONSOLE`** (الافتراضي): يطبع الرسالة في سجلات الخادم — مناسب للتطوير فقط.
- **`GENERIC_HTTP`**: يرسل POST JSON إلى `apiUrl` مضبوط من لوحة التحكم (`الإعدادات → الرسائل القصيرة`)، مع `apiKey`/`username`/`password`/`senderName` حسب مزودك.

لإضافة مزود جديد: أنشئ ملفًا في `apps/api/src/lib/sms/providers/` ينفّذ الواجهة `SmsProvider`، وسجّله في `sms.service.ts`.

من لوحة التحكم: **الإعدادات ← الرسائل القصيرة**، املأ الحقول، ثم استخدم "إرسال اختبار" (`Test SMS`) قبل الاعتماد على المزود فعليًا.

---

## 7. إعداد البريد الإلكتروني (SMTP)

من لوحة التحكم: **الإعدادات ← البريد الإلكتروني** — أدخل `SMTP Host`, `Port`, `Username`, `Password`, `Encryption`, `From Name`, `From Email`، ثم "إرسال اختبار".

---

## 8. تشغيل الاختبارات

```bash
# يحتاج قاعدة بيانات اختبار منفصلة — أنشئها وحدّث apps/api/.env.test
createdb ga_voting_test
pnpm --filter @ga/db exec prisma migrate deploy --schema packages/db/prisma/schema.prisma  # (بعد ضبط DATABASE_URL إلى قاعدة الاختبار)

pnpm test:api
```

الاختبارات (25 اختبار عبر 8 ملفات، Vitest + Supertest ضد قاعدة بيانات حقيقية) تغطي: تسجيل الدخول عبر OTP والحماية من Brute Force، منع التصويت المكرر (بما فيها محاولات متزامنة/Race Condition)، السماح بتغيير التصويت (Append-only)، احتساب النتائج الموزون، ثبات Snapshot الأهلية رغم تغيّر بيانات العضو لاحقًا، النصاب (بأنواعه الثلاثة)، التحكم الزمني الصارم، حدود اختيار المرشحين في الانتخابات، إخفاء الهوية الحقيقي في التصويت السري (يتحقق مباشرة من قاعدة البيانات)، وRBAC/CSRF.

---

## 9. النشر (Deployment)

### عبر Docker Compose (الأسهل لـ VPS)

```bash
cp .env.example .env   # واملأه بأسرار إنتاجية حقيقية
docker compose up -d --build
docker compose exec api pnpm --filter @ga/db exec prisma migrate deploy
docker compose exec api pnpm --filter @ga/db exec tsx prisma/seed.ts   # اختياري لأول تشغيل فقط
```

يشغّل هذا: PostgreSQL (منفذ 5432)، API (منفذ 4000)، Web (منفذ 3000). ضع خلفهما Nginx/Caddy لإصدار شهادة HTTPS وربط الدومين، وحدّث `WEB_APP_URL` و`NEXT_PUBLIC_API_URL` في `.env` ليطابقا نطاقك الفعلي.

### نشر يدوي على VPS

1. ثبّت Node 20 وpnpm وPostgreSQL.
2. `pnpm install --frozen-lockfile && pnpm --filter @ga/db exec prisma generate`
3. ابنِ الخدمتين: `pnpm --filter @ga/api build` و`pnpm --filter @ga/web build`.
4. شغّلهما عبر مدير عمليات (PM2/systemd): `node apps/api/dist/server.js` و`pnpm --filter @ga/web start`.
5. طبّق الـ Migrations: `pnpm --filter @ga/db exec prisma migrate deploy`.

---

## 10. هيكل المجلدات

```
ga-voting-system/
├── ARCHITECTURE.md          # التصميم المعماري الكامل
├── docker-compose.yml
├── .env.example
├── packages/
│   ├── db/                  # Prisma schema + client + seed
│   └── shared/               # أنواع مشتركة، RBAC، Zod schemas، i18n
└── apps/
    ├── api/                  # Express API (Auth, Members, Voting Engine, ...)
    └── web/                  # Next.js (تجربة العضو + لوحة الإدارة)
```

---

## 11. ملاحظات وحدود معروفة (Roadmap طبيعي)

هذه نقاط تحسين واضحة لمرحلة تالية، وليست نواقص في المسار الحرج (الأمان ومنطق التصويت مُختبَران وموثّقان بالكامل):

- تصويت الـ Ranking/Percentage مُنفَّذ في محرك الاحتساب (Backend) وقابل للإضافة في واجهة إنشاء التصويت (حاليًا واجهة الإنشاء تدعم مباشرة: قرار، نعم/لا، اختيار واحد/متعدد، انتخابات، تقييم 1-5/1-10).
- واجهة اختيار أعضاء مُحدَّدين يدويًا لتصويت `SELECTED` غير مبنية في الواجهة بعد (الـ API يدعمها بالكامل).
- إنشاء إداريين جدد يتم حاليًا عبر سكربت (راجع القسم 5) وليس من واجهة رسومية.
- تقارير PDF/Excel/CSV مُفعّلة على كل مسارات `apps/api/src/modules/reports` عبر معامل `?format=csv|xlsx|pdf` (النمط قابل للتعميم بسهولة — راجع `exporters.ts`).
- التصويت بالوكالة (Proxy Voting)، التوقيع الإلكتروني المتقدم، WhatsApp، وMulti-Tenant: الحقول والبنية جاهزة لهذا التوسع (راجع ARCHITECTURE.md §5.8 و§46) دون الحاجة لإعادة تصميم قاعدة البيانات.
