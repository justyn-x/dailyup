export function generateId(): string {
  return crypto.randomUUID();
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

export function calculateProgress(
  total: number,
  completed: number,
): number {
  if (total === 0) return 0;
  return Math.round((completed / total) * 100);
}
