// Tiny HTML-escape helper for Telegram's parse_mode="HTML".
// Must run before any text that can contain raw & < > (URLs, LLM output).

export function escapeHtml(value) {
  const s = String(value ?? "");
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}