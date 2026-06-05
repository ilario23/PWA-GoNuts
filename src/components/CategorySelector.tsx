import * as React from 'react';
import {
  Ban,
  Check,
  ChevronsUpDown,
  ChevronRight,
  Search,
  Users,
  X,
} from 'lucide-react';
import {cn} from '@/lib/utils';
import {Button} from '@/components/ui/button';
import {Input} from '@/components/ui/input';
import {Popover, PopoverContent, PopoverTrigger} from '@/components/ui/popover';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
  DrawerDescription,
} from '@/components/ui/drawer';
import {useCategories} from '@/hooks/useCategories';
import {Category} from '@/lib/db';
import {getIconComponent} from '@/lib/icons';
import {useTranslation} from 'react-i18next';
import {UNCATEGORIZED_CATEGORY} from '@/lib/constants';
import {Badge} from '@/components/ui/badge';
import {useGroups} from '@/hooks/useGroups';

interface CategorySelectorProps {
  value?: string;
  onChange: (value: string) => void;
  type?: 'income' | 'expense' | 'investment';
  excludeId?: string;
  modal?: boolean;
  groupId?: string | null; // Kept for API compatibility but ignored for filtering to show all
  triggerClassName?: string;
  showSkipOption?: boolean;
  usageFrequency?: Record<string, number>;
  customTrigger?: React.ReactNode;
  /** External open control — when provided, no trigger button is rendered */
  externalOpen?: boolean;
  onExternalOpenChange?: (open: boolean) => void;
  /**
   * Picker layout. 'tree' = the inline expand/collapse accordion (default).
   * 'tabs' = sticky parent-tab navigation: pick a group, then a child.
   */
  variant?: 'tree' | 'tabs';
}

// Helper to get descendant IDs (defined outside to avoid recursion issues)
function getDescendantIds(categoryId: string, cats: Category[]): string[] {
  const children = cats.filter((c) => c.parent_id === categoryId);
  const descendantIds = children.map((c) => c.id);
  children.forEach((child) => {
    descendantIds.push(...getDescendantIds(child.id, cats));
  });
  return descendantIds;
}

