import { describe, it, expect, vi } from 'vitest';
import { buildFileTree } from '../sidebar-view';

vi.mock('obsidian', () => ({
  ItemView: class {},
  WorkspaceLeaf: class {},
  Notice: vi.fn(),
  setIcon: vi.fn(),
  Component: class {},
  TFile: class {},
  TFolder: class {},
  Menu: class {},
  Modal: class {
    app: any;
    contentEl = {
      empty: vi.fn(),
      createDiv: vi.fn(() => ({ createEl: vi.fn(), createDiv: vi.fn(), createSpan: vi.fn() })),
      createEl: vi.fn(),
    };
    close = vi.fn();
  },
  Setting: class {
    setName = vi.fn().mockReturnThis();
    setDesc = vi.fn().mockReturnThis();
    addText = vi.fn().mockReturnThis();
    addDropdown = vi.fn().mockReturnThis();
    addTextArea = vi.fn().mockReturnThis();
    addExtraButton = vi.fn().mockReturnThis();
  },
  normalizePath: (p: string) => p.replace(/\\/g, '/'),
}));

describe('LentaSidebarView - File Tree & Current Day Logic', () => {
  it('extracts dateStr from filename prefix YYYY-MM-DD and sorts chronologically', () => {
    const files = [
      { path: 'Holidays/Russia/Military/2026-09-27 - День воспитателя.md' },
      { path: 'Holidays/Russia/Military/2026-09-08 - День Бородинского сражения.md' },
      { path: 'Holidays/Russia/Military/2026-09-13 - День программиста в России.md' },
      { path: 'Holidays/Russia/Military/2026-01-27 - День освобождения Ленинграда.md' },
    ];

    const tree = buildFileTree(files);
    expect(tree).toHaveLength(1); // Holidays
    expect(tree[0].name).toBe('Holidays');

    const russia = tree[0].children?.[0];
    expect(russia?.name).toBe('Russia');

    const military = russia?.children?.[0];
    expect(military?.name).toBe('Military');

    const militaryFiles = military?.children || [];
    expect(militaryFiles).toHaveLength(4);

    // Verify chronological order
    expect(militaryFiles[0].name).toBe('2026-01-27 - День освобождения Ленинграда.md');
    expect(militaryFiles[0].dateStr).toBe('2026-01-27');

    expect(militaryFiles[1].name).toBe('2026-09-08 - День Бородинского сражения.md');
    expect(militaryFiles[1].dateStr).toBe('2026-09-08');

    expect(militaryFiles[2].name).toBe('2026-09-13 - День программиста в России.md');
    expect(militaryFiles[2].dateStr).toBe('2026-09-13');

    expect(militaryFiles[3].name).toBe('2026-09-27 - День воспитателя.md');
    expect(militaryFiles[3].dateStr).toBe('2026-09-27');
  });

  it('extracts dateStr from startDate metadata when filename does not have prefix', () => {
    const files = [
      { path: 'Events/Conference.md', startDate: '2026-09-19T10:00:00.000Z' },
      { path: 'Events/Workshop.md', startDate: '2026-09-15T14:00:00.000Z' },
    ];

    const tree = buildFileTree(files);
    const events = tree[0];
    expect(events.children).toHaveLength(2);

    expect(events.children![0].name).toBe('Workshop.md');
    expect(events.children![0].dateStr).toBe('2026-09-15');

    expect(events.children![1].name).toBe('Conference.md');
    expect(events.children![1].dateStr).toBe('2026-09-19');
  });

  it('correctly places folders ahead of files', () => {
    const files = [
      { path: 'Projects/Roadmap.md' },
      { path: 'Projects/Subproject/Task.md' },
    ];

    const tree = buildFileTree(files);
    const projects = tree[0];
    expect(projects.children![0].type).toBe('folder');
    expect(projects.children![0].name).toBe('Subproject');
    expect(projects.children![1].type).toBe('file');
    expect(projects.children![1].name).toBe('Roadmap.md');
  });

  it('includes empty folders passed into buildFileTree even when files array is empty', () => {
    const files: Array<{ path: string }> = [];
    const folders = [
      { path: 'PrivateVault/SecretFolder' },
      { path: 'PrivateVault/Daily' },
      { path: 'EmptyRootFolder' },
    ];

    const tree = buildFileTree(files, folders);
    expect(tree).toHaveLength(2); // EmptyRootFolder and PrivateVault

    const emptyRoot = tree.find((n) => n.name === 'EmptyRootFolder');
    expect(emptyRoot).toBeDefined();
    expect(emptyRoot?.type).toBe('folder');
    expect(emptyRoot?.children).toHaveLength(0);

    const privateVault = tree.find((n) => n.name === 'PrivateVault');
    expect(privateVault).toBeDefined();
    expect(privateVault?.type).toBe('folder');
    expect(privateVault?.children).toHaveLength(2);

    const subNames = privateVault?.children?.map((c) => c.name);
    expect(subNames).toContain('SecretFolder');
    expect(subNames).toContain('Daily');
  });

  it('correctly nests files inside explicit container folders', () => {
    const files = [{ path: 'Workspace/Projects/Sprint-1/Note.md' }];
    const folders = [
      { path: 'Workspace/Projects/Sprint-1' },
      { path: 'Workspace/Projects/Sprint-2' }, // empty
    ];

    const tree = buildFileTree(files, folders);
    expect(tree).toHaveLength(1);
    const workspace = tree[0];
    expect(workspace.name).toBe('Workspace');

    const projects = workspace.children?.[0];
    expect(projects?.name).toBe('Projects');
    expect(projects?.children).toHaveLength(2); // Sprint-1 and Sprint-2

    const sprint1 = projects?.children?.find((c) => c.name === 'Sprint-1');
    expect(sprint1?.children).toHaveLength(1);
    expect(sprint1?.children?.[0].name).toBe('Note.md');

    const sprint2 = projects?.children?.find((c) => c.name === 'Sprint-2');
    expect(sprint2?.children).toHaveLength(0);
  });
});
