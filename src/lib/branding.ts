import { api } from './api/client';

export function normalizedProjectName(value: unknown): string {
  if (typeof value !== 'string') return 'SymSvel';
  const name = value.trim();
  return name && [...name].length <= 120 && !/[\x00-\x1f\x7f]/.test(name)
    ? name : 'SymSvel';
}

/** Only the display title is public; the private Setup state remains on the server. */
export async function publicProjectName(): Promise<string> {
  try {
    const project = await api<{ data: { name: unknown } }>('/apiopen/project', {
      public: true, skipLocales: true
    });
    return normalizedProjectName(project?.data?.name);
  } catch {
    return 'SymSvel';
  }
}
