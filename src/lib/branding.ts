import { api } from './api/client';

export function normalizedProjectName(value: unknown): string {
  if (typeof value !== 'string') return 'SymSvel';
  const name = value.trim();
  const hasControls = [...name].some((character) => {
    const point = character.codePointAt(0);
    return point !== undefined && (point < 32 || point === 127);
  });
  return name && [...name].length <= 120 && !hasControls ? name : 'SymSvel';
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
