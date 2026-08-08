const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { isPathInside, isSafeExternalUrl, sanitizeExtensionManifest } = require("./security.cjs");

const validManifest = {
  schemaVersion: 1,
  id: "com.example.safe-extension",
  name: "Safe extension",
  version: "1.2.3",
  description: "A test manifest.",
  author: "Atlas tests",
  permissions: ["files:read", "ui:panel"],
};

test("sanitizes a valid extension manifest", () => {
  assert.deepEqual(sanitizeExtensionManifest(validManifest), validManifest);
});

test("rejects invalid identifiers, versions, and permissions", () => {
  assert.throws(() => sanitizeExtensionManifest({ ...validManifest, id: "Unsafe ID" }));
  assert.throws(() => sanitizeExtensionManifest({ ...validManifest, version: "latest" }));
  assert.throws(() => sanitizeExtensionManifest({ ...validManifest, permissions: ["system:admin"] }));
});

test("allows HTTPS externally and HTTP only for development", () => {
  assert.equal(isSafeExternalUrl("https://example.com"), true);
  assert.equal(isSafeExternalUrl("http://example.com"), false);
  assert.equal(isSafeExternalUrl("http://127.0.0.1:5173", true), true);
  assert.equal(isSafeExternalUrl("javascript:alert(1)"), false);
  assert.equal(isSafeExternalUrl("file:///etc/passwd"), false);
});

test("contains packaged file access within the renderer directory", () => {
  const root = path.resolve("dist");
  assert.equal(isPathInside(root, path.join(root, "index.html")), true);
  assert.equal(isPathInside(root, path.resolve(root, "..", "package.json")), false);
});
