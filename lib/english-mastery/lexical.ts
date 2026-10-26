// Locate a complete English word/phrase, never a substring such as member in remembers.
export function lexicalIndex(text: string, term: string): number {
  const normalise = (value: string) => value.toLowerCase().replace(/[’‘]/g, "'");
  const input = normalise(text), needle = normalise(term);
  if (!needle) return -1;
  let at = input.indexOf(needle);
  while (at >= 0) {
    if (!/[a-z0-9]/.test(input[at - 1] || '') &&
        !/[a-z0-9]/.test(input[at + needle.length] || '')) return at;
    at = input.indexOf(needle, at + 1);
  }
  return -1;
}
