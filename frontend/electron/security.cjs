const path = require("node:path");

const ALLOWED_EXTENSION_PERMISSIONS = new Set([
  "files:read",
  "files:write",
  "commands:run",
  "network:https",
  "models:invoke",
  "ui:panel",
  "ui:theme",
  "prompts:contribute",
]);

function isSafeExternalUrl(url, allowHttp = false) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "https:" || (allowHttp && parsed.protocol === "http:");
  } catch {
    return false;
  }
}

function isPathInside(root, candidate) {
  const relative = path.relative(path.resolve(root), path.resolve(candidate));
  return relative === "" || (!relative.startsWith("..") && !path.isAbsolute(relative));
}

const ALLOWED_API_RESOURCES = new Set([
  "health",
  "investigations",
  "sources",
  "evidence",
  "entities",
  "relationships",
]);

function validateApiRequest(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("API request is invalid.");
  const method = typeof input.method === "string" ? input.method.toUpperCase() : "GET";
  if (!["GET", "POST", "PATCH"].includes(method)) throw new Error("API method is not allowed.");
  if (typeof input.path !== "string" || input.path.length > 500) throw new Error("API path is invalid.");
  const parsed = new URL(input.path, "http://atlas.local");
  if (parsed.origin !== "http://atlas.local" || !parsed.pathname.startsWith("/api/v1/")) {
    throw new Error("API path is outside the Atlas API.");
  }
  const segments = parsed.pathname.slice("/api/v1/".length).split("/").filter(Boolean);
  if (!segments.length || !ALLOWED_API_RESOURCES.has(segments[0]) || segments.length > 2) {
    throw new Error("API resource is not allowed.");
  }
  if (segments.length === 2 && !/^(?:live|ready|summary|[a-f0-9-]{36})$/i.test(segments[1])) {
    throw new Error("API record identifier is invalid.");
  }
  for (const key of parsed.searchParams.keys()) {
    if (!["investigation_id", "limit", "offset"].includes(key)) throw new Error("API query parameter is not allowed.");
  }
  const body = input.body === undefined ? null : input.body;
  if (body !== null && (typeof body !== "object" || Array.isArray(body))) throw new Error("API body is invalid.");
  if (body !== null && Buffer.byteLength(JSON.stringify(body), "utf8") > 256 * 1024) throw new Error("API body is too large.");
  return { path: `${parsed.pathname}${parsed.search}`, method, body };
}

function sanitizeExtensionManifest(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Manifest must be a JSON object.");
  const required = ["id", "name", "version", "description", "author"];
  for (const key of required) {
    if (typeof value[key] !== "string" || !value[key].trim() || value[key].length > 200) {
      throw new Error(`Manifest field '${key}' is invalid.`);
    }
  }
  if (!/^[a-z0-9][a-z0-9.-]{2,99}$/.test(value.id)) throw new Error("Manifest id must use lowercase letters, digits, dots, or hyphens.");
  if (!/^\d+\.\d+\.\d+(?:-[a-z0-9.-]+)?$/.test(value.version)) throw new Error("Manifest version must use semantic version format.");
  const permissions = Array.isArray(value.permissions)
    ? value.permissions.filter((item) => typeof item === "string" && item.length <= 80).slice(0, 30)
    : [];
  const unknownPermission = permissions.find((permission) => !ALLOWED_EXTENSION_PERMISSIONS.has(permission));
  if (unknownPermission) throw new Error(`Unknown extension permission '${unknownPermission}'.`);
  return {
    schemaVersion: 1,
    id: value.id,
    name: value.name.trim(),
    version: value.version,
    description: value.description.trim(),
    author: value.author.trim(),
    permissions,
  };
}

module.exports = { isPathInside, isSafeExternalUrl, sanitizeExtensionManifest, validateApiRequest };