export function CategorySelector({
  value,
  onChange,
  type,
  excludeId,
  modal = false,
  groupId, // Strict filter: null/undefined = Personal, string = Group
  triggerClassName,
  showSkipOption = false,
  usageFrequency,
  customTrigger,
  externalOpen,
  onExternalOpenChange,
  variant = 'tree',
}: CategorySelectorProps) {
  // Fetch ALL categories first, then filter strictly in memory for responsiveness
  // Or should we trust the hook? Let's filter in memory to be sure.
  const {categories} = useCategories(undefined);
  const {groups} = useGroups();
  const {t} = useTranslation();

  const [internalOpen, setInternalOpen] = React.useState(false);
  const open = externalOpen !== undefined ? externalOpen : internalOpen;
  const setOpen = onExternalOpenChange !== undefined ? onExternalOpenChange : setInternalOpen;
  const [isMobile, setIsMobile] = React.useState(false);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [expandedRoots, setExpandedRoots] = React.useState<Set<string>>(
    new Set(),
  );
  // 'tabs' variant: which parent group's children are currently shown
  // (null = the top-level "All" view).
  const [activeParentId, setActiveParentId] = React.useState<string | null>(
    null,
  );

  React.useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const filteredCategories = React.useMemo(() => {
    // 1. Strict Group Filter
    let cats =
      categories?.filter((c) => {
        if (groupId) {
          return c.group_id === groupId;
        } else {
          return !c.group_id; // Personal categories only
        }
      }) || [];

    // 2. Active Check
    cats = cats.filter((c) => c.active !== 0);

    // 3. Exclude Uncategorized
    cats = cats.filter((c) => c.id !== UNCATEGORIZED_CATEGORY.ID);

    // 4. Filter by Type
    if (type) {
      cats = cats.filter((c) => c.type === type);
    }

    // 5. Exclude editing (for parents)
    if (excludeId) {
      const excludeIds = [excludeId, ...getDescendantIds(excludeId, cats)];
      cats = cats.filter((c) => !excludeIds.includes(c.id));
    }

    // 6. Search Filter
    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      cats = cats.filter((c) => c.name.toLowerCase().includes(lowerTerm));
    }

    return cats.sort((a, b) => {
      // Sort by frequency (descending) if available
      if (usageFrequency) {
        const countA = usageFrequency[a.id] || 0;
        const countB = usageFrequency[b.id] || 0;

        // Only prioritize if there is a difference and usage > 0
        if (countA !== countB) {
          return countB - countA;
        }
      }

      return a.name.localeCompare(b.name);
    });
  }, [categories, type, excludeId, searchTerm, groupId, usageFrequency]);

  // If searching, we show a flat list. If not, we show tree.
  const isSearching = !!searchTerm;

  const rootCategories = React.useMemo(() => {
    if (isSearching) return filteredCategories; // Flat list for search

    const visibleIds = new Set(filteredCategories.map((c) => c.id));
    return filteredCategories.filter((c) => {
      // It is a root if:
      // 1. No parent_id
      // 2. OR parent_id exists but parent is NOT in the visible set (Orphan)
      const isOrphan = c.parent_id && !visibleIds.has(c.parent_id);
      return !c.parent_id || isOrphan;
    });
  }, [filteredCategories, isSearching]);

  const getChildren = (parentId: string) => {
    return filteredCategories.filter((c) => c.parent_id === parentId);
  };

  // Top categories the user actually reaches for — a one-tap strip that keeps
  // the most common picks a thumb away (Entry is sacred).
  const frequentCategories = React.useMemo(() => {
    if (!usageFrequency || isSearching) return [];
    return filteredCategories
      .filter((c) => (usageFrequency[c.id] || 0) > 0)
      .sort((a, b) => (usageFrequency[b.id] || 0) - (usageFrequency[a.id] || 0))
      .slice(0, 6);
  }, [filteredCategories, usageFrequency, isSearching]);

  const selectedCategory = categories?.find((c) => c.id === value);
  const selectedGroupName = selectedCategory?.group_id
    ? groups.find((g) => g.id === selectedCategory.group_id)?.name
    : null;

  // Auto-expand the parent of the selected category on open
  React.useEffect(() => {
    if (open && selectedCategory && selectedCategory.parent_id) {
      setExpandedRoots((prev) => {
        const newSet = new Set(prev);
        newSet.add(selectedCategory.parent_id!);
        return newSet;
      });
    }
  }, [open, selectedCategory]);

  // 'tabs' variant: when the picker opens, land the user on the group that
  // holds their current selection; reset to "All" when it closes.
  React.useEffect(() => {
    if (!open) {
      setActiveParentId(null);
      return;
    }
    if (selectedCategory?.parent_id) {
      setActiveParentId(selectedCategory.parent_id);
    }
  }, [open, selectedCategory]);

  const renderCategoryIcon = (
    iconName: string,
    color: string,
    size: 'sm' | 'md' = 'md',
  ) => {
    const Icon = getIconComponent(iconName);
    const box = size === 'sm' ? 'h-7 w-7' : 'h-10 w-10';
    const glyph = size === 'sm' ? 'h-3.5 w-3.5' : 'h-[18px] w-[18px]';
    return (
      <div
        className={cn(
          'flex items-center justify-center rounded-full shrink-0 ring-1 ring-inset ring-foreground/[0.05]',
          box,
        )}
        style={{
          backgroundColor: color ? `${color}1f` : 'hsl(var(--muted))',
          color: color || 'hsl(var(--muted-foreground))',
        }}
      >
        {Icon ? (
          <Icon className={glyph} />
        ) : (
          <div className={cn('rounded-full bg-current opacity-50', glyph)} />
        )}
      </div>
    );
  };

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
  };

  const toggleExpand = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setExpandedRoots((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const renderCategoryNode = (
    category: Category,
    depth = 0,
    isFirst = false,
  ) => {
    const children = isSearching ? [] : getChildren(category.id);
    const hasChildren = children.length > 0;
    const isExpanded = expandedRoots.has(category.id);
    const isSelected = value === category.id;
    const groupName = category.group_id
      ? groups.find((g) => g.id === category.group_id)?.name
      : null;
    const parentName =
      isSearching && category.parent_id
        ? categories?.find((c) => c.id === category.parent_id)?.name
        : null;

    return (
      <div key={category.id}>
        <div
          role='button'
          tabIndex={0}
          aria-pressed={isSelected}
          onClick={(e) => {
            if (hasChildren && !isSearching) {
              toggleExpand(category.id, e);
            } else {
              handleSelect(category.id);
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              if (hasChildren && !isSearching) {
                toggleExpand(category.id);
              } else {
                handleSelect(category.id);
              }
            }
          }}
          className={cn(
            'group relative flex items-center gap-3 px-2.5 py-2 min-h-[52px] cursor-pointer rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            isSelected ? 'bg-muted' : 'hover:bg-muted/50 active:bg-muted',
            !isFirst &&
              'before:absolute before:inset-x-2.5 before:top-0 before:h-px before:bg-border/45',
          )}
        >
          {renderCategoryIcon(category.icon, category.color)}

          <div className='flex-1 min-w-0'>
            <div className='flex items-center gap-2 min-w-0'>
              <span
                className={cn(
                  'truncate text-[15px] leading-tight',
                  isSelected ? 'font-bold' : 'font-semibold',
                )}
              >
                {category.name}
              </span>
              {groupName && (
                <Badge
                  variant='outline'
                  className='shrink-0 text-[10px] h-4 px-1.5 py-0 flex items-center gap-1 border-primary/40 text-primary'
                >
                  <Users className='h-2.5 w-2.5' />
                  {groupName}
                </Badge>
              )}
            </div>
            {parentName && (
              <span className='mt-0.5 block truncate text-[12px] text-muted-foreground'>
                {t('in_category_name', {name: parentName})}
              </span>
            )}
          </div>

          {isSelected && (
            <Check className='h-[18px] w-[18px] shrink-0 text-[hsl(var(--primary))]' />
          )}

          {hasChildren && !isSearching && (
            <div
              className='flex items-center justify-end gap-1 shrink-0 -mr-1 pl-2 pr-1 min-h-[44px] min-w-[44px] rounded-lg hover:bg-foreground/[0.04]'
              onClick={(e) => toggleExpand(category.id, e)}
              role='button'
              aria-label={t('expand') || 'Expand'}
              aria-expanded={isExpanded}
            >
              <Badge
                variant='secondary'
                className='num text-[10px] px-1.5 py-0 h-[18px] tabular-nums font-bold'
              >
                {children.length}
              </Badge>
              <ChevronRight
                className={cn(
                  'h-[18px] w-[18px] text-muted-foreground transition-transform duration-200',
                  isExpanded && 'rotate-90',
                )}
              />
            </div>
          )}
        </div>

        {/* Children, on a tinted ledger track */}
        {hasChildren && isExpanded && !isSearching && (
          <div className='ml-5 rounded-xl bg-muted/30'>
            {/* Option to select the parent itself */}
            <div
              role='button'
              tabIndex={0}
              aria-pressed={isSelected}
              onClick={() => handleSelect(category.id)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect(category.id);
                }
              }}
              className={cn(
                'flex items-center gap-2 w-full px-2.5 py-2 min-h-[44px] cursor-pointer rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                isSelected ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              <Check
                className={cn(
                  'h-3.5 w-3.5 shrink-0 text-[hsl(var(--primary))]',
                  isSelected ? 'opacity-100' : 'opacity-0',
                )}
              />
              <span className='truncate text-[13px] italic'>
                {t('select_category_name', {name: category.name})}
              </span>
            </div>

            {children.map((child, i) =>
              renderCategoryNode(child, depth + 1, i === 0),
            )}
          </div>
        )}
      </div>
    );
  };

  // ── Shared building blocks (used by both the tree and tabs layouts) ──

  const searchField = (
    <div className='px-3 py-2.5 border-b'>
      <div className='flex items-center gap-2 rounded-[var(--radius-md)] bg-muted px-3 h-11'>
        <Search className='h-4 w-4 text-muted-foreground shrink-0' />
        <Input
          placeholder={t('search_categories')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className='border-0 bg-transparent shadow-none focus-visible:ring-0 px-0 h-9 text-[15px] placeholder:text-foreground/55'
          data-testid='category-search'
        />
        {searchTerm && (
          <button
            type='button'
            onClick={() => setSearchTerm('')}
            aria-label={t('clear') || 'Clear'}
            className='-mr-1 flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-foreground/[0.06] hover:text-foreground shrink-0'
          >
            <X className='h-4 w-4' />
          </button>
        )}
      </div>
    </div>
  );

  const frequentStrip = frequentCategories.length > 0 && (
    <div className='mb-2 px-0.5'>
      <div className='px-1 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/55'>
        {t('frequent', {defaultValue: 'Frequent'})}
      </div>
      <div className='flex flex-wrap gap-1.5'>
        {frequentCategories.map((c) => {
          const isSel = value === c.id;
          return (
            <button
              key={c.id}
              type='button'
              onClick={() => handleSelect(c.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[13px] font-semibold transition-colors',
                isSel
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-border/60 bg-card text-foreground hover:bg-muted',
              )}
            >
              {renderCategoryIcon(c.icon, c.color, 'sm')}
              <span className='max-w-[140px] truncate'>{c.name}</span>
            </button>
          );
        })}
      </div>
      <div className='mt-2.5 h-px bg-border/50' />
    </div>
  );

  // A single flat ledger row for the tabs layout. `drill` means tapping opens
  // the category's children instead of selecting it.
  const renderFlatRow = (
    category: Category,
    isFirst: boolean,
    drill: boolean,
  ) => {
    const isSelected = value === category.id;
    const childCount = getChildren(category.id).length;
    const groupName = category.group_id
      ? groups.find((g) => g.id === category.group_id)?.name
      : null;
    const act = () =>
      drill ? setActiveParentId(category.id) : handleSelect(category.id);

    return (
      <div
        key={category.id}
        role='button'
        tabIndex={0}
        aria-pressed={!drill && isSelected}
        onClick={act}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            act();
          }
        }}
        className={cn(
          'group relative flex items-center gap-3 px-2.5 py-2 min-h-[52px] cursor-pointer rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
          !drill && isSelected
            ? 'bg-muted'
            : 'hover:bg-muted/50 active:bg-muted',
          !isFirst &&
            'before:absolute before:inset-x-2.5 before:top-0 before:h-px before:bg-border/45',
        )}
      >
        {renderCategoryIcon(category.icon, category.color)}
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 min-w-0'>
            <span
              className={cn(
                'truncate text-[15px] leading-tight',
                !drill && isSelected ? 'font-bold' : 'font-semibold',
              )}
            >
              {category.name}
            </span>
            {groupName && (
              <Badge
                variant='outline'
                className='shrink-0 text-[10px] h-4 px-1.5 py-0 flex items-center gap-1 border-primary/40 text-primary'
              >
                <Users className='h-2.5 w-2.5' />
                {groupName}
              </Badge>
            )}
          </div>
        </div>
        {drill ? (
          <div className='flex items-center gap-1 shrink-0 text-muted-foreground'>
            <Badge
              variant='secondary'
              className='num text-[10px] px-1.5 py-0 h-[18px] tabular-nums font-bold'
            >
              {childCount}
            </Badge>
            <ChevronRight className='h-[18px] w-[18px]' />
          </div>
        ) : (
          isSelected && (
            <Check className='h-[18px] w-[18px] shrink-0 text-[hsl(var(--primary))]' />
          )
        )}
      </div>
    );
  };

  const activeParent = activeParentId
    ? categories?.find((c) => c.id === activeParentId)
    : null;
  const tabParents = rootCategories.filter(
    (r) => getChildren(r.id).length > 0,
  );

  const tabsContent = (
    <div className='flex flex-col min-h-0 bg-background w-full'>
      {searchField}

      {/* Sticky group tabs */}
      {!isSearching && tabParents.length > 0 && (
        <div className='border-b overflow-x-auto scrollbar-hide'>
          <div className='flex w-max gap-1.5 px-3 py-2'>
            <button
              type='button'
              onClick={() => setActiveParentId(null)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 h-9 text-[13px] font-semibold transition-colors',
                activeParentId === null
                  ? 'border-transparent bg-foreground text-background'
                  : 'border-border/60 bg-card text-foreground hover:bg-muted',
              )}
            >
              {t('all', {defaultValue: 'All'})}
            </button>
            {tabParents.map((p) => {
              const isActive = activeParentId === p.id;
              return (
                <button
                  key={p.id}
                  type='button'
                  onClick={() => setActiveParentId(p.id)}
                  className={cn(
                    'shrink-0 inline-flex items-center gap-1.5 rounded-full border py-1 pl-1 pr-3 text-[13px] font-semibold transition-colors',
                    isActive
                      ? 'border-transparent bg-foreground text-background'
                      : 'border-border/60 bg-card text-foreground hover:bg-muted',
                  )}
                >
                  {renderCategoryIcon(p.icon, p.color, 'sm')}
                  <span className='max-w-[140px] truncate'>{p.name}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div
        className='flex-1 min-h-0 overflow-y-auto p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] w-full'
        data-vaul-no-drag
      >
        {isSearching ? (
          rootCategories.length === 0 ? (
            <div className='text-center py-8 text-muted-foreground text-sm'>
              {t('no_categories_found')}
            </div>
          ) : (
            <div>
              {rootCategories.map((root, i) =>
                renderCategoryNode(root, 0, i === 0),
              )}
            </div>
          )
        ) : activeParent ? (
          <div>
            {/* Select the group itself */}
            {renderFlatRow(activeParent, true, false)}
            <div className='mt-1 px-1 pb-1.5 pt-2 text-[11px] font-bold uppercase tracking-[0.08em] text-foreground/55'>
              {t('subcategories', {defaultValue: 'Subcategories'})}
            </div>
            {getChildren(activeParent.id).map((child, i) =>
              renderFlatRow(child, i === 0, getChildren(child.id).length > 0),
            )}
          </div>
        ) : (
          <>
            {frequentStrip}
            {rootCategories.length === 0 ? (
              <div className='text-center py-8 text-muted-foreground text-sm'>
                {t('no_categories_found')}
              </div>
            ) : (
              <div>
                {rootCategories.map((root, i) =>
                  renderFlatRow(
                    root,
                    i === 0,
                    getChildren(root.id).length > 0,
                  ),
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );

  const treeContent = (
    <div className='flex flex-col min-h-0 bg-background w-full'>
      {searchField}

      <div
        className='flex-1 min-h-0 overflow-y-auto p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))] w-full'
        data-vaul-no-drag
      >
        {frequentStrip}
        {showSkipOption && !isSearching && (
          <div className='mb-1 pb-1 border-b border-border/45'>
            <div
              role='button'
              tabIndex={0}
              aria-pressed={value === 'SKIP'}
              onClick={() => handleSelect('SKIP')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleSelect('SKIP');
                }
              }}
              className={cn(
                'flex items-center gap-3 w-full px-2.5 py-2 min-h-[52px] cursor-pointer rounded-xl transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
                value === 'SKIP'
                  ? 'bg-[hsl(var(--gonuts-bad)/0.12)] text-[hsl(var(--gonuts-bad))]'
                  : 'hover:bg-muted/50 text-foreground',
              )}
            >
              <div className='flex h-10 w-10 items-center justify-center rounded-full shrink-0 ring-1 ring-inset ring-foreground/[0.05] bg-[hsl(var(--gonuts-bad)/0.12)] text-[hsl(var(--gonuts-bad))]'>
                <Ban className='h-[18px] w-[18px]' />
              </div>
              <div className='flex-1 min-w-0'>
                <span className='block truncate text-[15px] font-semibold leading-tight'>
                  {t('import.skip_ignore', 'Ignore / Skip')}
                </span>
                <span className='mt-0.5 block truncate text-[12px] text-muted-foreground'>
                  {t('import.skip_desc', 'Transaction will be skipped')}
                </span>
              </div>
              {value === 'SKIP' && (
                <Check className='h-[18px] w-[18px] shrink-0 text-[hsl(var(--gonuts-bad))]' />
              )}
            </div>
          </div>
        )}

        {/* No filtered results */}
        {rootCategories.length === 0 && (
          <div className='text-center py-8 text-muted-foreground text-sm'>
            {t('no_categories_found')}
          </div>
        )}

        {/* List */}
        <div>
          {rootCategories.map((root, i) =>
            renderCategoryNode(root, 0, i === 0 && !showSkipOption),
          )}
        </div>
      </div>
    </div>
  );

  const Content = variant === 'tabs' ? tabsContent : treeContent;

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen} shouldScaleBackground={false}>
        {externalOpen === undefined && (
        <DrawerTrigger asChild>
          {customTrigger ? (
            <span>{customTrigger}</span>
          ) : (
          <Button
            variant='outline'
            role='combobox'
            aria-expanded={open}
            className={cn('w-full justify-between', triggerClassName)}
            data-testid='category-trigger'
          >
            {value === 'SKIP' ? (
              <div className='flex items-center min-w-0 text-gonuts-bad dark:text-gonuts-bad'>
                <div className='flex h-6 w-6 items-center justify-center rounded-full mr-3 shrink-0 bg-gonuts-bad/10 dark:bg-gonuts-bad/40 text-gonuts-bad dark:text-gonuts-bad'>
                  <div className='h-2 w-3 bg-current rounded-sm' />
                </div>
                <div className='flex flex-col items-start text-left min-w-0 flex-1'>
                  <span className='truncate leading-none'>
                    {t('import.skip_ignore', 'Ignore / Skip')}
                  </span>
                </div>
              </div>
            ) : selectedCategory ? (
              <div className='flex items-center gap-2.5 min-w-0'>
                {renderCategoryIcon(
                  selectedCategory.icon,
                  selectedCategory.color,
                  'sm',
                )}
                <div className='flex flex-col items-start text-left min-w-0 flex-1'>
                  <span className='truncate leading-none'>
                    {selectedCategory.name}
                  </span>
                  {selectedGroupName && (
                    <span className='text-[10px] text-muted-foreground leading-none mt-1'>
                      {selectedGroupName}
                    </span>
                  )}
                </div>
              </div>
            ) : (
              t('select_category')
            )}
            <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
          </Button>
          )}
        </DrawerTrigger>
        )}
        <DrawerContent className='h-[85dvh] max-h-[85lvh] flex flex-col overflow-hidden fixed bottom-0 left-0 right-0 z-50'>
          <DrawerHeader className='border-b px-4 py-3 shrink-0 text-left'>
            <DrawerTitle>{t('select_category')}</DrawerTitle>
            <DrawerDescription className='sr-only'>
              {t('select_category')}
            </DrawerDescription>
          </DrawerHeader>
          {Content}
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop headless mode: no trigger is rendered, so a Popover would have no
  // anchor to position against and never appears. Use a centered Dialog instead.
  if (externalOpen !== undefined) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className='p-0 gap-0 max-w-[360px] overflow-hidden'>
          <DialogHeader className='border-b px-4 py-3 text-left'>
            <DialogTitle>{t('select_category')}</DialogTitle>
            <DialogDescription className='sr-only'>
              {t('select_category')}
            </DialogDescription>
          </DialogHeader>
          <div className='h-[400px] flex flex-col'>{Content}</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal={modal}>
      {externalOpen === undefined && (
      <PopoverTrigger asChild>
        {customTrigger ? (
          <span>{customTrigger}</span>
        ) : (
        <Button
          variant='outline'
          role='combobox'
          aria-expanded={open}
          className={cn('w-full justify-between', triggerClassName)}
          data-testid='category-trigger'
        >
          {value === 'SKIP' ? (
            <div className='flex items-center min-w-0 text-gonuts-bad dark:text-gonuts-bad'>
              <div className='flex h-6 w-6 items-center justify-center rounded-full mr-3 shrink-0 bg-gonuts-bad/10 dark:bg-gonuts-bad/40 text-gonuts-bad dark:text-gonuts-bad'>
                <div className='h-2 w-3 bg-current rounded-sm' />
              </div>
              <span className='truncate'>
                {t('import.skip_ignore', 'Ignore / Skip')}
              </span>
            </div>
          ) : selectedCategory ? (
            <div className='flex items-center gap-2.5 min-w-0'>
              {renderCategoryIcon(
                selectedCategory.icon,
                selectedCategory.color,
                'sm',
              )}
              <span className='truncate'>{selectedCategory.name}</span>
            </div>
          ) : (
            t('select_category')
          )}
          <ChevronsUpDown className='ml-2 h-4 w-4 shrink-0 opacity-50' />
        </Button>
        )}
      </PopoverTrigger>
      )}
      <PopoverContent className='w-[300px] p-0 shadow-xl' align='start'>
        <div className='h-[400px] flex flex-col'>{Content}</div>
      </PopoverContent>
    </Popover>
  );
}
