const withPWA = require("next-pwa")({
  dest: "public",
  disable: process.env.NODE_ENV === "development"
});

const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api").replace(/\/api\/?$/, "") || "http://localhost:5000";

module.exports = withPWA({
  reactStrictMode: true,
  async rewrites() {
    return [
      { source: "/api-uploads/:path*", destination: `${apiBase}/uploads/:path*` }
    ];
  }
});
