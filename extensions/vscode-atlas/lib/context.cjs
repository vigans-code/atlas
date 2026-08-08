function buildEditorPrompt({ instruction, code, language, fileName, truncated = false }) {
  const safeInstruction = String(instruction || "Help me with this code.").trim().slice(0, 4_000);
  const safeCode = String(code || "").slice(0, 32_000);
  const safeLanguage = String(language || "text").replace(/[^a-zA-Z0-9_+.#-]/g, "").slice(0, 40) || "text";
  const safeFileName = String(fileName || "current file").replace(/[\r\n]/g, " ").slice(0, 500);
  return [
    safeInstruction,
    "",
    `Editor context (${safeFileName}, language: ${safeLanguage}${truncated ? ", truncated to 32,000 characters" : ""}):`,
    `\`\`\`${safeLanguage}`,
    safeCode,
    "```",
  ].join("\n");
}

function extractFirstCodeBlock(value) {
  const text = String(value || "");
  const match = text.match(/```[^\n]*\n([\s\S]*?)```/);
  return (match?.[1] || text).trim();
}

module.exports = { buildEditorPrompt, extractFirstCodeBlock };
