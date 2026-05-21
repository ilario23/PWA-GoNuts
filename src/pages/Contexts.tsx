import { useState, useMemo } from "react";
import { useContexts } from "@/hooks/useContexts";
import { useLiveQuery } from "dexie-react-hooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FilterX, Tag, Eye, EyeOff, Info } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Context, db } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SwipeableItem } from "@/components/ui/SwipeableItem";
import { ContextFormDialog } from "@/components/contexts/ContextFormDialog";
import { ContextDetailDrawer } from "@/components/contexts/ContextDetailDrawer";
import { ContextFormValues } from "@/lib/schemas";
import { useSettings } from "@/hooks/useSettings";
import { cn } from "@/lib/utils";

const CONTEXT_COLORS = [
  "#E66A3C",
  "#2F9E5A",
  "#4F82D9",
  "#9B5CF6",
  "#F59E0B",
  "#EC4899",
  "#06B6D4",
  "#84CC16",
];

function contextColor(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return CONTEXT_COLORS[Math.abs(hash) % CONTEXT_COLORS.length];
}

function getCurrencySymbol(code: string): string {
  return (
    new Intl.NumberFormat("en", { style: "currency", currency: code })
      .formatToParts(0)
      .find((p) => p.type === "currency")?.value ?? code
  );
}

export function ContextsPage() {
  const { contexts, addContext, updateContext, deleteContext } = useContexts();
  const { user } = useAuth();
  const { t } = useTranslation();
  const { settings } = useSettings();
  const currencySymbol = getCurrencySymbol(settings?.currency ?? "EUR");

  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteDescription, setDeleteDescription] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [showInactive, setShowInactive] = useState(false);
  const [selectedContext, setSelectedContext] = useState<Context | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const contextTxStats = useLiveQuery(async () => {
    const txs = await db.transactions.filter((t) => !!t.context_id).toArray();
    const map: Record<string, { count: number; total: number }> = {};
    for (const tx of txs) {
      if (!tx.context_id) continue;
      if (!map[tx.context_id]) map[tx.context_id] = { count: 0, total: 0 };
      map[tx.context_id].count++;
      if (tx.type === "expense") map[tx.context_id].total += tx.amount;
    }
    return map;
  });

  const handleOpenDetail = (context: Context) => {
    setSelectedContext(context);
    setDetailOpen(true);
  };

  const handleFormSubmit = async (data: ContextFormValues) => {
    if (!user) return;
    if (editingId) {
      await updateContext(editingId, {
        name: data.name,
        description: data.description || "",
        active: data.active,
      });
    } else {
      await addContext({
        user_id: user.id,
        name: data.name,
        description: data.description || "",
        active: data.active !== undefined ? data.active : true,
      });
    }
    setIsOpen(false);
    setEditingId(null);
  };

  const handleEdit = (context: Context) => {
    setEditingId(context.id);
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setIsOpen(true);
  };

  const handleDeleteClick = async (id: string) => {
    setDeletingId(id);
    const count = await db.transactions.where("context_id").equals(id).count();
    if (count > 0) {
      setDeleteDescription(
        t("context_delete_warning_count", { count }) ||
          `Careful! This context is used in ${count} transactions. Deleting it will detach it from these transactions.`
      );
    } else {
      setDeleteDescription("");
    }
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (deletingId) {
      deleteContext(deletingId);
      setDeletingId(null);
    }
  };

  const filteredContexts = useMemo(() => {
    if (!contexts) return [];
    let res = contexts;
    if (!showInactive) res = res.filter((c) => c.active !== 0);
    if (searchQuery)
      res = res.filter((c) =>
        c.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    return res;
  }, [contexts, searchQuery, showInactive]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold tracking-tight">{t("contexts")}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setShowInactive(!showInactive)}
            className="h-9 w-9 text-muted-foreground"
            title={showInactive ? t("hide_archived") : t("show_archived")}
          >
            {showInactive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </Button>
          <Button
            onClick={openNew}
            size="sm"
            className="gap-1.5 bg-[hsl(var(--gonuts-orange))] hover:bg-[hsl(var(--gonuts-orange))]/90 text-white"
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">{t("add_context")}</span>
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder={t("search_contexts") || "Search contexts..."}
          className="pl-9 pr-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <FilterX className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Info card */}
      <Card>
        <CardContent className="p-4 flex gap-3">
          <Info className="h-4 w-4 text-muted-foreground shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="text-sm font-semibold">{t("what_are_contexts")}</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              {t("what_are_contexts_desc")}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Context list */}
      {!filteredContexts || filteredContexts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("no_contexts")}</h3>
            <p className="text-muted-foreground text-sm text-center max-w-xs">
              {t("no_contexts_desc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filteredContexts.map((c) => {
            const stats = contextTxStats?.[c.id];
            const count = stats?.count ?? 0;
            const total = stats?.total ?? 0;
            const color = contextColor(c.id);
            const inactive = c.active === 0;

            return (
              <SwipeableItem
                key={c.id}
                onEdit={() => handleEdit(c)}
                onDelete={() => handleDeleteClick(c.id)}
                onClick={() => handleOpenDetail(c)}
              >
                <Card
                  className={cn(
                    "overflow-hidden cursor-pointer transition-all duration-150 active:scale-[0.99]",
                    inactive && "opacity-50"
                  )}
                  onClick={() => handleOpenDetail(c)}
                >
                  <CardContent className="p-0 flex items-center gap-3">
                    {/* Colored left bar */}
                    <div
                      className="w-2 self-stretch shrink-0 rounded-l-[var(--radius)]"
                      style={{ backgroundColor: color }}
                    />

                    {/* Content */}
                    <div className="flex-1 min-w-0 py-4 pr-4">
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{c.name}</p>
                          <p className="text-xs text-muted-foreground truncate mt-0.5">
                            {c.description
                              ? `${c.description} · ${count} ${t("tagged")}`
                              : `${count} ${t("tagged")}`}
                          </p>
                        </div>

                        {/* Stats */}
                        <div className="text-right shrink-0">
                          <p className="num text-sm font-semibold tabular-nums">
                            {currencySymbol}{Math.round(total).toLocaleString()}
                          </p>
                          <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-medium">
                            {t("spent")}
                          </p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </SwipeableItem>
            );
          })}
        </div>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_context") || t("confirm_delete")}
        description={
          deleteDescription ||
          t("confirm_delete_context_description") ||
          t("confirm_delete_description")
        }
      />

      <ContextFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        initialData={(() => {
          const ctx = contexts?.find((c) => c.id === editingId);
          if (!ctx) return null;
          return { ...ctx, active: ctx.active === 1 };
        })()}
        onSubmit={handleFormSubmit}
      />

      <ContextDetailDrawer
        context={selectedContext}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
}
