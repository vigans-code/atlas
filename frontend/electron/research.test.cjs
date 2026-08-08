const assert = require("node:assert/strict");
const test = require("node:test");

const { htmlToText, isPublicAddress, validateResearchUrl } = require("./research.cjs");

test("accepts public HTTPS research URLs and rejects unsafe targets", () => {
  assert.equal(validateResearchUrl("https://owasp.org/www-project-top-ten/#top10").protocol, "https:");
  assert.throws(() => validateResearchUrl("http://example.com"));
  assert.throws(() => validateResearchUrl("https://localhost/admin"));
  assert.throws(() => validateResearchUrl("https://127.0.0.1/admin"));
  assert.throws(() => validateResearchUrl("https://user:pass@example.com"));
});

test("blocks private and reserved network addresses", () => {
  for (const address of ["127.0.0.1", "10.0.0.1", "172.16.2.3", "192.168.1.1", "169.254.1.1", "::1", "fd00::1", "2001:db8::1"]) {
    assert.equal(isPublicAddress(address), false, address);
  }
  assert.equal(isPublicAddress("1.1.1.1"), true);
  assert.equal(isPublicAddress("2606:4700:4700::1111"), true);
});

test("extracts readable text without scripts", () => {
  const text = htmlToText("<html><script>alert(1)</script><h1>Atlas &amp; Research</h1><p>Trusted source.</p></html>");
  assert.equal(text, "Atlas & Research\nTrusted source.");
});
