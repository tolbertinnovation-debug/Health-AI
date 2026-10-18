// Data minimisation: strip direct identifiers from free text before it is sent to an
// external AI provider. Clinical content is kept; contact details and IDs are not.

const RULES = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[email]'],
  [/\+?\d[\d\s().-]{7,}\d/g, '[number]'],
  [/\b\d{6,}\b/g, '[id]'],
  [/\b(my name is|i am called|i'm called|me llamo|mi nombre es|je m'appelle|mon nom est|jina langu ni|naitwa)\s+([^\s,.;!?]+(\s+[A-Z][^\s,.;!?]*)?)/gi, '$1 [name]'],
];

export function redact(text) {
  let out = String(text ?? '');
  for (const [pattern, replacement] of RULES) out = out.replace(pattern, replacement);
  return out;
}
