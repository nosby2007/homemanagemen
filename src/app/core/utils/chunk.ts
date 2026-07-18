export function chunkArray<T>(items: T[], chunkSize = 10): T[][] {
  if (!Array.isArray(items) || !items.length) return [];
  const size = Number.isFinite(chunkSize) && chunkSize > 0 ? Math.floor(chunkSize) : 10;
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}
