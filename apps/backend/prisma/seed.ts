import { PrismaClient, NoteType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Project Lenta database seed with Multi-Folder support...');

  // Clean existing data
  await prisma.noteFolder.deleteMany();
  await prisma.folder.deleteMany();
  await prisma.noteLink.deleteMany();
  await prisma.noteImage.deleteMany();
  await prisma.note.deleteMany();
  await prisma.hashtag.deleteMany();
  await prisma.taxonomyNode.deleteMany();
  await prisma.feed.deleteMany();

  // 1. Create Feeds
  const feedMcu = await prisma.feed.create({
    data: {
      title: 'Marvel Cinematic Universe',
      description: 'Tracking film releases, character arcs, and multiverse phases.',
      slug: 'mcu-radar',
    },
  });

  const feedTech = await prisma.feed.create({
    data: {
      title: 'Technical Architecture & Strategy',
      description: 'System designs, RFCs, and engineering roadmap milestones.',
      slug: 'tech-strategy',
    },
  });

  const feedProduct = await prisma.feed.create({
    data: {
      title: 'Product Milestones',
      description: 'Tracking quarterly product goals and user experience initiatives.',
      slug: 'product-milestones',
    },
  });

  const feedDesign = await prisma.feed.create({
    data: {
      title: 'Design Systems & UI',
      description: 'Lenta admin design tokens, component libraries, and style updates.',
      slug: 'design-systems',
    },
  });

  const feedDevOps = await prisma.feed.create({
    data: {
      title: 'DevOps & Infrastructure',
      description: 'Cloud deployments, database migrations, and uptime operations.',
      slug: 'devops-infra',
    },
  });

  console.log('✅ Created 5 Feeds');

  // 2. Create Folders (Obsidian physical hierarchy)
  const foldersData = [
    { name: 'News', path: 'News', icon: 'newspaper' },
    { name: 'Marvel', path: 'News/Marvel', icon: 'auto_awesome' },
    { name: 'Cinema', path: 'News/Cinema', icon: 'movie' },
    { name: 'Engineering', path: 'Engineering', icon: 'terminal' },
    { name: 'Architecture', path: 'Engineering/Architecture', icon: 'architecture' },
    { name: 'Backend', path: 'Engineering/Backend', icon: 'dns' },
    { name: 'Design', path: 'Design', icon: 'palette' },
    { name: 'Tokens', path: 'Design/Tokens', icon: 'palette' },
    { name: 'Operations', path: 'Operations', icon: 'cloud' },
    { name: 'Infrastructure', path: 'Operations/Infrastructure', icon: 'dns' },
    { name: 'Strategy', path: 'Strategy', icon: 'timeline' },
    { name: 'Planning', path: 'Strategy/Planning', icon: 'timeline' },
    { name: 'Product', path: 'Product', icon: 'brush' },
    { name: 'UX', path: 'Product/UX', icon: 'group' },
    { name: 'Projects', path: 'Projects', icon: 'folder_special' },
    { name: 'Lenta', path: 'Projects/Lenta', icon: 'rocket_launch' },
  ];

  const folderMap = new Map<string, string>();
  for (const item of foldersData) {
    const createdFolder = await prisma.folder.create({
      data: item,
    });
    folderMap.set(item.path, createdFolder.id);
  }

  console.log(`✅ Created ${foldersData.length} Obsidian Folders`);

  // 3. Create Taxonomy Hierarchy (Ltree format)
  const taxonomyData = [
    { name: 'Movies', path: 'movies', icon: 'movie' },
    { name: 'Marvel', path: 'movies.marvel', icon: 'auto_awesome' },
    { name: 'Avengers', path: 'movies.marvel.avengers', icon: 'shield' },
    { name: 'Technology', path: 'technology', icon: 'memory' },
    { name: 'Frontend', path: 'technology.frontend', icon: 'web' },
    { name: 'React', path: 'technology.frontend.react', icon: 'code_blocks' },
    { name: 'Backend', path: 'technology.backend', icon: 'terminal' },
    { name: 'NestJS', path: 'technology.backend.nestjs', icon: 'dns' },
    { name: 'Architecture', path: 'engineering.architecture', icon: 'architecture' },
    { name: 'Backend Eng', path: 'engineering.backend', icon: 'settings_system_daydream' },
    { name: 'UX & Product', path: 'product.ux', icon: 'brush' },
    { name: 'Planning', path: 'strategy.planning', icon: 'timeline' },
    { name: 'Infrastructure', path: 'devops.infrastructure', icon: 'cloud' },
    { name: 'Design Tokens', path: 'design.tokens', icon: 'palette' },
  ];

  const taxonomyMap = new Map<string, string>();
  for (const item of taxonomyData) {
    const node = await prisma.taxonomyNode.create({
      data: item,
    });
    taxonomyMap.set(item.path, node.id);
  }

  console.log(`✅ Created ${taxonomyData.length} Taxonomy Nodes`);

  // 4. Create Chronological Notes with Raw Markdown & Multi-Folder associations
  const notesData = [
    {
      feedId: feedMcu.id,
      title: 'Marvel Cinematic Universe Phase 5 Overview',
      type: NoteType.SINGLE,
      startDate: new Date('2023-10-24T14:30:00.000Z'),
      sourceLink: 'https://marvel.com/movies/phase-5',
      icon: 'movie',
      tags: ['movies.marvel.avengers', 'movies.marvel'],
      folders: [
        { path: 'News/Marvel', isPrimary: true },
        { path: 'News/Cinema', isPrimary: false },
      ],
      description: `### Multiverse Saga Continuation
The upcoming phase includes several highly anticipated releases, continuing the Multiverse Saga.

**Key Focus Areas:**
- Integrating new character arcs alongside established ones.
- Establishing the overarching threat of Kang across multiple timelines.
- Grounded street-level stories balancing cosmic events.

> Production schedules remain fluid pending writing room adjustments.`,
    },
    {
      feedId: feedTech.id,
      title: 'Q4 Content Strategy Review',
      type: NoteType.PERIOD,
      startDate: new Date('2023-11-01T00:00:00.000Z'),
      endDate: new Date('2023-11-30T23:59:59.000Z'),
      sourceLink: 'https://notion.so/strategy/q4-content',
      icon: 'trending_up',
      tags: ['strategy.planning'],
      folders: [
        { path: 'Strategy/Planning', isPrimary: true },
        { path: 'Projects/Lenta', isPrimary: false },
      ],
      description: `### Strategy Review & Goals
Evaluating the performance metrics for Q3 and aligning editorial calendars for the upcoming holiday push.

1. **Taxonomy Alignment:** Ensure taxonomy tags are strictly adhered to for cross-referencing across Obsidian and Admin CMS.
2. **Performance Metrics:** Review read times, syndication reach, and sync latency.
3. **Draft Approvals:** Complete review by November 15.`,
    },
    {
      feedId: feedDesign.id,
      title: 'Design System V2 Tokens',
      type: NoteType.SINGLE,
      startDate: new Date('2023-10-24T12:00:00.000Z'),
      icon: 'palette',
      tags: ['design.tokens'],
      folders: [
        { path: 'Design/Tokens', isPrimary: true },
        { path: 'Projects/Lenta', isPrimary: false },
      ],
      description: `### New Palette Configuration
Drafting the new JSON structure for the theme configuration:

\`\`\`json
{
  "colors": {
    "primary": "#c9cd58",
    "surface": "#121414",
    "secondary": "#c9c8a5",
    "tertiary": "#a4d0bf"
  },
  "fonts": {
    "ui": "Inter",
    "metadata": "JetBrains Mono"
  }
}
\`\`\`

All components now adhere to the 4px base unit grid and Level 1/Level 2 elevation borders.`,
    },
    {
      feedId: feedDevOps.id,
      title: 'Server Migration Checklist',
      type: NoteType.SINGLE,
      startDate: new Date('2023-10-23T09:15:00.000Z'),
      icon: 'dns',
      tags: ['devops.infrastructure'],
      folders: [
        { path: 'Operations/Infrastructure', isPrimary: true },
      ],
      description: `### Infrastructure Step-by-Step
- [x] Backup current PostgreSQL database
- [x] Provision new containerized instances with Docker Compose
- [ ] Enable PostgreSQL \`ltree\` extension for hierarchical taxonomy
- [ ] Update DNS records with TTL 300
- [ ] Verify healthcheck endpoints across all microservices`,
    },
    {
      feedId: feedTech.id,
      title: 'Q3 Technical Architecture Review',
      type: NoteType.EVENT,
      startDate: new Date('2023-10-24T10:00:00.000Z'),
      endDate: new Date('2023-10-24T11:30:00.000Z'),
      icon: 'architecture',
      tags: ['engineering.architecture'],
      folders: [
        { path: 'Engineering/Architecture', isPrimary: true },
        { path: 'Projects/Lenta', isPrimary: false },
      ],
      description: `### Architectural Decisions (ADRs)
Completed evaluation of headless data store sync patterns:
- Selected **Soft Deletes** with \`updatedAt\` indexing for offline-first Obsidian clients.
- Adopted PostgreSQL native \`ltree\` for lightning-fast hierarchical queries (\`<@\`, \`@>\`).
- Decoupled admin UI using TanStack Query caching and Ant Design tokens.`,
    },
    {
      feedId: feedProduct.id,
      title: 'User Onboarding Flow V2',
      type: NoteType.MENTION,
      startDate: new Date('2023-10-22T15:00:00.000Z'),
      icon: 'group',
      tags: ['product.ux'],
      folders: [
        { path: 'Product/UX', isPrimary: true },
      ],
      description: `### Feedback Summary
Initial feedback on the 3-step onboarding wizard:
- Completion rate increased by **24%**.
- Drop-off occurs predominantly on workspace team invites.
- Recommendation: Make team invite optional during initial setup.`,
    },
    {
      feedId: feedMcu.id,
      title: 'Avengers: Secret Wars Release Event',
      type: NoteType.FILM_RELEASE,
      startDate: new Date('2027-05-07T00:00:00.000Z'),
      icon: 'local_movies',
      tags: ['movies.marvel.avengers'],
      folders: [
        { path: 'News/Marvel', isPrimary: true },
        { path: 'News/Cinema', isPrimary: false },
      ],
      description: `### Culmination of the Multiverse Saga
The climax of Phase 6 bringing together heroes across multiple alternate realities and universes.

**Confirmed Timeline:** Summer 2027 Theatrical Release.`,
    },
    {
      feedId: feedTech.id,
      title: 'Prisma & PostgreSQL Ltree Setup Completed',
      type: NoteType.DONE,
      startDate: new Date('2026-08-20T16:00:00.000Z'),
      icon: 'check_circle',
      tags: ['technology.backend.nestjs'],
      folders: [
        { path: 'Engineering/Backend', isPrimary: true },
        { path: 'Projects/Lenta', isPrimary: false },
      ],
      description: `### Milestone Achieved
Successfully implemented:
- Nest.js backend RESTful endpoints for Feeds, Notes, Taxonomy, and Sync.
- Soft deletion middleware and delta sync support.
- Materialized path tree builder with fast Ltree indexing.`,
    },
  ];

  for (const note of notesData) {
    const tagIds = note.tags
      .map((path) => taxonomyMap.get(path))
      .filter((id): id is string => Boolean(id));

    const noteFoldersToCreate = note.folders
      .map((f, idx) => {
        const folderId = folderMap.get(f.path);
        if (!folderId) return null;
        return {
          folderId,
          isPrimary: f.isPrimary ?? idx === 0,
          order: idx,
        };
      })
      .filter((item): item is { folderId: string; isPrimary: boolean; order: number } => Boolean(item));

    await prisma.note.create({
      data: {
        feedId: note.feedId,
        title: note.title,
        description: note.description,
        type: note.type,
        startDate: note.startDate,
        endDate: note.endDate,
        sourceLink: note.sourceLink,
        icon: note.icon,
        tags: {
          connect: tagIds.map((id) => ({ id })),
        },
        folders: noteFoldersToCreate.length > 0
          ? {
              create: noteFoldersToCreate,
            }
          : undefined,
        links: note.sourceLink
          ? {
              create: [
                {
                  url: note.sourceLink,
                  title: 'Primary Source',
                  isSource: true,
                  order: 0,
                },
              ],
            }
          : undefined,
      },
    });
  }

  console.log(`✅ Created ${notesData.length} Notes with Multi-Folder mapping, NoteTypes, and Markdown`);
  console.log('🎉 Seed completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
