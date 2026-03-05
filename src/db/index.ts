import Dexie, { type EntityTable } from 'dexie';
import type { Project, Chapter } from '../types';

const db = new Dexie('DailyUpDB') as Dexie & {
  projects: EntityTable<Project, 'id'>;
  chapters: EntityTable<Chapter, 'id'>;
};

db.version(1).stores({
  projects: 'id, createdAt',
  chapters: 'id, projectId, [projectId+orderIndex], status',
});

export { db };
