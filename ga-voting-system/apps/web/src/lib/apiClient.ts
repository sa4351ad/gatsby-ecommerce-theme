const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export class ApiClientError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

function readCookie(name: string): string | undefined {
  if (typeof document === "undefined") return undefined;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}

// عندما تُنشَر الواجهة والـ API على نطاقين منفصلين تمامًا (لا نطاق أب مشترك، كحال
// خدمتي *.onrender.com في بيئة التجربة)، لا يستطيع JS في هذه الصفحة قراءة كوكي ga_csrf
// لأنه صادر عن نطاق الـ API وليس نطاق الواجهة — حتى مع httpOnly=false. لذا يُعاد رمز
// CSRF أيضًا في نص استجابة تسجيل الدخول/التجديد (راجع session.ts)، وتُخزَّن القيمة هنا
// كبديل يُستخدم فقط عند تعذّر قراءة الكوكي مباشرة (النشر على نفس النطاق يبقى يعمل كما هو).
const CSRF_STORAGE_KEY = "ga_csrf_fallback";

function readStoredCsrf(): string | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    return window.localStorage.getItem(CSRF_STORAGE_KEY) ?? undefined;
  } catch {
    return undefined;
  }
}

function storeCsrfFromResponse(data: unknown) {
  if (typeof window === "undefined") return;
  if (data && typeof data === "object" && typeof (data as any).csrfToken === "string") {
    try {
      window.localStorage.setItem(CSRF_STORAGE_KEY, (data as any).csrfToken);
    } catch {
      // تجاهل (مثلاً وضع التصفح الخاص)
    }
  }
}

function clearStoredCsrf() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(CSRF_STORAGE_KEY);
  } catch {
    // تجاهل
  }
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  isFormData?: boolean;
  query?: Record<string, string | number | boolean | undefined>;
}

/** عميل API موحّد — يرسل الكوكيز تلقائيًا ويضيف رمز CSRF لأي طلب يغيّر البيانات */
export async function apiFetch<T = any>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const url = new URL(`${API_BASE}${path}`);
  if (options.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v !== undefined) url.searchParams.set(k, String(v));
    }
  }

  const headers: Record<string, string> = {};
  if (method !== "GET") {
    const csrf = readCookie("ga_csrf") ?? readStoredCsrf();
    if (csrf) headers["x-csrf-token"] = csrf;
  }

  let body: BodyInit | undefined;
  if (options.body && options.isFormData) {
    body = options.body as FormData;
  } else if (options.body) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(options.body);
  }

  const res = await fetch(url.toString(), {
    method,
    credentials: "include",
    headers,
    body,
  });

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => ({})) : await res.text();

  if (!res.ok) {
    const message = isJson && (data as any)?.message ? (data as any).message : "حدث خطأ غير متوقع";
    throw new ApiClientError(res.status, message, isJson ? (data as any)?.errors : undefined);
  }

  if (path === "/api/v1/auth/logout") {
    clearStoredCsrf();
  } else if (isJson) {
    storeCsrfFromResponse(data);
  }

  return data as T;
}

export function apiDownloadUrl(path: string, query?: Record<string, string>) {
  const url = new URL(`${API_BASE}${path}`);
  if (query) for (const [k, v] of Object.entries(query)) url.searchParams.set(k, v);
  return url.toString();
}

export { API_BASE };
