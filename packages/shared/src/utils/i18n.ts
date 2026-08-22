/**
 * Pluralization helper for Russian numeric declensions.
 * Examples:
 *   pluralizeRu(1, 'запись', 'записи', 'записей') => "1 запись"
 *   pluralizeRu(3, 'запись', 'записи', 'записей') => "3 записи"
 *   pluralizeRu(5, 'запись', 'записи', 'записей') => "5 записей"
 */
export function pluralizeRu(count: number, one: string, few: string, many: string): string {
  const abs = Math.abs(count);
  const mod10 = abs % 10;
  const mod100 = abs % 100;

  if (mod100 >= 11 && mod100 <= 19) {
    return `${count} ${many}`;
  }
  if (mod10 === 1) {
    return `${count} ${one}`;
  }
  if (mod10 >= 2 && mod10 <= 4) {
    return `${count} ${few}`;
  }
  return `${count} ${many}`;
}

export function pluralizeEn(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
