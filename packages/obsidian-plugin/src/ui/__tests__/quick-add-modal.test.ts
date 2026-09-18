import { describe, it, expect, vi } from 'vitest';
import { LentaQuickAddModal } from '../quick-add-modal';

const createdSettings: Array<{
  name?: string;
  desc?: string;
  textComponents: any[];
  dropdownComponents: any[];
  extraButtons: any[];
}> = [];

const mockNoticeMessages: string[] = [];

vi.mock('obsidian', () => {
  return {
    Modal: class MockModal {
      app: any;
      constructor(app: any) {
        this.app = app;
      }
      contentEl = {
        empty: vi.fn(),
        createDiv: vi.fn(() => ({
          createEl: vi.fn((tag: string, opts?: any) => {
            const el: any = {
              text: opts?.text,
              onclick: null,
              disabled: false,
              setText: vi.fn(),
            };
            return el;
          }),
          createDiv: vi.fn(),
          createSpan: vi.fn(),
        })),
        createEl: vi.fn(),
      };
      modalEl = {
        addClass: vi.fn(),
      };
      close = vi.fn();
    },
    Setting: class MockSetting {
      current: any = { textComponents: [], dropdownComponents: [], extraButtons: [] };
      constructor(public containerEl?: any) {
        createdSettings.push(this.current);
      }
      setName = vi.fn((name: string) => {
        this.current.name = name;
        return this;
      });
      setDesc = vi.fn((desc: string) => {
        this.current.desc = desc;
        return this;
      });
      addText = vi.fn((cb: any) => {
        const textComp: any = {
          inputEl: { type: 'text', addClass: vi.fn(), focus: vi.fn() },
          value: '',
          setPlaceholder: vi.fn().mockReturnThis(),
          setValue: vi.fn((val: string) => {
            textComp.value = val;
            return textComp;
          }),
          onChange: vi.fn((handler: any) => {
            textComp._changeHandler = handler;
            return textComp;
          }),
        };
        if (typeof cb === 'function') cb(textComp);
        this.current.textComponents.push(textComp);
        return this;
      });
      addDropdown = vi.fn((cb: any) => {
        const ddComp: any = {
          options: {} as Record<string, string>,
          value: '',
          addOption: vi.fn((val: string, label: string) => {
            ddComp.options[val] = label;
            return ddComp;
          }),
          setValue: vi.fn((val: string) => {
            ddComp.value = val;
            return ddComp;
          }),
          onChange: vi.fn((handler: any) => {
            ddComp._changeHandler = handler;
            return ddComp;
          }),
        };
        if (typeof cb === 'function') cb(ddComp);
        this.current.dropdownComponents.push(ddComp);
        return this;
      });
      addTextArea = vi.fn((cb: any) => {
        const taComp: any = {
          inputEl: { style: {}, rows: 0 },
          setPlaceholder: vi.fn().mockReturnThis(),
          setValue: vi.fn().mockReturnThis(),
          onChange: vi.fn().mockReturnThis(),
        };
        if (typeof cb === 'function') cb(taComp);
        return this;
      });
      addExtraButton = vi.fn((cb: any) => {
        const btnComp: any = {
          setIcon: vi.fn().mockReturnThis(),
          setTooltip: vi.fn().mockReturnThis(),
          onClick: vi.fn((handler: any) => {
            btnComp._clickHandler = handler;
            return btnComp;
          }),
        };
        if (typeof cb === 'function') cb(btnComp);
        this.current.extraButtons.push(btnComp);
        return this;
      });
    },
    Notice: class MockNotice {
      constructor(public msg: string) {
        mockNoticeMessages.push(msg);
      }
    },
    normalizePath: (p: string) => p.replace(/\\/g, '/'),
    TFile: class MockTFile {},
    TFolder: class MockTFolder {
      path: string;
      constructor(path: string) {
        this.path = path;
      }
    },
  };
});

