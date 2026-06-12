import {useState, useEffect, useRef, useCallback, createElement} from 'react';
import {useTranslation} from 'react-i18next';
import {useAuth} from '@/contexts/AuthProvider';
import {useGroups} from '@/hooks/useGroups';
import {useContexts} from '@/hooks/useContexts';
import {useCategories} from '@/hooks/useCategories';
import {getLocalDate, cn} from '@/lib/utils';
import {useIsMobile} from '@/hooks/use-mobile';
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {CategorySelector} from '@/components/CategorySelector';
import {Calculator} from '@/components/Calculator';
import {Collapsible, CollapsibleContent} from '@/components/ui/collapsible';
import {
  X,
  Calendar,
  Tag,
  Users,
  Folder,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  TrendingUp,
  Calculator as CalculatorIcon,
} from 'lucide-react';
import {useCategoryBudgets} from '@/hooks/useCategoryBudgets';
import {useForm} from 'react-hook-form';
import {zodResolver} from '@hookform/resolvers/zod';
import {transactionSchema, TransactionFormValues} from '@/lib/schemas';
import {useRecentCategoryUsage} from '@/hooks/useRecentCategoryUsage';
import {useSettings} from '@/hooks/useSettings';
import {getIconComponent} from '@/lib/icons';

export type TransactionFormData = TransactionFormValues;

interface TransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TransactionFormValues) => Promise<void>;
  editingTransaction?: {
    id: string;
    amount: number;
    description: string;
    type: 'income' | 'expense' | 'investment';
    category_id: string;
    date: string;
    context_id?: string | null;
    group_id?: string | null;
    paid_by_member_id?: string | null;
  } | null;
  defaultGroupId?: string | null;
  defaultType?: 'income' | 'expense' | 'investment';
  initialData?: Partial<TransactionFormValues>;
}

const CONTEXT_COLORS = [
  '#E66A3C','#2F9E5A','#4F82D9','#9B5CF6',
  '#F59E0B','#EC4899','#06B6D4','#84CC16',
];

function hashColor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = ((h << 5) - h) + id.charCodeAt(i);
    h |= 0;
  }
  return CONTEXT_COLORS[Math.abs(h) % CONTEXT_COLORS.length];
}

function getCurrencySymbol(code: string): string {
  return (
    new Intl.NumberFormat('en', {style: 'currency', currency: code})
      .formatToParts(0)
      .find((p) => p.type === 'currency')?.value ?? code
  );
}

function formatDateShort(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {month: 'short', day: 'numeric'});
}

