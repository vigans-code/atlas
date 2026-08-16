const assert = require("node:assert/strict");
const path = require("node:path");
const test = require("node:test");

const { isPathInside, isSafeExternalUrl, sanitizeExtensionManifest, validateApiRequest } = require("./security.cjs");

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

test("allows only bounded Atlas API requests", () => {
  assert.deepEqual(
    validateApiRequest({ path: "/api/v1/evidence?investigation_id=4d25e890-9bf0-4402-8c95-94746a96c67e", method: "GET" }),
    { path: "/api/v1/evidence?investigation_id=4d25e890-9bf0-4402-8c95-94746a96c67e", method: "GET", body: null },
  );
  assert.throws(() => validateApiRequest({ path: "http://evil.example/api/v1/evidence", method: "GET" }));
  assert.throws(() => validateApiRequest({ path: "/api/v1/admin/secrets", method: "GET" }));
  assert.throws(() => validateApiRequest({ path: "/api/v1/evidence", method: "DELETE" }));
});
