import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  // Mematikan di dev supaya tidak ribut dengan HMR; aktif otomatis saat `next build && next start`.
  disable: process.env.NODE_ENV === "development",
});

const nextConfig = {
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: { "/api/export": ["./node_modules/pdfkit/js/data/**/*"] },

  // --- Keamanan ---
  poweredByHeader: false,            // sembunyikan "X-Powered-By: Next.js"
  productionBrowserSourceMaps: false, // jangan bocorkan source code ke browser
  reactStrictMode: true,
  experimental: {
    serverActions: { bodySizeLimit: "1mb" }, // batasi payload server action (upload nota lewat /api, bukan action)
  },
  async headers() {
    return [
      {
        // sw.js dikecualikan dari middleware (harus bisa diambil tanpa sesi), jadi header dipasang di sini.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" }, // update SW selalu terambil
          { key: "Content-Security-Policy", value: "default-src 'self'; script-src 'self'" },
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default withSerwist(nextConfig);
