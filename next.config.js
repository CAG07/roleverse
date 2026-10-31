/** @type {import('next').NextConfig} */
const nextConfig = {
  // Native PDF page rendering for module map reading (lib/rag/pdf-pages.ts).
  // Bundling can't place its prebuilt .node binary, so load it with Node's require.
  serverExternalPackages: ['@napi-rs/canvas'],
};

module.exports = nextConfig;
