import { PrismaService } from '../prisma/prisma.service';
import { Logger } from '@nestjs/common';

const logger = new Logger('WorkspacesSeed');

export const DEFAULT_WORKSPACES = [
  {
    title: 'Личное',
    slug: 'personal',
    icon: 'user',
    color: '#3b82f6',
    description: 'Личные заметки, здоровье, планы, идеи и саморазвитие',
    isDefault: true,
    order: 0,
    tracks: [
      { title: 'Здоровье и спорт', color: '#10b981', icon: 'heart', order: 0 },
      { title: 'Идеи и проекты', color: '#6366f1', icon: 'lightbulb', order: 1 },
    ],
  },
  {
    title: 'Творчество',
    slug: 'creative',
    icon: 'palette',
    color: '#8b5cf6',
    description: 'Творческие публикации, книги, статьи, сценарии и медиа',
    isDefault: false,
    order: 1,
    tracks: [
      { title: 'Книга: Черновики', color: '#ec4899', icon: 'book-open', order: 0 },
      { title: 'Публикации в блог', color: '#8b5cf6', icon: 'feather', order: 1 },
    ],
  },
  {
    title: 'Аналитика',
    slug: 'analytics',
    icon: 'trending-up',
    color: '#f59e0b',
    description: 'Анализ событий, геополитика, технологические тренды и рынки',
    isDefault: false,
    order: 2,
    tracks: [
      { title: 'Выборы и геополитика', color: '#ef4444', icon: 'globe', order: 0 },
      { title: 'Технологические тренды', color: '#06b6d4', icon: 'cpu', order: 1 },
    ],
  },
];

export async function seedDefaultWorkspacesIfEmpty(prisma: PrismaService): Promise<void> {
  const count = await prisma.workspace.count();
  if (count > 0) return;

  logger.log('Seeding initial default workspaces (Личное, Творчество, Аналитика)...');

  for (const w of DEFAULT_WORKSPACES) {
    const { tracks, ...workspaceData } = w;
    const created = await prisma.workspace.create({
      data: workspaceData,
    });

    for (const t of tracks) {
      await prisma.workspaceTrack.create({
        data: {
          ...t,
          workspaceId: created.id,
        },
      });
    }
  }

  logger.log('Default workspaces seeded successfully.');
}
