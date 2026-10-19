import React, { useState, useMemo } from 'react';

interface IconPickerProps {
  value?: string | null;
  onChange: (iconName: string) => void;
  label?: string;
}

interface IconCategory {
  name: string;
  icons: string[];
}

const ICON_CATEGORIES: IconCategory[] = [
  {
    name: 'Tech & Code',
    icons: [
      'code',
      'terminal',
      'dns',
      'memory',
      'database',
      'web',
      'code_blocks',
      'developer_board',
      'api',
      'bug_report',
      'data_object',
      'html',
      'css',
      'javascript',
      'integration_instructions',
      'deployed_code',
      'webhook',
    ],
  },
  {
    name: 'System & Cloud',
    icons: [
      'cloud',
      'cloud_sync',
      'cloud_queue',
      'cloud_done',
      'settings',
      'tune',
      'settings_system_daydream',
      'security',
      'shield',
      'lock',
      'key',
      'router',
      'hub',
      'lan',
      'sensors',
      'sync',
      'power',
      'build',
    ],
  },
  {
    name: 'Media & Entertainment',
    icons: [
      'movie',
      'local_movies',
      'theaters',
      'tv',
      'music_note',
      'headphones',
      'videocam',
      'camera',
      'photo_camera',
      'image',
      'theater_comedy',
      'auto_awesome',
      'star',
      'animation',
      'stream',
      'podcasts',
      'mic',
      'radio',
    ],
  },
  {
    name: 'Product & Design',
    icons: [
      'palette',
      'brush',
      'draw',
      'design_services',
      'layers',
      'auto_fix_high',
      'style',
      'aspect_ratio',
      'view_quilt',
      'grid_view',
      'widgets',
      'smart_button',
      'category',
      'touch_app',
      'gesture',
      'contrast',
    ],
  },
  {
    name: 'Strategy & Org',
    icons: [
      'architecture',
      'account_tree',
      'timeline',
      'trending_up',
      'monitoring',
      'analytics',
      'insights',
      'group',
      'groups',
      'person',
      'business',
      'work',
      'task_alt',
      'checklist',
      'flag',
      'calendar_today',
      'event',
      'schedule',
      'speed',
    ],
  },
  {
    name: 'Badges & General',
    icons: [
      'tag',
      'label',
      'folder',
      'folder_open',
      'bookmark',
      'bookmark_added',
      'favorite',
      'lightbulb',
      'psychology',
      'science',
      'school',
      'menu_book',
      'newspaper',
      'campaign',
      'bolt',
      'rocket_launch',
      'explore',
      'inventory_2',
      'archive',
      'check_circle',
      'info',
      'help',
    ],
  },
];

const ALL_PRESET_ICONS = Array.from(
  new Set(ICON_CATEGORIES.flatMap((c) => c.icons)),
);

export const IconPicker: React.FC<IconPickerProps> = ({
  value,
  onChange,
  label = 'Node Icon (Material Symbol)',
}) => {
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [isExpanded, setIsExpanded] = useState(false);

  const filteredIcons = useMemo(() => {
    const term = search.trim().toLowerCase();
    let list = ALL_PRESET_ICONS;
    if (selectedCategory !== 'All') {
      const cat = ICON_CATEGORIES.find((c) => c.name === selectedCategory);
      if (cat) list = cat.icons;
    }

    if (!term) return list;
    return list.filter((icon) => icon.toLowerCase().includes(term));
  }, [search, selectedCategory]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <label className="block font-mono text-[10px] font-semibold text-text-muted uppercase tracking-wider">
          {label}
        </label>
        {value && (
          <button
            type="button"
            onClick={() => onChange('')}
            className="text-[10px] font-mono text-text-muted hover:text-error transition-colors cursor-pointer"
          >
            Clear Icon
          </button>
        )}
      </div>

      {/* Selected Icon Trigger / Input Display */}
      <div className="flex items-center gap-1.5">
        <div className="w-7.5 h-7.5 rounded bg-control border border-tile-border flex items-center justify-center text-primary flex-shrink-0 shadow-xs">
          {value ? (
            <span className="material-symbols-outlined text-[18px]">{value}</span>
          ) : (
            <span className="material-symbols-outlined text-[16px] text-text-muted/40">
              hide_image
            </span>
          )}
        </div>

        <input
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value.trim().toLowerCase())}
          placeholder="e.g. movie, memory, shield, palette..."
          className="flex-1 h-7.5 bg-control border border-tile-border rounded px-2.5 text-text-main font-mono text-xs focus:border-primary outline-none transition-colors"
        />

        <button
          type="button"
          onClick={() => setIsExpanded((prev) => !prev)}
          className={`h-7.5 px-2.5 rounded text-xs font-mono border transition-all flex items-center gap-1 cursor-pointer ${
            isExpanded
              ? 'bg-primary/15 text-primary border-primary/40'
              : 'bg-tile-subtle text-text-muted border-tile-border hover:bg-tile-muted hover:text-text-main'
          }`}
        >
          <span className="material-symbols-outlined text-[15px]">
            {isExpanded ? 'expand_less' : 'category'}
          </span>
          Presets
        </button>
      </div>

      {/* Collapsible Icon Catalog */}
      {isExpanded && (
        <div className="bg-panel border border-tile-border rounded-lg p-2.5 space-y-2 shadow-tile">
          {/* Search & Category Filter */}
          <div className="space-y-1.5">
            <div className="relative">
              <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-text-muted text-[15px]">
                search
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search icon presets..."
                className="w-full bg-control border border-tile-border rounded pl-7 pr-2.5 py-1 text-xs text-text-main focus:border-primary outline-none font-sans"
              />
            </div>

            {/* Category pills */}
            <div className="flex flex-wrap gap-1">
              <button
                type="button"
                onClick={() => setSelectedCategory('All')}
                className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                  selectedCategory === 'All'
                    ? 'bg-primary text-on-primary font-bold shadow-xs'
                    : 'bg-tile-subtle text-text-muted border border-tile-border hover:text-text-main'
                }`}
              >
                All
              </button>
              {ICON_CATEGORIES.map((cat) => (
                <button
                  key={cat.name}
                  type="button"
                  onClick={() => setSelectedCategory(cat.name)}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
                    selectedCategory === cat.name
                      ? 'bg-primary text-on-primary font-bold shadow-xs'
                      : 'bg-tile-subtle text-text-muted border border-tile-border hover:text-text-main'
                  }`}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          </div>

          {/* Icon Grid */}
          <div className="grid grid-cols-8 sm:grid-cols-10 gap-1 max-h-44 overflow-y-auto p-1 bg-control/50 rounded border border-tile-border custom-scrollbar">
            {filteredIcons.map((iconName) => {
              const isSelected = value === iconName;
              return (
                <button
                  key={iconName}
                  type="button"
                  title={iconName}
                  onClick={() => {
                    onChange(iconName);
                  }}
                  className={`p-1.5 rounded flex items-center justify-center transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-primary text-on-primary shadow-xs scale-105'
                      : 'text-text-muted hover:text-primary hover:bg-tile-subtle'
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">
                    {iconName}
                  </span>
                </button>
              );
            })}

            {filteredIcons.length === 0 && (
              <div className="col-span-full py-3 text-center text-xs font-mono text-text-muted">
                No matching preset icons. Type custom name above.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
