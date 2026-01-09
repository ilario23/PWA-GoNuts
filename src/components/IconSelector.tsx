import * as React from "react";
import { useMobile } from "@/hooks/useMobile";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { AVAILABLE_ICONS, getIconComponent } from "@/lib/icons";
import { ChevronDown, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

interface IconSelectorProps {
    value: string;
    onChange: (value: string) => void;
}

export function IconSelector({ value, onChange }: IconSelectorProps) {
    const { t } = useTranslation();
    const isMobile = useMobile();
    const [open, setOpen] = React.useState(false);
    const [search, setSearch] = React.useState("");

    const filteredIcons = React.useMemo(() => {
        if (!search) return AVAILABLE_ICONS;
        return AVAILABLE_ICONS.filter((item) =>
            item.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [search]);

    const SelectedIcon = value ? getIconComponent(value) : null;

    const TriggerButton = (
        <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-full justify-between"
            data-testid="icon-trigger"
        >
            <div className="flex items-center gap-2">
                {SelectedIcon ? (
                    React.createElement(SelectedIcon, { className: "h-4 w-4" })
                ) : (
                    <span className="text-muted-foreground">{t("select_icon") || "Select Icon"}</span>
                )}
                <span className="truncate">
                    {value || (t("select_icon") || "Select Icon")}
                </span>
            </div>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
    );

    const IconGrid = (
        <div className="space-y-4">
            <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder={t("search_icons") || "Search icons..."}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8"
                    data-testid="icon-search"
                />
            </div>
            <div
                className="grid grid-cols-4 sm:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto p-1"
                data-vaul-no-drag
            >
                {filteredIcons.map((item) => {
                    const Icon = item.icon;
                    const isSelected = value === item.name;
                    return (
                        <button
                            key={item.name}
                            onClick={() => {
                                onChange(item.name);
                                setOpen(false);
                            }}
                            className={cn(
                                "flex flex-col items-center justify-center gap-1 p-2 rounded-md transition-colors hover:bg-accent",
                                isSelected && "bg-accent ring-2 ring-primary"
                            )}
                            data-testid={`icon-option-${item.name}`}
                        >
                            <Icon className="h-6 w-6" />
                            <span className="text-[10px] truncate w-full text-center">
                                {item.name}
                            </span>
                        </button>
                    );
                })}
                {filteredIcons.length === 0 && (
                    <div className="col-span-full text-center py-4 text-sm text-muted-foreground">
                        {t("no_icons_found") || "No icons found"}
                    </div>
                )}
            </div>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={setOpen}>
                <DrawerTrigger asChild>{TriggerButton}</DrawerTrigger>
                <DrawerContent>
                    <DrawerHeader>
                        <DrawerTitle>{t("select_icon") || "Select Icon"}</DrawerTitle>
                    </DrawerHeader>
                    <div className="p-4 pb-8">{IconGrid}</div>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>{TriggerButton}</PopoverTrigger>
            <PopoverContent className="w-[300px] p-4" align="start">
                {IconGrid}
            </PopoverContent>
        </Popover>
    );
}
