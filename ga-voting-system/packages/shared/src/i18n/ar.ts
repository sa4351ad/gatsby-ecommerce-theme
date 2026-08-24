/**
 * قاموس النصوص العربية — Section 2: كل النصوص قابلة للتعديل والترجمة مستقبلًا.
 * لإضافة الإنجليزية لاحقًا: إنشاء `en.ts` بنفس المفاتيح وربطه في `i18n/index.ts` بالواجهة.
 */
export const ar = {
  common: {
    save: "حفظ",
    cancel: "إلغاء",
    delete: "حذف",
    edit: "تعديل",
    search: "بحث",
    filter: "تصفية",
    confirm: "تأكيد",
    back: "رجوع",
    next: "التالي",
    loading: "جارِ التحميل...",
    noData: "لا توجد بيانات",
    error: "حدث خطأ ما",
    success: "تمت العملية بنجاح",
  },
  auth: {
    loginTitle: "تسجيل الدخول",
    identifierLabel: "رقم العضوية أو رقم الهوية",
    sendOtp: "إرسال رمز التحقق",
    otpTitle: "أدخل رمز التحقق",
    otpSentTo: "تم إرسال رمز التحقق إلى جوالك المنتهي بـ",
    otpResend: "إعادة إرسال الرمز",
    otpInvalid: "رمز التحقق غير صحيح",
    otpExpired: "انتهت صلاحية رمز التحقق",
    tooManyAttempts: "عدد محاولات كبير جدًا، الرجاء المحاولة لاحقًا",
    adminLoginTitle: "دخول المدراء",
  },
  member: {
    dashboardTitle: "لوحتي",
    pendingVotesAlert: "لديك {count} تصويتات تحتاج إلى اعتماد",
    requiredVotesButton: "التصويتات المطلوبة مني",
    votingWeight: "وزن التصويت",
    membershipStatus: "حالة العضوية",
  },
  voting: {
    review: "مراجعة التصويت",
    confirmFinal: "اعتماد التصويت نهائيًا",
    confirmWarning: "بعد اعتماد التصويت لا يمكنك تغييره.",
    timeRemaining: "الوقت المتبقي على إغلاق التصويت",
    successTitle: "تم اعتماد تصويتك بنجاح",
    referenceNumber: "رقم العملية",
    statuses: {
      DRAFT: "مسودة",
      SCHEDULED: "مجدوَل",
      OPEN: "مفتوح",
      CLOSED: "مغلق",
      CANCELLED: "ملغى",
      ARCHIVED: "مؤرشف",
    },
  },
} as const;

export type TranslationDict = typeof ar;