export function TransactionDialog({
  open,
  onOpenChange,
  onSubmit,
  editingTransaction,
  defaultGroupId = null,
  defaultType = 'expense',
  initialData,
}: TransactionDialogProps) {
  const {t} = useTranslation();
  const isMobile = useIsMobile();
  const {user} = useAuth();
  const {groups} = useGroups();
  const {contexts} = useContexts();
  const {categories} = useCategories(undefined);
  const {settings} = useSettings();
  const currencySymbol = getCurrencySymbol(settings?.currency ?? 'EUR');

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [contextPickerOpen, setContextPickerOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  const [showCalc, setShowCalc] = useState(false);
  const [calcState, setCalcState] = useState<{
    prevValue: number | null;
    operation: string | null;
    awaitingOperand: boolean;
  }>({prevValue: null, operation: null, awaitingOperand: false});

  // Keeps the numeric keyboard open after tapping a calculator button, which
  // would otherwise blur the input and dismiss the keyboard on iOS.
  const amountInputRef = useRef<HTMLInputElement>(null);
  const refocusAmount = () => amountInputRef.current?.focus();

  // iOS positions `position: fixed` elements against the layout viewport, so a
  // bottom-anchored sheet does not follow the visual viewport when the on-screen
  // keyboard opens/closes — leaving a gap below it. Pin the sheet to the visual
  // viewport instead.
  const [viewport, setViewport] = useState<{inset: number; maxHeight: number} | null>(null);
  useEffect(() => {
    if (!open || !isMobile) return;
    const vv = window.visualViewport;
    if (!vv) return;
    const update = () => {
      const inset = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
      const keyboardOpen = inset > 4;
      const maxHeight = Math.round(keyboardOpen ? vv.height - 8 : vv.height * 0.92);
      setViewport({inset, maxHeight});
    };
    update();
    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    return () => {
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      setViewport(null);
    };
  }, [open, isMobile]);

  const [showLargeValueConfirm, setShowLargeValueConfirm] = useState(false);
  const [pendingData, setPendingData] = useState<TransactionFormValues | null>(null);

  const categoryUsage = useRecentCategoryUsage();
  const {getBudgetForCategory} = useCategoryBudgets();

  const form = useForm<TransactionFormValues>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(transactionSchema) as any,
    defaultValues: {
      amount: '' as unknown as number,
      description: '',
      type: defaultType,
      category_id: '',
      date: getLocalDate(),
      context_id: null,
      group_id: defaultGroupId,
      paid_by_member_id: null,
    },
  });

  useEffect(() => {
    if (open) {
      if (editingTransaction) {
        form.reset({
          amount: editingTransaction.amount,
          description: editingTransaction.description || '',
          type: editingTransaction.type,
          category_id: editingTransaction.category_id || '',
          date: editingTransaction.date,
          context_id: editingTransaction.context_id || null,
          group_id: editingTransaction.group_id || null,
          paid_by_member_id: editingTransaction.paid_by_member_id || null,
        });
      } else if (initialData) {
        form.reset({
          amount: initialData.amount ?? ('' as unknown as number),
          description: initialData.description ?? '',
          type: initialData.type ?? defaultType,
          category_id: initialData.category_id ?? '',
          date: initialData.date ?? getLocalDate(),
          context_id: initialData.context_id ?? null,
          group_id: initialData.group_id ?? defaultGroupId,
          paid_by_member_id: initialData.paid_by_member_id ?? null,
        });
      } else {
        form.reset({
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          amount: '' as any,
          description: '',
          type: defaultType,
          category_id: '',
          date: getLocalDate(),
          context_id: null,
          group_id: defaultGroupId,
          paid_by_member_id: null,
        });
      }
      setCalcState({prevValue: null, operation: null, awaitingOperand: false});
      setShowCalc(false);
      setCategoryOpen(false);
      setContextPickerOpen(false);
      setGroupPickerOpen(false);
    }
  }, [open, editingTransaction, defaultGroupId, defaultType, form, initialData]);

  const watchedType = form.watch('type');
  const watchedGroupId = form.watch('group_id');
  const watchedCategoryId = form.watch('category_id');
  const watchedAmount = form.watch('amount');
  const watchedDate = form.watch('date');
  const watchedContextId = form.watch('context_id');
  const watchedDescription = form.watch('description');

  const previousTypeRef = useRef(watchedType);

  const getDefaultPaidByMemberId = useCallback(
    (groupId: string | null): string | null => {
      if (!groupId || !groups || groups.length === 0) return null;
      const group = groups.find((g) => g.id === groupId);
      if (!group || group.members.length === 0) return null;
      const myMember = user?.id ? group.members.find((m) => m.user_id === user.id) : null;
      return myMember?.id || group.members[0].id;
    },
    [groups, user?.id],
  );

  useEffect(() => {
    const currentPaidBy = form.getValues('paid_by_member_id');
    if (open && !editingTransaction && watchedGroupId && !currentPaidBy && user?.id && groups) {
      const defaultMemberId = getDefaultPaidByMemberId(watchedGroupId);
      if (defaultMemberId) form.setValue('paid_by_member_id', defaultMemberId);
    }
  }, [open, editingTransaction, watchedGroupId, groups, user?.id, form, getDefaultPaidByMemberId]);

  useEffect(() => {
    const hasTypeChanged = previousTypeRef.current !== watchedType;
    previousTypeRef.current = watchedType;
    if (!editingTransaction && hasTypeChanged && form.getValues('category_id')) {
      form.setValue('category_id', '');
    }
  }, [watchedType, editingTransaction, form]);

  useEffect(() => {
    if (editingTransaction === null || editingTransaction === undefined) {
      if (!watchedGroupId) form.setValue('paid_by_member_id', null);
    }
  }, [watchedGroupId, editingTransaction, form]);

  const parseAmount = (val: unknown): number => {
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
      const parsed = Number(val.replace(/,/g, '.'));
      return isNaN(parsed) ? 0 : parsed;
    }
    return 0;
  };

  const computeCalc = (a: number, op: string, b: number): number => {
    let result: number;
    switch (op) {
      case '+':
        result = a + b;
        break;
      case '-':
        result = a - b;
        break;
      case '*':
        result = a * b;
        break;
      case '/':
        result = b === 0 ? a : a / b;
        break;
      default:
        result = b;
    }
    return Math.round(result * 100) / 100;
  };

  const isAmountEmpty = () => {
    const v = watchedAmount as unknown;
    return v === '' || v === null || v === undefined;
  };

  const handleOperation = (op: string) => {
    // Swap the pending operation if the running total is still untouched.
    if (calcState.awaitingOperand) {
      setCalcState((s) => ({...s, operation: op}));
      refocusAmount();
      return;
    }
    // Nothing to operate on yet.
    if (isAmountEmpty() && calcState.prevValue === null) return;
    const current = parseAmount(watchedAmount);
    let prev = current;
    if (calcState.prevValue !== null && calcState.operation) {
      prev = computeCalc(calcState.prevValue, calcState.operation, current);
    }
    setCalcState({prevValue: prev, operation: op, awaitingOperand: true});
    // Clear the operand so it's obvious a second number is expected; the running
    // total stays visible in the hint below the amount.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setValue('amount', '' as any, {shouldValidate: true});
    refocusAmount();
  };

  const handleEqual = () => {
    if (calcState.prevValue === null || !calcState.operation) return;
    const operand = parseAmount(watchedAmount);
    const result = computeCalc(calcState.prevValue, calcState.operation, operand);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setValue('amount', String(result) as any, {shouldValidate: true});
    setCalcState({prevValue: null, operation: null, awaitingOperand: false});
  };

  const handleClear = () => {
    if (isAmountEmpty()) {
      // Nothing to clear in the operand — cancel any pending operation.
      setCalcState({prevValue: null, operation: null, awaitingOperand: false});
      return;
    }
    // Clear the operand but keep the pending operation so a new operand can be typed.
    setCalcState((s) => ({...s, awaitingOperand: false}));
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    form.setValue('amount', '' as any, {shouldValidate: true});
    refocusAmount();
  };

  const toggleCalc = () => {
    setShowCalc((prev) => {
      const next = !prev;
      // Closing the calculator cancels any pending operation (keeps the shown amount).
      if (!next) setCalcState({prevValue: null, operation: null, awaitingOperand: false});
      return next;
    });
  };

  const finalSubmit = async (data: TransactionFormValues) => {
    const finalData = {...data};
    if (finalData.group_id && !finalData.paid_by_member_id && groups && user?.id) {
      const group = groups.find((g) => g.id === finalData.group_id);
      const member = group?.members.find((m) => m.user_id === user.id);
      if (member) finalData.paid_by_member_id = member.id;
    }
    await onSubmit(finalData);
    onOpenChange(false);
  };

  const handleFormSubmit = (data: TransactionFormValues) => {
    if (data.amount > 5000) {
      setPendingData(data);
      setShowLargeValueConfirm(true);
      return;
    }
    finalSubmit(data);
  };

  const confirmLargeValue = () => {
    if (pendingData) {
      finalSubmit(pendingData);
      setPendingData(null);
      setShowLargeValueConfirm(false);
    }
  };

  // Derived display values
  const selectedCat = categories?.find((c) => c.id === watchedCategoryId) ?? null;
  const selectedCatIcon = selectedCat?.icon ? getIconComponent(selectedCat.icon) : null;
  const selectedCtx = contexts?.find((c) => c.id === watchedContextId) ?? null;
  const selectedGroup = groups?.find((g) => g.id === watchedGroupId) ?? null;
  const amountNum = parseAmount(watchedAmount);
  const canSave =
    amountNum > 0 &&
    !!watchedCategoryId &&
    !!watchedDescription?.trim() &&
    !!watchedDate;

  // First missing field, so the disabled Save isn't a silent dead end.
  const missingHint = canSave
    ? null
    : amountNum <= 0
      ? t('hint_enter_amount', {defaultValue: 'Enter an amount'})
      : !watchedCategoryId
        ? t('hint_choose_category', {defaultValue: 'Choose a category'})
        : !watchedDescription?.trim()
          ? t('hint_add_description', {defaultValue: 'Add a description'})
          : null;

  const typeConfig = {
    expense: {
      label: t('expense'),
      icon: ArrowUpRight,
      activeClass: 'bg-[hsl(var(--gonuts-bad))] text-white',
    },
    income: {
      label: t('income'),
      icon: ArrowDownLeft,
      activeClass: 'bg-[hsl(var(--gonuts-good))] text-white',
    },
    investment: {
      label: t('investment'),
      icon: TrendingUp,
      activeClass: 'bg-blue-600 text-white',
    },
  } as const;

  const amountColor =
    watchedType === 'income'
      ? 'hsl(var(--gonuts-good))'
      : watchedType === 'investment'
        ? 'hsl(217 92% 58%)'
        : 'hsl(var(--foreground))';

  const formHeader = (
    <>
      <button
        type='button'
        onClick={() => onOpenChange(false)}
        className='h-9 w-9 rounded-full bg-muted flex items-center justify-center text-foreground'
      >
        <X className='h-4 w-4' />
      </button>
      <span className='text-xs font-bold uppercase tracking-widest text-muted-foreground'>
        {editingTransaction ? t('edit_transaction') : t('new_transaction', {defaultValue: 'New transaction'})}
      </span>
      <div className='w-9' />
    </>
  );

  const formBody = (
    <div className='flex-1 overflow-y-auto overflow-x-hidden flex flex-col min-h-0'>
            {/* Type segmented */}
            <div className='px-5 pb-4 shrink-0'>
              <div className='grid grid-cols-3 rounded-[14px] bg-muted p-1 gap-1'>
                {(['expense', 'income', 'investment'] as const).map((tp) => {
                  const cfg = typeConfig[tp];
                  const Icon = cfg.icon;
                  return (
                    <button
                      key={tp}
                      type='button'
                      onClick={() => form.setValue('type', tp, {shouldValidate: true})}
                      className={cn(
                        'py-2 px-1 rounded-[10px] text-xs font-bold transition-all flex items-center justify-center gap-1',
                        watchedType === tp ? cfg.activeClass : 'text-muted-foreground',
                      )}
                    >
                      <Icon className='h-3 w-3 shrink-0' />
                      {cfg.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Amount */}
            <div className='relative text-center px-5 pb-1 shrink-0'>
              <div className='inline-flex items-baseline gap-1'>
                <span className='text-3xl font-bold text-muted-foreground'>{currencySymbol}</span>
                <input
                  ref={amountInputRef}
                  type='text'
                  inputMode='decimal'
                  aria-label={t('amount')}
                  placeholder='0'
                  value={String((watchedAmount as unknown) ?? '')}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === '' || /^[0-9]*([.,][0-9]{0,2})?$/.test(v)) {
                      // First keystroke after an operation starts the new operand.
                      if (calcState.awaitingOperand) {
                        setCalcState((s) => ({...s, awaitingOperand: false}));
                      }
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      form.setValue('amount', v as any, {shouldValidate: true});
                    }
                  }}
                  className='num bg-transparent border-0 outline-none text-[52px] font-extrabold leading-none w-[min(220px,60vw)] text-center'
                  style={{color: amountNum > 0 ? amountColor : 'hsl(var(--muted-foreground))'}}
                />
              </div>
              {calcState.prevValue !== null && calcState.operation && (
                <div className='text-xs text-muted-foreground font-mono mt-1'>
                  {calcState.prevValue}{' '}
                  {calcState.operation === '/' ? '÷' : calcState.operation === '*' ? '×' : calcState.operation}
                </div>
              )}
              <button
                type='button'
                onMouseDown={(e) => e.preventDefault()}
                onClick={toggleCalc}
                aria-label={t('calculator', {defaultValue: 'Calculator'})}
                aria-pressed={showCalc}
                className={cn(
                  'absolute right-5 top-1 h-9 w-9 rounded-full flex items-center justify-center transition-colors active:scale-95',
                  showCalc ? 'bg-foreground text-background' : 'bg-muted text-muted-foreground',
                )}
              >
                <CalculatorIcon className='h-4 w-4' />
              </button>
            </div>

            {/* Calculator */}
            <Collapsible open={showCalc} className='shrink-0'>
              <CollapsibleContent>
                <div className='px-5 pb-4 pt-1'>
                  <Calculator
                    activeOperation={calcState.operation}
                    onOperation={handleOperation}
                    onEqual={handleEqual}
                    onClear={handleClear}
                  />
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Description */}
            <div className='px-5 pb-5 shrink-0'>
              <input
                type='text'
                aria-label={t('description')}
                placeholder={t('transaction_description_placeholder') || 'What was this for?'}
                value={watchedDescription || ''}
                onChange={(e) => form.setValue('description', e.target.value, {shouldValidate: true})}
                className='w-full text-center text-[17px] font-semibold bg-transparent border-0 outline-none placeholder:text-muted-foreground/40 text-foreground'
              />
            </div>

            {/* Meta selectors: required Category (primary) + optional Date/Context/Group (secondary) */}
            <div className='px-5 pb-4 shrink-0 space-y-2'>
              {/* Category — full-width primary row (required; blocks Save) */}
              <button
                type='button'
                onClick={() => setCategoryOpen(true)}
                className={cn(
                  'w-full flex items-center gap-3 py-3 px-3 rounded-[18px] text-left transition-all active:scale-[0.98]',
                  selectedCat ? 'text-white' : 'bg-foreground text-background',
                )}
                style={selectedCat ? {backgroundColor: selectedCat.color || '#1A1714', color: '#fff'} : undefined}
              >
                <div className='w-8 h-8 rounded-[10px] bg-white/20 flex items-center justify-center shrink-0'>
                  {selectedCatIcon
                    ? createElement(selectedCatIcon, {className: 'h-[18px] w-[18px]'})
                    : <Folder className='h-[18px] w-[18px]' />}
                </div>
                <div className='min-w-0'>
                  <div className='text-[10px] font-bold uppercase tracking-widest opacity-70'>{t('category')}</div>
                  <div className='text-sm font-bold leading-tight truncate'>
                    {selectedCat?.name ?? t('choose', {defaultValue: 'Choose'})}
                  </div>
                </div>
              </button>

              {/* Secondary row: equal-width tiles that self-balance for 1–3 items */}
              <div className='flex gap-2'>
                {/* Date tile (always present) */}
                <div className='relative flex-1 basis-0 min-w-0 flex flex-col gap-1.5 py-3 px-3 rounded-[18px] bg-muted cursor-pointer active:scale-95 transition-all'>
                  <div className='flex items-center gap-1.5 text-muted-foreground'>
                    <Calendar className='h-4 w-4 shrink-0' />
                    <span className='text-[10px] font-bold uppercase tracking-widest'>{t('date')}</span>
                  </div>
                  <div className='text-sm font-bold text-foreground truncate'>{formatDateShort(watchedDate || '')}</div>
                  <input
                    type='date'
                    aria-label={t('date')}
                    className='absolute inset-0 h-full w-full cursor-pointer opacity-0'
                    value={watchedDate || ''}
                    onClick={(e) => {
                      // Native date inputs don't open on a plain focus/label click — force
                      // the picker on every browser (desktop needs the indicator, which is hidden).
                      try {
                        (e.currentTarget as HTMLInputElement & {showPicker?: () => void}).showPicker?.();
                      } catch {
                        /* showPicker can throw if unsupported or not user-activated */
                      }
                    }}
                    onChange={(e) => form.setValue('date', e.target.value, {shouldValidate: true})}
                  />
                </div>

                {/* Context tile */}
                {contexts && contexts.length > 0 && (
                  <button
                    type='button'
                    onClick={() => setContextPickerOpen(true)}
                    className={cn(
                      'flex-1 basis-0 min-w-0 flex flex-col gap-1.5 py-3 px-3 rounded-[18px] text-left transition-all active:scale-95',
                      selectedCtx ? 'border' : 'bg-muted',
                    )}
                    style={
                      selectedCtx
                        ? {backgroundColor: hashColor(selectedCtx.id) + '14', borderColor: hashColor(selectedCtx.id) + '44'}
                        : undefined
                    }
                  >
                    <div
                      className='flex items-center gap-1.5'
                      style={selectedCtx ? {color: hashColor(selectedCtx.id)} : undefined}
                    >
                      <Tag className={cn('h-4 w-4 shrink-0', !selectedCtx && 'text-muted-foreground')} />
                      <span className={cn('text-[10px] font-bold uppercase tracking-widest', !selectedCtx && 'text-muted-foreground')}>{t('context')}</span>
                    </div>
                    <div className='text-sm font-bold text-foreground truncate'>
                      {selectedCtx?.name ?? t('none')}
                    </div>
                  </button>
                )}

                {/* Group tile */}
                {groups && groups.length > 0 && (
                  <button
                    type='button'
                    onClick={() => setGroupPickerOpen(true)}
                    className={cn(
                      'flex-1 basis-0 min-w-0 flex flex-col gap-1.5 py-3 px-3 rounded-[18px] text-left transition-all active:scale-95',
                      selectedGroup ? 'bg-foreground/10' : 'bg-muted',
                    )}
                  >
                    <div className={cn('flex items-center gap-1.5', selectedGroup ? 'text-foreground' : 'text-muted-foreground')}>
                      <Users className='h-4 w-4 shrink-0' />
                      <span className='text-[10px] font-bold uppercase tracking-widest'>{t('group')}</span>
                    </div>
                    <div className='text-sm font-bold text-foreground truncate'>
                      {selectedGroup?.name ?? t('personal_transaction_label')}
                    </div>
                  </button>
                )}
              </div>
            </div>

            {/* Paid by row (when group selected) */}
            {watchedGroupId && selectedGroup && (
              <div className='px-5 pb-3 shrink-0'>
                <label className='text-xs font-semibold text-muted-foreground block mb-1.5'>{t('paid_by')}</label>
                <div className='flex gap-2 overflow-x-auto' style={{scrollbarWidth: 'none'}}>
                  {selectedGroup.members.map((member) => {
                    const isSelected = form.watch('paid_by_member_id') === member.id;
                    const name = member.is_guest
                      ? member.guest_name || 'Guest'
                      : member.user_id === user?.id
                        ? t('me')
                        : member.displayName || member.user_id?.substring(0, 8) || 'Member';
                    return (
                      <button
                        key={member.id}
                        type='button'
                        onClick={() => form.setValue('paid_by_member_id', member.id)}
                        className={cn(
                          'px-3 py-1.5 rounded-full text-sm font-semibold shrink-0 transition-all',
                          isSelected
                            ? 'bg-foreground text-background'
                            : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {name}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Budget feedback */}
            {watchedCategoryId && watchedType === 'expense' && (() => {
              const budget = getBudgetForCategory(watchedCategoryId);
              if (!budget || budget.amount <= 0) return null;
              const amt = parseAmount(watchedAmount);
              let currentSpent = budget.spent;
              if (editingTransaction?.category_id === watchedCategoryId) {
                currentSpent = Math.max(0, currentSpent - editingTransaction.amount);
              }
              const remaining = budget.amount - (currentSpent + amt);
              const isOver = remaining < 0;
              const willBeOver = !budget.isOverBudget && isOver;
              if (budget.isOverBudget || willBeOver) {
                return (
                  <div className='mx-5 mb-3 text-xs font-medium px-3 py-2 rounded-[10px] text-[hsl(var(--gonuts-bad))] bg-[hsl(var(--gonuts-bad))]/10 shrink-0'>
                    {isOver
                      ? t('budget_feedback_exceeded', {amount: Math.abs(remaining).toFixed(2)})
                      : t('budget_feedback_will_exceed', {amount: Math.abs(remaining).toFixed(2)})}
                  </div>
                );
              }
              return (
                <div className='mx-5 mb-3 text-xs font-medium px-3 py-2 rounded-[10px] text-[hsl(var(--gonuts-good))] bg-[hsl(var(--gonuts-good))]/10 shrink-0'>
                  {t('budget_feedback_remaining', {amount: remaining.toFixed(2)})}
                </div>
              );
            })()}

            {/* Spacer */}
            <div className='flex-1 min-h-4' />
          </div>
  );

  const formSaveButton = (
    <div className='px-5 pt-3 pb-5 shrink-0 border-t border-border/40'>
      {missingHint && (
        <p className='text-center text-xs text-muted-foreground mb-2' aria-live='polite'>
          {missingHint}
        </p>
      )}
      <button
        type='button'
        onClick={form.handleSubmit(handleFormSubmit)}
        disabled={!canSave}
        data-testid='save-transaction-button'
        className={cn(
          'w-full h-14 rounded-[18px] flex items-center justify-center gap-2',
          'text-[17px] font-extrabold transition-all',
          canSave
            ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.40)] active:scale-[0.98]'
            : 'bg-muted text-muted-foreground cursor-not-allowed',
        )}
      >
        <Check className='h-5 w-5' />
        {editingTransaction ? t('save_changes') : t('add_transaction')}
      </button>
    </div>
  );

  return (
    <>
      {isMobile ? (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent
            side='bottom'
            hideClose
            className='rounded-t-[28px] p-0 flex flex-col gap-0 max-h-[92dvh] focus:outline-none overflow-hidden'
            style={{
              viewTransitionName: editingTransaction ? undefined : 'add-fab',
              ...(viewport ? {bottom: viewport.inset, maxHeight: viewport.maxHeight} : {}),
            }}
          >
            <SheetTitle className='sr-only'>
              {editingTransaction ? t('edit_transaction') : t('new_transaction', {defaultValue: 'New transaction'})}
            </SheetTitle>
            <SheetDescription className='sr-only'>
              {t('new_transaction', {defaultValue: 'New transaction'})}
            </SheetDescription>
            <div className='mx-auto w-10 h-1 rounded-full bg-muted mt-3 mb-2 shrink-0' />
            <div className='flex items-center justify-between px-5 pb-3 shrink-0'>
              {formHeader}
            </div>
            {formBody}
            <div className='px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom))] shrink-0 border-t border-border/40'>
              {missingHint && (
                <p className='text-center text-xs text-muted-foreground mb-2' aria-live='polite'>
                  {missingHint}
                </p>
              )}
              <button
                type='button'
                onClick={form.handleSubmit(handleFormSubmit)}
                disabled={!canSave}
                data-testid='save-transaction-button'
                className={cn(
                  'w-full h-14 rounded-[18px] flex items-center justify-center gap-2',
                  'text-[17px] font-extrabold transition-all',
                  canSave
                    ? 'bg-primary text-primary-foreground shadow-[0_4px_16px_-2px_hsl(var(--primary)/0.40)] active:scale-[0.98]'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                <Check className='h-5 w-5' />
                {editingTransaction ? t('save_changes') : t('add_transaction')}
              </button>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        <Dialog open={open} onOpenChange={onOpenChange}>
          <DialogContent
            hideClose
            className='p-0 flex flex-col gap-0 max-h-[85dvh] w-full max-w-[460px] focus:outline-none overflow-hidden rounded-[28px] border-0 shadow-2xl'
          >
            <DialogTitle className='sr-only'>
              {editingTransaction ? t('edit_transaction') : t('new_transaction', {defaultValue: 'New transaction'})}
            </DialogTitle>
            <DialogDescription className='sr-only'>
              {t('new_transaction', {defaultValue: 'New transaction'})}
            </DialogDescription>
            <div className='flex items-center justify-between px-5 pb-3 pt-5 shrink-0'>
              {formHeader}
            </div>
            {formBody}
            {formSaveButton}
          </DialogContent>
        </Dialog>
      )}

      {/* Category picker (headless — no trigger rendered) */}
      <CategorySelector
        value={watchedCategoryId || ''}
        onChange={(v) => {
          form.setValue('category_id', v, {shouldValidate: true});
          setCategoryOpen(false);
        }}
        type={watchedType}
        groupId={watchedGroupId}
        modal
        variant='tabs'
        usageFrequency={categoryUsage}
        externalOpen={categoryOpen}
        onExternalOpenChange={setCategoryOpen}
      />

      {/* Context picker drawer */}
      <Drawer open={contextPickerOpen} onOpenChange={setContextPickerOpen}>
        <DrawerContent>
          <DrawerHeader className='text-left'>
            <DrawerTitle>{t('select_context')}</DrawerTitle>
            <DrawerDescription className='sr-only'>{t('select_context')}</DrawerDescription>
          </DrawerHeader>
          <div className='pb-[max(1.5rem,env(safe-area-inset-bottom))]'>
            <button
              className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted text-left transition-colors'
              onClick={() => {form.setValue('context_id', null); setContextPickerOpen(false);}}
            >
              <div className='w-3 h-8 rounded-sm bg-muted-foreground/30' />
              <span className='font-semibold text-muted-foreground'>{t('no_context')}</span>
            </button>
            {contexts
              ?.filter((c) => c.active !== 0 || c.id === watchedContextId)
              .map((ctx) => (
                <button
                  key={ctx.id}
                  className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted text-left transition-colors'
                  onClick={() => {form.setValue('context_id', ctx.id); setContextPickerOpen(false);}}
                >
                  <div className='w-3 h-8 rounded-sm shrink-0' style={{backgroundColor: hashColor(ctx.id)}} />
                  <div>
                    <div className='font-semibold text-sm'>{ctx.name}</div>
                    {ctx.description && (
                      <div className='text-xs text-muted-foreground'>{ctx.description}</div>
                    )}
                  </div>
                  {watchedContextId === ctx.id && <Check className='ml-auto h-4 w-4 text-[hsl(var(--primary))]' />}
                </button>
              ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Group picker drawer */}
      <Drawer open={groupPickerOpen} onOpenChange={setGroupPickerOpen}>
        <DrawerContent>
          <DrawerHeader className='text-left'>
            <DrawerTitle>{t('select_group', {defaultValue: 'Select Group'})}</DrawerTitle>
            <DrawerDescription className='sr-only'>{t('group')}</DrawerDescription>
          </DrawerHeader>
          <div className='pb-[max(1.5rem,env(safe-area-inset-bottom))]'>
            <button
              className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted text-left transition-colors'
              onClick={() => {
                form.setValue('group_id', null);
                form.setValue('paid_by_member_id', null);
                form.setValue('category_id', '');
                setGroupPickerOpen(false);
              }}
            >
              <div className='w-8 h-8 rounded-full bg-muted flex items-center justify-center shrink-0'>
                <Users className='h-4 w-4 text-muted-foreground' />
              </div>
              <span className='font-semibold'>{t('personal_transaction_label')}</span>
              {!watchedGroupId && <Check className='ml-auto h-4 w-4 text-[hsl(var(--primary))]' />}
            </button>
            {groups?.map((group) => (
              <button
                key={group.id}
                className='w-full flex items-center gap-3 px-5 py-3.5 hover:bg-muted text-left transition-colors'
                onClick={() => {
                  const prevGroup = form.getValues('group_id');
                  if (prevGroup !== group.id) form.setValue('category_id', '');
                  form.setValue('group_id', group.id);
                  const defaultMemberId = getDefaultPaidByMemberId(group.id);
                  if (defaultMemberId) form.setValue('paid_by_member_id', defaultMemberId);
                  setGroupPickerOpen(false);
                }}
              >
                <div className='w-8 h-8 rounded-full bg-foreground flex items-center justify-center shrink-0'>
                  <Users className='h-4 w-4 text-background' />
                </div>
                <div>
                  <div className='font-semibold text-sm'>{group.name}</div>
                  {group.description && (
                    <div className='text-xs text-muted-foreground'>{group.description}</div>
                  )}
                </div>
                {watchedGroupId === group.id && <Check className='ml-auto h-4 w-4 text-[hsl(var(--primary))]' />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>

      {/* Large value confirmation */}
      <AlertDialog open={showLargeValueConfirm} onOpenChange={setShowLargeValueConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('confirm_large_transaction_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('confirm_large_transaction_description', {
                amount: pendingData?.amount?.toLocaleString(),
              })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingData(null)}>{t('cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLargeValue}>{t('confirm')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
