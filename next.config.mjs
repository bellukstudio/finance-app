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
};

export default withSerwist(nextConfig);
