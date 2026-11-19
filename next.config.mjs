/** @type {import('next').NextConfig} */
const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["twilio"],
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "X-Frame-Options", value: "DENY" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "microphone=(self), camera=(), geolocation=()",
      },
    ];
    if (process.env.NODE_ENV === "production") {
      headers.push(
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy-Report-Only",
          value:
            "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self' https://*.twilio.com wss://*.twilio.com; frame-ancestors 'none'",
        },
      );
    }
    return [{ source: "/(.*)", headers }];
  },
};

export default nextConfig;
