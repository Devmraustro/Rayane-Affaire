/**
 * URL slug generation that keeps Arabic titles readable.
 *
 * Arabic characters are preserved (percent-encoded by the browser) because a
 * transliterated slug would be meaningless to an Arabic-speaking user; French
 * accents are folded so `/biens/appartement-f3-bejaia` stays clean.
 */
export function slugify(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[’'"]/g, '-')
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-')
    .slice(0, 80);
}

/** Appends `-2`, `-3`, … until `isTaken` returns false. */
export function uniqueSlug(base: string, isTaken: (candidate: string) => boolean): string {
  const root = slugify(base) || 'annonce';
  if (!isTaken(root)) return root;
  let i = 2;
  while (isTaken(`${root}-${i}`) && i < 10_000) i += 1;
  return `${root}-${i}`;
}
