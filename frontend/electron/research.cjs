const dns = require("node:dns").promises;
const https = require("node:https");
const net = require("node:net");

const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
const MAX_CONTENT_CHARACTERS = 60_000;
const ALLOWED_CONTENT_TYPES = ["text/html", "text/plain", "application/json", "application/xml", "text/xml"];

function validateResearchUrl(value) {
  if (typeof value !== "string" || !value.trim() || value.length > 2_048) throw new Error("Enter a valid source URL.");
  let parsed;
  try {
    parsed = new URL(value.trim());
  } catch {
    throw new Error("Enter a valid source URL.");
  }
  if (parsed.protocol !== "https:") throw new Error("Research sources must use HTTPS.");
  if (parsed.username || parsed.password) throw new Error("Source URLs cannot contain credentials.");
  if (parsed.port && parsed.port !== "443") throw new Error("Research sources must use the standard HTTPS port.");
  const hostname = parsed.hostname.toLowerCase().replace(/\.$/, "");
  if (!hostname || net.isIP(hostname)) throw new Error("Source URLs must use a public hostname, not an IP address.");
  if (hostname === "localhost" || hostname.endsWith(".localhost") || hostname.endsWith(".local") || hostname.endsWith(".internal")) {
    throw new Error("Local network addresses cannot be used as research sources.");
  }
  parsed.hostname = hostname;
  parsed.hash = "";
  return parsed;
}

function isPublicAddress(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split(".").map(Number);
    return !(
      a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && (b === 0 || b === 168)) ||
      (a === 198 && (b === 18 || b === 19 || b === 51)) ||
      (a === 203 && b === 0)
    );
  }
  if (version === 6) {
    const normalized = address.toLowerCase().split("%")[0];
    if (normalized === "::" || normalized === "::1") return false;
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return false;
    if (/^fe[89ab]/.test(normalized)) return false;
    if (normalized.startsWith("2001:db8:")) return false;
    if (normalized.startsWith("::ffff:")) return isPublicAddress(normalized.slice(7));
    return true;
  }
  return false;
}

async function resolvePublicHost(hostname) {
  let addresses;
  try {
    addresses = await dns.lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("The source hostname could not be resolved.");
  }
  if (!addresses.length || addresses.some((entry) => !isPublicAddress(entry.address))) {
    throw new Error("The source resolved to a private or restricted network address.");
  }
  return addresses[0];
}

async function fetchResearchSource(value, redirectCount = 0) {
  if (redirectCount > 3) throw new Error("The source redirected too many times.");
  const parsed = validateResearchUrl(value);
  const resolved = await resolvePublicHost(parsed.hostname);
  const response = await requestPinned(parsed, resolved);

  if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
    const redirected = new URL(response.headers.location, parsed).toString();
    return fetchResearchSource(redirected, redirectCount + 1);
  }
  if (response.statusCode < 200 || response.statusCode >= 300) throw new Error(`The source returned HTTP ${response.statusCode}.`);

  const contentType = String(response.headers["content-type"] || "").split(";", 1)[0].trim().toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) throw new Error("The source is not a supported text or HTML page.");
  const raw = response.body.toString("utf8");
  const title = contentType === "text/html" ? extractTitle(raw) : parsed.hostname;
  const content = contentType === "text/html" ? htmlToText(raw) : normalizeText(raw);
  if (!content) throw new Error("The source did not contain readable text.");

  return {
    title: title || parsed.hostname,
    url: parsed.toString(),
    hostname: parsed.hostname,
    content: content.slice(0, MAX_CONTENT_CHARACTERS),
    contentType,
    fetchedAt: new Date().toISOString(),
    bytes: response.body.length,
    truncated: content.length > MAX_CONTENT_CHARACTERS,
  };
}

function requestPinned(parsed, resolved) {
  return new Promise((resolve, reject) => {
    const request = https.request({
      protocol: "https:",
      hostname: parsed.hostname,
      port: 443,
      path: `${parsed.pathname}${parsed.search}`,
      method: "GET",
      servername: parsed.hostname,
      headers: {
        Accept: "text/html, text/plain, application/json, application/xml;q=0.9",
        "Accept-Encoding": "identity",
        "User-Agent": "Atlas-Research/0.1 (+local research workspace)",
      },
      lookup: (_hostname, options, callback) => {
        if (options?.all) callback(null, [resolved]);
        else callback(null, resolved.address, resolved.family);
      },
      timeout: 20_000,
    }, (response) => {
      const length = Number(response.headers["content-length"] || 0);
      if (length > MAX_RESPONSE_BYTES) {
        response.destroy();
        reject(new Error("The source exceeds the 2 MB download limit."));
        return;
      }
      const chunks = [];
      let bytes = 0;
      response.on("data", (chunk) => {
        bytes += chunk.length;
        if (bytes > MAX_RESPONSE_BYTES) {
          response.destroy(new Error("The source exceeds the 2 MB download limit."));
          return;
        }
        chunks.push(chunk);
      });
      response.on("end", () => resolve({ statusCode: response.statusCode || 0, headers: response.headers, body: Buffer.concat(chunks) }));
      response.on("error", reject);
    });
    request.on("timeout", () => request.destroy(new Error("The source request timed out.")));
    request.on("error", (error) => reject(new Error(error.message || "The source could not be downloaded.")));
    request.end();
  });
}

function extractTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return match ? decodeEntities(match[1]).replace(/\s+/g, " ").trim().slice(0, 240) : "";
}

function htmlToText(html) {
  return normalizeText(decodeEntities(html
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<(script|style|noscript|svg|canvas|template)[^>]*>[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/li|\/section|\/article|\/h[1-6]|\/tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ")));
}

function normalizeText(value) {
  return value
    .replace(/\r/g, "")
    .replace(/[\t ]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function decodeEntities(value) {
  const named = { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " " };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (_match, entity) => {
    if (entity[0] === "#") {
      const numeric = entity[1].toLowerCase() === "x" ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10);
      return Number.isFinite(numeric) ? String.fromCodePoint(numeric) : " ";
    }
    return named[entity.toLowerCase()] || " ";
  });
}

module.exports = { fetchResearchSource, htmlToText, isPublicAddress, validateResearchUrl };
