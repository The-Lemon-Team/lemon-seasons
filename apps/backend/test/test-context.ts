import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

export interface TestContext {
  app: INestApplication;
  module: TestingModule;
  prisma: PrismaService;
  req: request.SuperTest<request.Test>;
}

export async function createTestApp(): Promise<TestContext> {
  const module = await Test.createTestingModule({
    imports: [AppModule],
  }).compile();

  const app = module.createNestApplication();

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: false,
    }),
  );

  await app.init();

  const prisma = app.get(PrismaService);
  const req = request(app.getHttpServer());

  return { app, module, prisma, req };
}

export async function cleanDatabase(prisma: PrismaService): Promise<void> {
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      "NoteLink",
      "NoteImage",
      "NoteAttachment",
      "NoteFolder",
      "_HashtagToNote",
      "_NoteToTaxonomyNode",
      "WorkspacePin",
      "NoteVersion",
      "Note",
      "Feed",
      "Folder",
      "Hashtag",
      "UserKey",
      "User"
    CASCADE;
  `);
}

export const ADMIN_AUTH_HEADER = {
  'x-admin-token': 'lenta_adm_master_permanent_7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c',
};
