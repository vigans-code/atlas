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

module.exports = { isPathInside, isSafeExternalUrl, sanitizeExtensionManifest };
