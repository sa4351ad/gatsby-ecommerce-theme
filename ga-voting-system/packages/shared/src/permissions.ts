/**
 * مصفوفة الصلاحيات — المصدر الوحيد للحقيقة لأسماء الصلاحيات المستخدمة في
 * الواجهة (لإخفاء/إظهار عناصر فقط، وليس كحماية) وفي الـ API (كحماية فعلية).
 * كل صلاحية تُتحقق دومًا على الخادم — راجع ARCHITECTURE.md §4.
 */

export const PERMISSIONS = {
  // النظام والمدراء
  SYSTEM_MANAGE: "system.manage",
  ADMINS_MANAGE: "admins.manage",
  SECURITY_MANAGE: "security.manage",
  SETTINGS_SMS_MANAGE: "settings.sms.manage",
  SETTINGS_EMAIL_MANAGE: "settings.email.manage",
  SETTINGS_VOTING_MANAGE: "settings.voting.manage",
  SETTINGS_GENERAL_MANAGE: "settings.general.manage",
  AUDIT_LOG_VIEW_ALL: "audit_log.view_all",

  // الأعضاء
  MEMBERS_VIEW: "members.view",
  MEMBERS_CREATE: "members.create",
  MEMBERS_UPDATE: "members.update",
  MEMBERS_DELETE: "members.delete",
  MEMBERS_IMPORT: "members.import",

  // المجموعات
  GROUPS_VIEW: "groups.view",
  GROUPS_MANAGE: "groups.manage",

  // الاجتماعات
  MEETINGS_VIEW: "meetings.view",
  MEETINGS_MANAGE: "meetings.manage",

  // التصويتات
  VOTINGS_VIEW: "votings.view",
  VOTINGS_CREATE: "votings.create",
  VOTINGS_UPDATE: "votings.update",
  VOTINGS_PUBLISH: "votings.publish",
  VOTINGS_CLOSE: "votings.close",
  VOTINGS_CANCEL: "votings.cancel",
  RESULTS_VIEW: "results.view",
  RESULTS_VIEW_SECRET_IDENTITY: "results.view_secret_identity", // SUPER_ADMIN فقط

  // إشعارات
  NOTIFICATIONS_SEND: "notifications.send",

  // تقارير
  REPORTS_VIEW: "reports.view",

  // العضو (ذاتي)
  SELF_VIEW: "self.view",
  SELF_UPDATE_LIMITED: "self.update.limited",
  VOTINGS_VIEW_ASSIGNED: "votings.view.assigned",
  VOTES_CAST: "votes.cast",
  VOTES_CONFIRM: "votes.confirm",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLE_KEYS = {
  SUPER_ADMIN: "SUPER_ADMIN",
  SYSTEM_ADMIN: "SYSTEM_ADMIN",
  VOTING_MANAGER: "VOTING_MANAGER",
  MEMBER: "MEMBER",
} as const;

export type RoleKey = (typeof ROLE_KEYS)[keyof typeof ROLE_KEYS];

/** المصفوفة الافتراضية المزروعة (Seed) — قابلة للتعديل لاحقًا من لوحة التحكم دون تعديل الكود */
export const DEFAULT_ROLE_PERMISSIONS: Record<RoleKey, PermissionKey[]> = {
  SUPER_ADMIN: Object.values(PERMISSIONS), // كل الصلاحيات
  SYSTEM_ADMIN: [
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.MEMBERS_CREATE,
    PERMISSIONS.MEMBERS_UPDATE,
    PERMISSIONS.MEMBERS_DELETE,
    PERMISSIONS.MEMBERS_IMPORT,
    PERMISSIONS.GROUPS_VIEW,
    PERMISSIONS.GROUPS_MANAGE,
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.MEETINGS_MANAGE,
    PERMISSIONS.VOTINGS_VIEW,
    PERMISSIONS.VOTINGS_CREATE,
    PERMISSIONS.VOTINGS_UPDATE,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND,
  ],
  VOTING_MANAGER: [
    PERMISSIONS.VOTINGS_VIEW,
    PERMISSIONS.VOTINGS_CREATE,
    PERMISSIONS.VOTINGS_UPDATE,
    PERMISSIONS.VOTINGS_PUBLISH,
    PERMISSIONS.VOTINGS_CLOSE,
    PERMISSIONS.VOTINGS_CANCEL,
    PERMISSIONS.RESULTS_VIEW,
    PERMISSIONS.NOTIFICATIONS_SEND,
    PERMISSIONS.MEMBERS_VIEW,
    PERMISSIONS.GROUPS_VIEW,
    PERMISSIONS.MEETINGS_VIEW,
    PERMISSIONS.REPORTS_VIEW,
  ],
  MEMBER: [
    PERMISSIONS.SELF_VIEW,
    PERMISSIONS.SELF_UPDATE_LIMITED,
    PERMISSIONS.VOTINGS_VIEW_ASSIGNED,
    PERMISSIONS.VOTES_CAST,
    PERMISSIONS.VOTES_CONFIRM,
  ],
};
