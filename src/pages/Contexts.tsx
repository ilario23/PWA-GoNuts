import { useState } from "react";
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
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, Tag, Receipt } from "lucide-react";
import { useAuth } from "@/contexts/AuthProvider";
import { useTranslation } from "react-i18next";
import { DeleteConfirmDialog } from "@/components/DeleteConfirmDialog";
import { motion, useMotionValue, useTransform, PanInfo } from "framer-motion";
import { Context } from "@/lib/db";
import { Card, CardContent } from "@/components/ui/card";

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
  const x = useMotionValue(0);

  const background = useTransform(
    x,
    [-100, 0, 100],
    [
      "rgb(239 68 68)", // Red for delete (left)
      "rgb(255 255 255)", // White (center)
      "rgb(59 130 246)", // Blue for edit (right)
    ]
  );

  const [open, setOpen] = useState(false);

  const handleDragEnd = (_: any, info: PanInfo) => {
    const threshold = 220;
    if (info.offset.x < -threshold) {
      onDelete(context.id);
    } else if (info.offset.x > threshold) {
      onEdit(context);
      setTimeout(() => x.set(0), 300);
    }
  };

  return (
    <div className="relative overflow-hidden rounded-lg mb-2">
      {/* Background Actions Layer */}
      <motion.div
        style={{ backgroundColor: background }}
        className="absolute inset-0 flex items-center justify-between px-4 rounded-lg"
      >
        <div className="flex items-center text-white font-medium">
          <Edit className="h-5 w-5 mr-2" />
          {t("edit")}
        </div>
        <div className="flex items-center text-white font-medium">
          {t("delete")}
          <Trash2 className="h-5 w-5 ml-2" />
        </div>
      </motion.div>

      {/* Foreground Content Layer */}
      <DropdownMenu open={open} onOpenChange={setOpen}>
        <DropdownMenuTrigger asChild>
          <motion.div
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.7}
            onDragEnd={handleDragEnd}
            style={{ x, touchAction: "pan-y" }}
            className="relative bg-card p-3 rounded-lg border shadow-sm flex items-center gap-3 cursor-pointer active:bg-muted/50 focus:outline-none"
          >
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
          </motion.div>
        </DropdownMenuTrigger>
        <DropdownMenuContent side="top" align="end" className="w-[200px]">
          <DropdownMenuItem onClick={() => onSelect(context)}>
            <Receipt className="mr-2 h-4 w-4" />
            <span>{t("view_transactions_context")}</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
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
  const [formData, setFormData] = useState({
    name: "",
    description: "",
  });

  const navigate = useNavigate();

  const handleViewTransactions = (context: Context) => {
    navigate(`/transactions?contextId=${context.id}`);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    if (editingId) {
      await updateContext(editingId, {
        name: formData.name,
        description: formData.description,
      });
    } else {
      await addContext({
        user_id: user.id,
        name: formData.name,
        description: formData.description,
      });
    }
    setIsOpen(false);
    setEditingId(null);
    setFormData({ name: "", description: "" });
  };

  const handleEdit = (context: Context) => {
    setEditingId(context.id);
    setFormData({
      name: context.name,
      description: context.description || "",
    });
    setIsOpen(true);
  };

  const openNew = () => {
    setEditingId(null);
    setFormData({ name: "", description: "" });
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

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t("contexts")}</h1>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button
              onClick={openNew}
              size="icon"
              className="md:w-auto md:px-4 md:h-10"
            >
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">{t("add_context")}</span>
            </Button>
          </DialogTrigger>
          <DialogContent className="w-[95vw] rounded-lg">
            <DialogHeader>
              <DialogTitle>
                {editingId ? t("edit_context") || t("edit") : t("add_context")}
              </DialogTitle>
              <DialogDescription className="sr-only">
                {editingId
                  ? t("edit_context_description") || "Edit context details"
                  : t("add_context_description") || "Add a new context"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">{t("name")}</label>
                <Input
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  {t("description")}
                </label>
                <Input
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                />
              </div>
              <Button type="submit" className="w-full" autoFocus>
                {t("save")}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {!contexts || contexts.length === 0 ? (
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
            {contexts.map((c) => (
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
                {contexts.map((c) => (
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

    </div>
  );
}
