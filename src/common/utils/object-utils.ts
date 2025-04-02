/**
 * Reverses the keys and values of a record.
 * @param record - The record to reverse
 * @returns A new record with keys and values swapped
 *
 * @example
 * const original = { a: 'x', b: 'y' };
 * const reversed = reverseRecord(original); // { x: 'a', y: 'b' }
 */
export function reverseRecord<
  K extends string | number | symbol,
  V extends string | number | symbol,
>(record: Record<K, V>): Record<V, K> {
  return Object.fromEntries(Object.entries(record).map(([key, value]) => [value, key])) as Record<
    V,
    K
  >;
}
