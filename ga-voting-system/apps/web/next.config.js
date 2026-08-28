// عنوان الـ API الفعلي (خادم فقط، لا NEXT_PUBLIC_ لأنه لا يصل للمتصفح إطلاقًا).
const API_PROXY_TARGET = process.env.API_PROXY_TARGET || "http://localhost:4000";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ["@ga/shared"],
  images: {
    remotePatterns: [{ protocol: "http", hostname: "localhost" }],
  },
  // يمرّر خادم Next.js نفسه طلبات /api/* إلى الـ API الفعلي (وليس المتصفح). بهذا يرى
  // المتصفح كل الطلبات وكأنها من نفس النطاق دائمًا، فتُصبح كوكيز الجلسة (ga_access/
  // ga_refresh/ga_csrf) كوكيز من الطرف الأول Same-Site بلا استثناء — يتفادى هذا حجب
  // المتصفحات الحديثة (Safari ITP، وضع منع تتبّع صارم في Firefox، وتدريجيًا Chrome)
  // لكوكيز الطرف الثالث حتى مع SameSite=None، وهي مشكلة لا يحلّها ضبط SameSite وحده
  // عندما تُنشَر الواجهة والـ API على نطاقين منفصلين تمامًا (كحال Render التجريبي).
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_PROXY_TARGET}/api/:path*` }];
  },
};

module.exports = nextConfig;
