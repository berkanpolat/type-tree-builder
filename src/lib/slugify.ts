/**
 * Turkish-aware slugify function matching the DB slugify_tr() function.
 */
export function slugifyTr(input: string): string {
  let result = input;
  // Handle Turkish uppercase first
  result = result.replace(/İ/g, 'i');
  result = result.replace(/Ğ/g, 'g');
  result = result.replace(/Ü/g, 'u');
  result = result.replace(/Ş/g, 's');
  result = result.replace(/Ö/g, 'o');
  result = result.replace(/Ç/g, 'c');
  result = result.toLowerCase();
  result = result.replace(/ı/g, 'i');
  result = result.replace(/ğ/g, 'g');
  result = result.replace(/ü/g, 'u');
  result = result.replace(/ş/g, 's');
  result = result.replace(/ö/g, 'o');
  result = result.replace(/ç/g, 'c');
  // Replace non-alphanumeric with hyphens
  result = result.replace(/[^a-z0-9-]/g, '-');
  // Collapse multiple hyphens
  result = result.replace(/-+/g, '-');
  // Trim hyphens
  result = result.replace(/^-+|-+$/g, '');
  return result;
}
