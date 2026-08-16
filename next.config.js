/** @type {import('next').NextConfig} */
const nextConfig = {
  // @napi-rs/canvas ships a native binding loaded via a generated
  // js-binding.js — Turbopack can't statically bundle that file ("asset is
  // not placeable in ESM chunks"). Marking it external leaves it to Node's
  // normal require() resolution at runtime instead, which handles native
  // .node addons fine. Only needed where lib/images/pdf-cover-image.ts is
  // imported (the cover-from-pdf route).
  serverExternalPackages: ['@napi-rs/canvas'],
};

module.exports = nextConfig;
