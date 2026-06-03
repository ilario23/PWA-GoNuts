import { useTranslation } from "react-i18next";
import { Pencil, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DetailDrawerActionsProps {
  /** Invoked when Edit is pressed (after the drawer is asked to close). */
  onEdit: () => void;
  /** Invoked when Delete is pressed (after the drawer is asked to close). */
  onDelete: () => void;
  /** Closes the containing drawer/dialog. */
  onClose: () => void;
  /** Optional secondary "Duplicate" action, rendered as a full-width ghost row above Edit/Delete. */
  onDuplicate?: () => void;
  /** Optional override labels. */
  editLabel?: string;
  deleteLabel?: string;
  duplicateLabel?: string;
  className?: string;
}

/**
 * Consistent Edit / Delete footer for every entity detail drawer.
 * Edit is the calm primary (ink) action; Delete is a restrained destructive
 * outline — the real safety lives in the confirm dialog Delete routes to.
 */
export function DetailDrawerActions({
  onEdit,
  onDelete,
  onClose,
  onDuplicate,
  editLabel,
  deleteLabel,
  duplicateLabel,
  className,
}: DetailDrawerActionsProps) {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        "mt-2 px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] border-t border-border/40",
        className
      )}
    >
      {onDuplicate && (
        <Button
          variant="ghost"
          className="w-full h-11 rounded-[18px] mb-2 text-[15px] font-medium text-muted-foreground"
          onClick={() => {
            onClose();
            onDuplicate();
          }}
        >
          <Copy className="h-4 w-4 mr-2" />
          {duplicateLabel ?? t("duplicate")}
        </Button>
      )}
      <div className="flex gap-2">
      <Button
        className="flex-1 h-12 rounded-[18px] text-[15px] font-bold"
        onClick={() => {
          onClose();
          onEdit();
        }}
      >
        <Pencil className="h-4 w-4 mr-2" />
        {editLabel ?? t("edit")}
      </Button>
      <Button
        variant="outline"
        className="flex-1 h-12 rounded-[18px] text-[15px] font-bold border-[hsl(var(--gonuts-bad))]/40 text-[hsl(var(--gonuts-bad))] hover:bg-[hsl(var(--gonuts-bad))]/10 hover:text-[hsl(var(--gonuts-bad))]"
        onClick={() => {
          onClose();
          onDelete();
        }}
      >
        <Trash2 className="h-4 w-4 mr-2" />
        {deleteLabel ?? t("delete")}
      </Button>
      </div>
    </div>
  );
}
