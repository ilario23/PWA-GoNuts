import { useState, useMemo } from "react";
import { useContexts } from "@/hooks/useContexts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Tag, Receipt, Search, FilterX } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { Context } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";
import { SwipeableItem } from "@/components/ui/SwipeableItem";
import { ContextFormDialog } from "@/components/contexts/ContextFormDialog";
import { ContextFormValues } from "@/lib/schemas";

// Mobile swipeable row component for contexts
function MobileContextRow({
  context,
  onEdit,
  onDelete,
  onSelect,
}: {
  context: Context;
  onEdit: (context: Context) => void;
  onDelete: (id: string) => void;
  onSelect: (context: Context) => void;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <span className="hidden" />
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-[200px]">
          <DropdownMenuItem onClick={() => onSelect(context)}>
            <Receipt className="mr-2 h-4 w-4" />
            <span>{t("view_transactions_context")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <SwipeableItem
        onEdit={() => onEdit(context)}
        onDelete={() => onDelete(context.id)}
        onClick={() => setOpen(true)}
      >
        <div className="bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 cursor-pointer active:bg-muted/50 focus:outline-none">
          {/* Icon */}
          <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Tag className="h-5 w-5 text-primary" />
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0 text-left">
            <div className="font-medium text-sm truncate">{context.name}</div>
            {context.description && (
              <div className="text-xs text-muted-foreground truncate">
                {context.description}
              </div>
            )}
          </div>
        </div>
      </SwipeableItem>
    </>
  );
}

export function ContextsPage() {
  const { contexts, addContext, updateContext, deleteContext } = useContexts();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const navigate = useNavigate();

  const handleViewTransactions = (context: Context) => {
    navigate(`/transactions?contextId=${context.id}`);
  };

  const handleFormSubmit = async (data: ContextFormValues) => {
    if (!user) return;

    if (editingId) {
      await updateContext(editingId, {
        name: data.name,
        description: data.description || "",
      });
    } else {
      await addContext({
        user_id: user.id,
        name: data.name,
        description: data.description || "",
      });
    }
    setIsOpen(false);
    setEditingId(null);
  };

  const handleEdit = (context: Context) => {
    setEditingId(context.id);
  };

  const openNew = () => {
    setEditingId(null);
    setIsOpen(true);
  };

  const handleDeleteClick = (id: string) => {
    setDeletingId(id);
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
    if (!searchQuery) return contexts;
    return contexts.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [contexts, searchQuery]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("contexts")}</h1>
        <div className="flex items-center gap-2">
          {/* Search Bar */}
          <div className="relative flex-1 md:flex-none md:w-[250px]">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t("search_contexts") || "Search contexts..."}
              className="pl-8 pr-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <FilterX className="h-4 w-4" />
              </button>
            )}
          </div>

          <Button
            onClick={openNew}
            size="icon"
            className="md:w-auto md:px-4 md:h-10 shrink-0"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">{t("add_context")}</span>
          </Button>
        </div>
      </div>

      {!filteredContexts || filteredContexts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Tag className="h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold">{t("no_contexts")}</h3>
            <p className="text-muted-foreground text-sm">
              {t("no_contexts_desc")}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Mobile View: Swipeable Cards */}
          <div className="space-y-1 md:hidden">
            {filteredContexts.map((c) => (
              <MobileContextRow
                key={c.id}
                context={c}
                onEdit={handleEdit}
                onDelete={handleDeleteClick}
                onSelect={handleViewTransactions}
              />
            ))}
          </div>

          {/* Desktop View: Table */}
          <div className="hidden md:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("name")}</TableHead>
                  <TableHead>{t("description")}</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredContexts.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell>{c.name}</TableCell>
                    <TableCell>{c.description}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          title={t("view_transactions_context")}
                          onClick={() => navigate(`/transactions?contextId=${c.id}`)}
                        >
                          <Receipt className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(c)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(c.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleConfirmDelete}
        title={t("confirm_delete_context") || t("confirm_delete")}
        description={
          t("confirm_delete_context_description") ||
          t("confirm_delete_description")
        }
      />

      <ContextFormDialog
        open={isOpen}
        onOpenChange={setIsOpen}
        initialData={contexts?.find(c => c.id === editingId) || null}
        onSubmit={handleFormSubmit}
      />

    </div>
  );
}
