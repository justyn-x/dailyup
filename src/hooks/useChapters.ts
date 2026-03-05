import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';

export function useChapters(projectId: string | undefined) {
  return useLiveQuery(
    () =>
      projectId
        ? db.chapters.where('projectId').equals(projectId).sortBy('orderIndex')
        : [],
    [projectId],
  );
}

export function useChapter(id: string | undefined) {
  return useLiveQuery(
    () => (id ? db.chapters.get(id) : undefined),
    [id],
  );
}
