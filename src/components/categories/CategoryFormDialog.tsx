import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "@/components/ui/dialog";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";

import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ListFilter, SlidersHorizontal, ChevronUp } from "lucide-react";
import { CategorySelector } from "@/components/CategorySelector";
import { IconSelector } from "@/components/IconSelector";
import { useTranslation } from "react-i18next";
import { Group } from "@/lib/db";

interface CategoryFormData {
    name: string;
    color: string;
    type: "income" | "expense" | "investment";
    icon: string;
    parent_id: string;
    active: boolean;
    budget: string;
    group_id: string;
}

interface CategoryFormDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    editingId: string | null;
    formData: CategoryFormData;
    setFormData: React.Dispatch<React.SetStateAction<CategoryFormData>>;
    activeSection: string;
    setActiveSection: React.Dispatch<React.SetStateAction<string>>;
    groups: Group[];
    onSubmit: (e: React.FormEvent) => void;
}

export function CategoryFormDialog({
    open,
    onOpenChange,
    editingId,
    formData,
    setFormData,
    activeSection,
    setActiveSection,
    groups,
    onSubmit,
}: CategoryFormDialogProps) {
    const { t } = useTranslation();

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[600px] w-[95vw] rounded-lg">
                <DialogHeader>
                    <DialogTitle>
                        {editingId ? t("edit_category") : t("add_category")}
                    </DialogTitle>
                    <DialogDescription className="sr-only">
                        {editingId
                            ? t("edit_category_description")
                            : t("add_category_description")}
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={onSubmit} className="space-y-4">
                    <Accordion
                        type="single"
                        collapsible
                        value={activeSection}
                        onValueChange={(value) => setActiveSection(value || "main")}
                        className="w-full"
                    >
                        <AccordionItem value="main" className="border-b-0">
                            <AccordionTrigger className="hidden">
                                <span className="flex items-center gap-2">
                                    <ListFilter className="h-4 w-4" />
                                    {t("category_details")}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2 px-1">
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
                                    <label className="text-sm font-medium">{t("color")}</label>
                                    <div className="flex gap-2">
                                        <Input
                                            type="color"
                                            value={formData.color}
                                            onChange={(e) =>
                                                setFormData({ ...formData, color: e.target.value })
                                            }
                                            className="h-10 w-20 p-1"
                                        />
                                        <Input
                                            value={formData.color}
                                            onChange={(e) =>
                                                setFormData({ ...formData, color: e.target.value })
                                            }
                                            className="flex-1"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("type")}</label>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "expense"
                                                ? "bg-red-500 hover:bg-red-600 text-white"
                                                : ""
                                                }`}
                                            onClick={() =>
                                                setFormData({ ...formData, type: "expense" })
                                            }
                                        >
                                            {t("expense")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "income"
                                                ? "bg-green-500 hover:bg-green-600 text-white"
                                                : ""
                                                }`}
                                            onClick={() =>
                                                setFormData({ ...formData, type: "income" })
                                            }
                                        >
                                            {t("income")}
                                        </Button>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            className={`w-full ${formData.type === "investment"
                                                ? "bg-blue-500 hover:bg-blue-600 text-white"
                                                : ""
                                                }`}
                                            onClick={() =>
                                                setFormData({ ...formData, type: "investment" })
                                            }
                                        >
                                            {t("investment")}
                                        </Button>
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">{t("icon")}</label>
                                    <IconSelector
                                        value={formData.icon}
                                        onChange={(icon) => setFormData({ ...formData, icon })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-medium">
                                        {t("parent_category")}
                                    </label>
                                    <CategorySelector
                                        value={formData.parent_id}
                                        onChange={(value) =>
                                            setFormData({ ...formData, parent_id: value })
                                        }
                                        type={formData.type}
                                        excludeId={editingId || undefined}
                                        groupId={formData.group_id || null}
                                        modal
                                    />
                                </div>
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="more" className="border-b-0 border-t">
                            <AccordionTrigger className="py-2 hover:no-underline text-sm font-medium">
                                <span className="flex items-center gap-2">
                                    {activeSection === "more" ? (
                                        <>
                                            <ChevronUp className="h-4 w-4" />
                                            {t("back_to_details")}
                                        </>
                                    ) : (
                                        <>
                                            <SlidersHorizontal className="h-4 w-4" />
                                            {(() => {
                                                const groupName = formData.group_id
                                                    ? groups?.find(g => g.id === formData.group_id)?.name
                                                    : null;

                                                return groupName || t("personal_category");
                                            })()}
                                        </>
                                    )}
                                </span>
                            </AccordionTrigger>
                            <AccordionContent className="space-y-4 pt-2 px-1">
                                {/* Group Selection */}
                                {groups.length > 0 && (
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">{t("group")}</label>
                                        <Select
                                            value={formData.group_id || "none"}
                                            onValueChange={(value) =>
                                                setFormData({
                                                    ...formData,
                                                    group_id: value === "none" ? "" : value,
                                                })
                                            }
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={t("select_group")} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="none">
                                                    {t("personal_category")}
                                                </SelectItem>
                                                {groups.map((group) => (
                                                    <SelectItem key={group.id} value={group.id}>
                                                        {group.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    </div>
                                )}

                                {/* Budget and Active fields */}
                                <div className="space-y-4">
                                    {/* Budget field - only for expense categories */}
                                    {formData.type === "expense" && (
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">
                                                {t("budget")}
                                            </label>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                min="0"
                                                value={formData.budget}
                                                onChange={(e) => {
                                                    const value = e.target.value;
                                                    if (value === "" || parseFloat(value) >= 0) {
                                                        setFormData({
                                                            ...formData,
                                                            budget: value,
                                                        });
                                                    }
                                                }}
                                                placeholder="0.00"
                                            />
                                        </div>
                                    )}

                                    {/* Active toggle */}
                                    <div className="flex items-center justify-between rounded-lg border p-3 shadow-sm">
                                        <div className="space-y-0.5">
                                            <label
                                                htmlFor="active-mode"
                                                className="text-sm font-medium"
                                            >
                                                {t("active")}
                                            </label>
                                            <div className="text-[0.8rem] text-muted-foreground">
                                                {t("active_description")}
                                            </div>
                                        </div>
                                        <Switch
                                            id="active-mode"
                                            checked={formData.active}
                                            onCheckedChange={(checked) =>
                                                setFormData({ ...formData, active: checked })
                                            }
                                        />
                                    </div>
                                </div>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>

                    <Button type="submit" className="w-full" autoFocus>
                        {t("save")}
                    </Button>
                </form>
            </DialogContent>
        </Dialog>
    );
}