describe('LentaQuickAddModal - Container Folders Logic', () => {
  it('should define default obsidian container folder presets', () => {
    expect(LentaQuickAddModal.DEFAULT_OBSIDIAN_FOLDERS).toEqual([
      'Notes',
      'Daily',
      'Projects',
      'Archive',
    ]);
  });

  it('should load dedicated folder list combining presets, server folders, container files, and vault folders', async () => {
    const mockApiClient: any = {
      getFolders: vi.fn().mockResolvedValue([
        { id: 'f-server', path: 'Reports/2026', name: '2026' },
      ]),
      getContainerFiles: vi.fn().mockResolvedValue([
        { path: 'Sprint/Task1.md' },
        { path: 'Sprint/Deep/Task2.md' },
      ]),
      getFeeds: vi.fn().mockResolvedValue([]),
      getTaxonomyTree: vi.fn().mockResolvedValue([]),
    };

    const mockVaultFolders: any[] = [
      {
        path: 'Lenta/My_Container/CustomLocalFolder',
      },
    ];

    const mockApp: any = {
      vault: {
        getAllLoadedFiles: vi.fn().mockReturnValue([
          new (await import('obsidian')).TFolder('Lenta/My_Container/CustomLocalFolder'),
        ]),
        getAbstractFileByPath: vi.fn(),
        createFolder: vi.fn(),
        create: vi.fn(),
      },
    };

    const mockSettings: any = {
      serverUrl: 'http://localhost:3001',
      vaultRootFolder: 'Lenta',
      activeContainerId: '',
      connectedContainerName: '',
      defaultFeedSlug: 'my-notes',
    };

    const modal = new LentaQuickAddModal(
      mockApp,
      mockApiClient,
      () => mockSettings,
      vi.fn(),
      undefined,
      'InitialTargetFolder',
      'cont-test-vault',
      'My Container',
      undefined
    );

    // Call private loadContainerFolders
    const loadedFolders = await (modal as any).loadContainerFolders('cont-test-vault');
    const folderPaths = loadedFolders.map((f: any) => f.path);

    // Presets
    expect(folderPaths).toContain('Notes');
    expect(folderPaths).toContain('Daily');
    expect(folderPaths).toContain('Projects');
    expect(folderPaths).toContain('Archive');

    // Server-scoped folder
    expect(folderPaths).toContain('Reports/2026');

    // Container files folder paths
    expect(folderPaths).toContain('Sprint');
    expect(folderPaths).toContain('Sprint/Deep');

    // Local Obsidian vault folder
    expect(folderPaths).toContain('CustomLocalFolder');

    // Initial folder
    expect(folderPaths).toContain('InitialTargetFolder');
  });

  it('should accurately recognize Obsidian Container mode', () => {
    const mockApiClient: any = {};
    const mockApp: any = { vault: {} };
    const mockSettings: any = {
      activeContainerId: 'cont-active',
      connectedContainerName: 'Active Vault',
    };

    // Case 1: Initial container provided
    const modal1 = new LentaQuickAddModal(
      mockApp,
      mockApiClient,
      () => ({ activeContainerId: '' } as any),
      vi.fn(),
      undefined,
      undefined,
      'cont-123',
      'My Custom Vault'
    );
    expect((modal1 as any).isObsidianContainerMode()).toBe(true);
    expect((modal1 as any).getTargetContainerName()).toBe('My Custom Vault');

    // Case 2: Active container in settings provided
    const modal2 = new LentaQuickAddModal(
      mockApp,
      mockApiClient,
      () => mockSettings,
      vi.fn()
    );
    expect((modal2 as any).isObsidianContainerMode()).toBe(true);
    expect((modal2 as any).getTargetContainerName()).toBe('Active Vault');

    // Case 3: No container
    const modal3 = new LentaQuickAddModal(
      mockApp,
      mockApiClient,
      () => ({ activeContainerId: '', connectedContainerName: '' } as any),
      vi.fn()
    );
    expect((modal3 as any).isObsidianContainerMode()).toBe(false);
  });
});

