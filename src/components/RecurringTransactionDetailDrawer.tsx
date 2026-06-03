import {useTranslation} from 'react-i18next';
import {RecurringTransaction, Category, Context, Group} from '@/lib/db';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
  DrawerDescription,
} from '@/components/ui/drawer';
import {
  format,
  parseISO,
  startOfDay,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  isAfter,
  isSameDay,
} from 'date-fns';
import {it, enUS} from 'date-fns/locale';
import {Cloud, CloudOff} from 'lucide-react';
import {DetailDrawerActions} from '@/components/ui/DetailDrawerActions';
import {
  DetailHeader,
  DetailEyebrow,
  DetailIcon,
  DetailAmount,
  DetailTitle,
  TypePill,
  MetaPill,
  DetailGrid,
  DetailCell,
  DetailMeta,
} from '@/components/ui/DetailDrawerLayout';

interface RecurringTransactionDetailDrawerProps {
  transaction: RecurringTransaction | null;
  category?: Category;
  context?: Context;
  group?: Group;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit?: (transaction: RecurringTransaction) => void;
  onDelete?: (id: string) => void;
}

export function RecurringTransactionDetailDrawer({
  transaction,
  category,
  context,
  group,
  open,
  onOpenChange,
  onEdit,
  onDelete,
}: RecurringTransactionDetailDrawerProps) {
  const {t, i18n} = useTranslation();

  if (!transaction) return null;

  const sign =
    transaction.type === 'expense'
      ? '-'
      : transaction.type === 'investment'
        ? ''
        : '+';

  const getNextOccurrence = (startDateStr: string, frequency: string) => {
    const startDate = parseISO(startDateStr);
    const today = startOfDay(new Date());

    if (isAfter(startDate, today) || isSameDay(startDate, today)) {
      return format(startDate, 'EEEE d MMMM yyyy', {
        locale: i18n.language === 'it' ? it : enUS,
      });
    }

    let nextDate = startDate;
    while (isAfter(today, nextDate)) {
      switch (frequency) {
        case 'daily':
          nextDate = addDays(nextDate, 1);
          break;
        case 'weekly':
          nextDate = addWeeks(nextDate, 1);
          break;
        case 'monthly':
          nextDate = addMonths(nextDate, 1);
          break;
        case 'yearly':
          nextDate = addYears(nextDate, 1);
          break;
        default:
          return startDateStr;
      }
    }
    return format(nextDate, 'EEEE d MMMM yyyy', {
      locale: i18n.language === 'it' ? it : enUS,
    });
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <div className='mx-auto w-full max-w-sm pb-2'>
          <DrawerHeader className='sr-only'>
            <DrawerTitle>{transaction.description}</DrawerTitle>
            <DrawerDescription>{t('frequency')}</DrawerDescription>
          </DrawerHeader>

          <DetailHeader>
            <DetailEyebrow>
              <DetailIcon iconName={category?.icon} color={category?.color} />
              <TypePill type={transaction.type} label={t(transaction.type)} />
              <MetaPill label={t(transaction.frequency)} />
            </DetailEyebrow>

            <DetailAmount type={transaction.type}>
              {sign}€{transaction.amount.toFixed(2)}
            </DetailAmount>

            <DetailTitle>{transaction.description}</DetailTitle>
          </DetailHeader>

          <DetailGrid>
            <DetailCell
              label={t('next_occurrence')}
              valueClassName='capitalize'
            >
              {getNextOccurrence(transaction.start_date, transaction.frequency)}
            </DetailCell>

            <DetailCell label={t('category')}>
              {category?.name || '-'}
            </DetailCell>

            {context && (
              <DetailCell label={t('context')} valueClassName='text-primary'>
                {context.name}
              </DetailCell>
            )}

            {group && (
              <DetailCell
                label={t('group')}
                valueClassName='text-[hsl(var(--color-investment))]'
              >
                {group.name}
              </DetailCell>
            )}

            {transaction.created_at && (
              <DetailCell
                label={t('created_at') || 'Created At'}
                valueClassName='capitalize'
              >
                {format(parseISO(transaction.created_at), 'd MMMM yyyy', {
                  locale: i18n.language === 'it' ? it : enUS,
                })}
              </DetailCell>
            )}
          </DetailGrid>

          <DetailMeta>
            {transaction.pendingSync === 1 ? (
              <>
                <CloudOff className='h-3.5 w-3.5' />
                {t('pending_sync') || t('status')}
              </>
            ) : (
              <>
                <Cloud className='h-3.5 w-3.5 text-[hsl(var(--gonuts-good))]' />
                {t('synced')}
              </>
            )}
          </DetailMeta>

          {(onEdit || onDelete) && (
            <DetailDrawerActions
              onClose={() => onOpenChange(false)}
              onEdit={() => onEdit?.(transaction)}
              onDelete={() => onDelete?.(transaction.id)}
            />
          )}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
