import { describe, it, expect } from 'vitest';
import {
  getCuratorPersona,
  CURATOR_PERSONAS,
  IT_SECTOR_REGISTRY,
  IT_SECTOR_LIST,
  getItSector,
  resolveItSectorFromText,
  detectAllItSectors,
} from '@lenta/shared';

describe('Curator Okatsiya & IT Sectors Registry', () => {
  it('resolves Okatsiya curator persona by various names and aliases', () => {
    const byId = getCuratorPersona('okatsiya');
    expect(byId).toBeDefined();
    expect(byId?.id).toBe('okatsiya');
    expect(byId?.name).toBe('Окация');
    expect(byId?.emoji).toBe('⚡');
    expect(byId?.iconName).toBe('Cpu');

    // Russian alias
    const byRu = getCuratorPersona('Окация');
    expect(byRu?.id).toBe('okatsiya');

    // Phonetic alias
    const byPhonetic = getCuratorPersona('акация');
    expect(byPhonetic?.id).toBe('okatsiya');

    // Short keywords
    const byIt = getCuratorPersona('it');
    expect(byIt?.id).toBe('okatsiya');

    const byAi = getCuratorPersona('ai');
    expect(byAi?.id).toBe('okatsiya');
  });

  it('contains comprehensive IT sectors in IT_SECTOR_REGISTRY', () => {
    expect(IT_SECTOR_REGISTRY.ai).toBeDefined();
    expect(IT_SECTOR_REGISTRY.devops).toBeDefined();
    expect(IT_SECTOR_REGISTRY.bigtech).toBeDefined();
    expect(IT_SECTOR_REGISTRY.backend).toBeDefined();
    expect(IT_SECTOR_REGISTRY.frontend).toBeDefined();
    expect(IT_SECTOR_REGISTRY.mobile).toBeDefined();
    expect(IT_SECTOR_REGISTRY.infosec).toBeDefined();
    expect(IT_SECTOR_REGISTRY.cloud).toBeDefined();
    expect(IT_SECTOR_REGISTRY.data).toBeDefined();
    expect(IT_SECTOR_REGISTRY.hardware).toBeDefined();
    expect(IT_SECTOR_REGISTRY.gamedev).toBeDefined();
    expect(IT_SECTOR_REGISTRY.qa).toBeDefined();

    expect(IT_SECTOR_LIST.length).toBeGreaterThanOrEqual(12);
  });

  it('resolves sectors by id, short name or keyword', () => {
    expect(getItSector('devops')?.name).toContain('DevOps');
    expect(getItSector('девопс')?.id).toBe('devops');
    expect(getItSector('bigtech')?.name).toContain('Бигтех');
    expect(getItSector('бигтех')?.id).toBe('bigtech');
    expect(getItSector('backend')?.name).toContain('Backend');
    expect(getItSector('бэкенд')?.id).toBe('backend');
    expect(getItSector('infosec')?.name).toContain('Безопасность');
  });

  it('resolves best IT sector from news text or headlines', () => {
    const devopsText = 'Kubernetes 1.32 LTS анонсировал новые возможности для CI/CD пайплайнов в Docker';
    const sectorDevops = resolveItSectorFromText(devopsText);
    expect(sectorDevops?.id).toBe('devops');

    const aiText = 'Anthropic представил Claude 3.7 Sonnet с гибридным reasoning для агентных задач';
    const sectorAi = resolveItSectorFromText(aiText);
    expect(sectorAi?.id).toBe('ai');

    const backendText = 'Разработчики переписали распределенный микросервис на Go и PostgreSQL с gRPC шиной';
    const sectorBackend = resolveItSectorFromText(backendText);
    expect(sectorBackend?.id).toBe('backend');

    const bigtechText = 'Антимонопольный регулятор США начал расследование в отношении Meta и Google из-за рекламы';
    const sectorBigtech = resolveItSectorFromText(bigtechText);
    expect(sectorBigtech?.id).toBe('bigtech');

    const infosecText = 'Обнаружена критическая уязвимость нулевого дня (CVE-2026-9999) в криптографической библиотеке';
    const sectorInfosec = resolveItSectorFromText(infosecText);
    expect(sectorInfosec?.id).toBe('infosec');
  });

  it('detects multiple sectors in a multi-topic text', () => {
    const multiText = 'Nvidia инвестирует в дата-центры для обучения LLM, оптимизируя Kubernetes кластеры и закрывая уязвимости CVE';
    const detected = detectAllItSectors(multiText);
    const ids = detected.map((s) => s.id);

    expect(ids).toContain('ai');
    expect(ids).toContain('devops');
    expect(ids).toContain('hardware');
    expect(ids).toContain('infosec');
  });
});