describe('LentaQuickAddModal - Note Type & Datepicker Settings', () => {
  const setupModal = (initialDate?: string, initialType?: any) => {
    createdSettings.length = 0;
    mockNoticeMessages.length = 0;

    const mockApp: any = {
      vault: {
        getAllLoadedFiles: vi.fn().mockReturnValue([]),
        getAbstractFileByPath: vi.fn().mockReturnValue(null),
        createFolder: vi.fn(),
        create: vi.fn(),
      },
    };
    const mockApiClient: any = {
      getFeeds: vi.fn().mockResolvedValue([{ id: 'f-1', slug: 'my-notes', title: 'My Notes', isUserOwn: true }]),
      getFolders: vi.fn().mockResolvedValue([]),
      getTaxonomyTree: vi.fn().mockResolvedValue([]),
      createNote: vi.fn().mockResolvedValue({
        id: 'note-123',
        title: 'Test Note',
        type: 'EVENT',
        startDate: '2026-10-15T12:00:00.000Z',
        feed: { slug: 'my-notes' },
      }),
    };
    const mockSettings: any = {
      serverUrl: 'http://localhost:3001',
      vaultRootFolder: 'Lenta',
      activeContainerId: '',
      connectedContainerName: '',
      defaultFeedSlug: 'my-notes',
    };
    const onSuccess = vi.fn();

    const modal = new LentaQuickAddModal(
      mockApp,
      mockApiClient,
      () => mockSettings,
      onSuccess,
      undefined,
      undefined,
      undefined,
      undefined,
      undefined,
      initialDate,
      initialType
    );

    return { modal, mockApp, mockApiClient, onSuccess };
  };

  it('should initialize default state with EVENT type, local today date, and empty endDate', () => {
    const { modal } = setupModal();

    expect((modal as any).type).toBe('EVENT');
    expect((modal as any).startDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect((modal as any).endDate).toBe('');
  });

  it('should respect initialDate (date or ISO string) and initialType in constructor', () => {
    const { modal } = setupModal('2026-12-31T20:00:00.000Z', 'PERIOD');

    expect((modal as any).type).toBe('PERIOD');
    expect((modal as any).startDate).toBe('2026-12-31');
  });

  it('should render Note Type, Start Date, and End Date settings with proper controls', async () => {
    const { modal } = setupModal('2026-10-01', 'SINGLE');

    await modal.onOpen();

    const typeSetting = createdSettings.find((s) => s.name === 'Note Type');
    expect(typeSetting).toBeDefined();
    expect(typeSetting?.dropdownComponents.length).toBe(1);
    const typeDropdown = typeSetting?.dropdownComponents[0];
    expect(typeDropdown.options['EVENT']).toContain('Event');
    expect(typeDropdown.options['PERIOD']).toContain('Period');
    expect(typeDropdown.options['SINGLE']).toContain('Single');
    expect(typeDropdown.options['DONE']).toContain('Done');
    expect(typeDropdown.options['FILM_RELEASE']).toContain('Release');
    expect(typeDropdown.options['MENTION']).toContain('Mention');
    expect(typeDropdown.value).toBe('SINGLE');

    const startSetting = createdSettings.find((s) => s.name === 'Start Date');
    expect(startSetting).toBeDefined();
    expect(startSetting?.textComponents.length).toBe(1);
    const startInput = startSetting?.textComponents[0];
    expect(startInput.inputEl.type).toBe('date');
    expect(startInput.value).toBe('2026-10-01');

    const endSetting = createdSettings.find((s) => s.name === 'End Date');
    expect(endSetting).toBeDefined();
    expect(endSetting?.textComponents.length).toBe(1);
    expect(endSetting?.extraButtons.length).toBe(1);
    const endInput = endSetting?.textComponents[0];
    expect(endInput.inputEl.type).toBe('date');
    expect(endInput.value).toBe('');
  });

  it('should auto-prefill endDate from startDate when switching to PERIOD type', async () => {
    const { modal } = setupModal('2026-10-10');

    await modal.onOpen();

    const typeSetting = createdSettings.find((s) => s.name === 'Note Type');
    const typeDropdown = typeSetting?.dropdownComponents[0];

    // Simulate user selecting PERIOD
    typeDropdown._changeHandler('PERIOD');

    expect((modal as any).type).toBe('PERIOD');
    expect((modal as any).endDate).toBe('2026-10-10');
  });

  it('should clear endDate when clear extra button is clicked', async () => {
    const { modal } = setupModal('2026-10-10');

    await modal.onOpen();

    const endSetting = createdSettings.find((s) => s.name === 'End Date');
    const endInput = endSetting?.textComponents[0];
    const clearBtn = endSetting?.extraButtons[0];

    // Set end date
    endInput._changeHandler('2026-10-20');
    expect((modal as any).endDate).toBe('2026-10-20');

    // Click clear button
    clearBtn._clickHandler();
    expect((modal as any).endDate).toBe('');
  });

  it('should validate that endDate cannot be earlier than startDate', async () => {
    const { modal, mockApiClient } = setupModal('2026-10-20');

    await modal.onOpen();

    (modal as any).title = 'Test Event';
    (modal as any).startDate = '2026-10-20';
    (modal as any).endDate = '2026-10-10'; // earlier!

    // Find submit button in contentEl
    const mockContentEl = (modal as any).contentEl;
    const footerDiv = mockContentEl.createDiv.mock.results.find(
      (r: any) => r.value?.createEl?.mock?.calls?.some((c: any) => c[1]?.text === 'Create Note in Lenta')
    )?.value;

    const submitCall = footerDiv?.createEl.mock.calls.find((c: any) => c[1]?.text === 'Create Note in Lenta');
    const submitBtn = footerDiv?.createEl.mock.results.find((r: any) => r.value?.text === 'Create Note in Lenta')?.value;

    expect(submitBtn).toBeDefined();

    await submitBtn.onclick();

    expect(mockNoticeMessages.some((msg) => msg.includes('End date cannot be earlier than start date'))).toBe(true);
    expect(mockApiClient.createNote).not.toHaveBeenCalled();
  });

  it('should call apiClient.createNote with correct type, startDate ISO, and endDate ISO', async () => {
    const { modal, mockApiClient, onSuccess } = setupModal('2026-10-01', 'PERIOD');

    await modal.onOpen();

    (modal as any).title = 'Q4 Roadmap Launch';
    (modal as any).startDate = '2026-10-01';
    (modal as any).endDate = '2026-10-31';

    const mockContentEl = (modal as any).contentEl;
    const footerDiv = mockContentEl.createDiv.mock.results.find(
      (r: any) => r.value?.createEl?.mock?.calls?.some((c: any) => c[1]?.text === 'Create Note in Lenta')
    )?.value;
    const submitBtn = footerDiv?.createEl.mock.results.find((r: any) => r.value?.text === 'Create Note in Lenta')?.value;

    await submitBtn.onclick();

    expect(mockApiClient.createNote).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Q4 Roadmap Launch',
        type: 'PERIOD',
        startDate: expect.stringContaining('2026-10-01'),
        endDate: expect.stringContaining('2026-10-31'),
      })
    );
    expect(onSuccess).toHaveBeenCalled();
  });
});

