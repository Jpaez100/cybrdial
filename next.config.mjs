/** @type {import('next').NextConfig} */
function getWidgetFrameAncestors() {
  const configured = process.env.WIDGET_ALLOWED_ORIGINS
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins =
    configured && configured.length > 0
      ? configured
      : process.env.NODE_ENV === "production"
        ? ["'self'"]
        : ["'self'", "http://localhost:*", "https://localhost:*"];
  return ["'self'", ...allowedOrigins.filter((origin) => origin !== "'self'")];
}

const nextConfig = {
  poweredByHeader: false,
  serverExternalPackages: ["twilio"],
  async headers() {
    const headers = [
      { key: "X-Content-Type-Options", value: "nosniff" },
      {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
      },
      {
        key: "Permissions-Policy",
        value: "microphone=(self), camera=(), geolocation=()",
      },
    ];
    const widgetFrameAncestors = getWidgetFrameAncestors().join(" ");
    const widgetCsp =
      `default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; ` +
      `img-src 'self' data:; connect-src 'self' https://*.twilio.com wss://*.twilio.com; ` +
      `frame-ancestors ${widgetFrameAncestors}`;
    if (process.env.NODE_ENV === "production") {
      headers.push(
        {
          key: "Strict-Transport-Security",
          value: "max-age=31536000; includeSubDomains",
        },
        {
          key: "Content-Security-Policy-Report-Only",
          value: widgetCsp,
        },
      );
    }
    return [
      {
        source: "/widget",
        headers: [
          ...headers,
          {
            key: "Content-Security-Policy",
            value: widgetCsp,
          },
        ],
      },
      { source: "/(.*)", headers },
    ];
  },
};

export default nextConfig;
