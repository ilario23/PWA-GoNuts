import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useMediaQuery } from "@/hooks/use-media-query";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Drawer,
    DrawerContent,
    DrawerDescription,
    DrawerTitle,
    DrawerTrigger,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import {
    HelpCircle,
    TouchpadOff,
    WifiOff,
    Trash2,
    LogOut,
    Edit,
    Hand,
    Smartphone,
    ChevronRight,
    ArrowLeft,
    Tags,
    Users,
    MousePointerClick,
    MoreHorizontal,
    Crown,
    Percent,
    RefreshCw,
    Upload,
    Palette,
    User2,
    Moon,
    Sparkles,
    ShieldAlert,
    BarChart3,
    PieChart,
    Activity,
    ArrowLeftRight,
    Wallet,
    Lightbulb,
    EyeOff,
    Cloud,
    Layers
} from "lucide-react";
import { THEME_COLORS } from "@/lib/theme-colors";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// --- Demos ---

function SwipeDemo() {
    const { t } = useTranslation();

    return (
        <div className="bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-xl flex flex-col items-center gap-4 my-2 p-4">
            <p className="text-sm text-muted-foreground mb-2">{t("help.demo_swipe_hint", "Swipe left to delete, right to edit")}</p>

            <div className="relative w-full max-w-[300px] h-[60px] bg-background border rounded-lg overflow-hidden shadow-sm">
                {/* Background Layer */}
                <div className="absolute inset-0 flex items-center justify-between px-4">
                    <div className="flex items-center text-white font-medium bg-blue-500 absolute left-0 top-0 bottom-0 w-1/2 pl-4 rounded-l-lg">
                        <Edit className="h-5 w-5 mr-2" />
                    </div>
                </div>

                <div className="absolute inset-0 flex items-center justify-between px-4">
                    <div className="flex items-center text-white font-medium bg-red-500 absolute right-0 top-0 bottom-0 w-1/2 justify-end pr-4 rounded-r-lg">
                        <Trash2 className="h-5 w-5 ml-2" />
                    </div>
                </div>

                {/* Simulated Swipe Item */}
                <motion.div
                    animate={{
                        x: [0, 80, 0, -80, 0],
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut",
                        times: [0, 0.2, 0.4, 0.6, 1]
                    }}
                    className="absolute inset-0 bg-card flex items-center px-4 border-r border-y rounded-lg z-10"
                >
                    <div className="h-8 w-8 rounded-full bg-primary/20 mr-3" />
                    <div className="flex-1">
                        <div className="h-3 w-24 bg-primary/10 rounded mb-1.5" />
                        <div className="h-2 w-16 bg-muted rounded" />
                    </div>
                    <div className="h-4 w-12 bg-muted rounded" />
                </motion.div>
            </div>

            {/* Hand Indicator */}
            <motion.div
                animate={{
                    x: [0, 60, 0, -60, 0],
                    opacity: [0, 1, 0, 1, 0]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut",
                    times: [0, 0.2, 0.4, 0.6, 1]
                }}
                className="absolute mt-12 text-primary"
            >
                <Hand className="h-8 w-8 drop-shadow-lg fill-current" />
            </motion.div>
        </div>
    );
}

function TableDemo() {
    const { t } = useTranslation();

    return (
        <div className="bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-xl flex flex-col items-center gap-4 my-2 p-4">
            <p className="text-sm text-muted-foreground mb-2">{t("help.demo_table_hint", "Hover over rows to reveal actions")}</p>

            <div className="w-full max-w-[400px] border rounded-lg bg-background overflow-hidden shadow-sm text-sm">
                <div className="flex items-center p-2 border-b bg-muted/20 text-xs font-semibold text-muted-foreground">
                    <div className="flex-1 pl-2">Description</div>
                    <div className="w-20 text-right pr-2">Amount</div>
                    <div className="w-20 text-center">Actions</div>
                </div>

                {/* Static Row */}
                <div className="flex items-center p-2 border-b">
                    <div className="flex-1 pl-2 font-medium">Coffee</div>
                    <div className="w-20 text-right pr-2 text-red-500">-€2.50</div>
                    <div className="w-20 flex justify-center gap-1">
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Edit className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Trash2 className="h-3 w-3" /></Button>
                    </div>
                </div>

                {/* Animated Row */}
                <div className="flex items-center p-2 relative group cursor-default">
                    <div className="flex-1 pl-2 font-medium">Salary</div>
                    <div className="w-20 text-right pr-2 text-green-500">+€2,800</div>
                    <div className="w-20 flex justify-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-muted-foreground"><MoreHorizontal className="h-3 w-3" /></Button>
                    </div>

                    {/* Cursor Animation */}
                    <motion.div
                        initial={{ opacity: 0, x: 20, y: 20 }}
                        animate={{
                            opacity: [0, 1, 1, 0],
                            x: [20, 0, 0, 20],
                            y: [20, 0, 0, 20]
                        }}
                        transition={{ duration: 3, repeat: Infinity, repeatDelay: 1 }}
                        className="absolute right-4 bottom-0 pointer-events-none"
                    >
                        <MousePointerClick className="h-5 w-5 text-primary fill-primary/20" />
                    </motion.div>
                </div>
            </div>
        </div>
    );
}

// --- Topic Content Definitions ---

type HelpTopic = {
    id: string;
    icon: React.ElementType;
    titleKey: string;
    descriptionKey: string; // Short description for list
    content?: React.ReactNode;
};

type HelpSection = {
    id: string;
    titleKey: string;
    descriptionKey: string;
    topicIds: string[];
};

const useHelpTopics = () => {
    const { t } = useTranslation();
    // Move dependency logic here
    const isDesktop = useMediaQuery("(min-width: 768px)");

    const topics: HelpTopic[] = [
        {
            id: "actions",
            icon: isDesktop ? MousePointerClick : TouchpadOff,
            titleKey: isDesktop ? "help.actions_title" : "help.gestures_title",
            descriptionKey: isDesktop ? "help.actions_desc" : "help.gestures_desc",
            content: (
                <div className="space-y-4">
                    {isDesktop ? (
                        <>
                            <p className="text-sm text-muted-foreground">{t("help.actions_intro_desktop", "On desktop, you can manage items using the action buttons in the table or context menus.")}</p>
                            <TableDemo />
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <div className="p-1 bg-muted rounded"><Edit className="h-3 w-3" /></div>
                                    <span><strong>{t("help.edit", "Edit")}:</strong> {t("help.click_edit", "Click the pencil icon to modify details.")}</span>
                                </li>
                                <li className="flex gap-2">
                                    <div className="p-1 bg-muted rounded"><Trash2 className="h-3 w-3 text-destructive" /></div>
                                    <span><strong>{t("help.delete", "Delete")}:</strong> {t("help.click_delete", "Click the trash icon to remove an item.")}</span>
                                </li>
                                <li className="flex gap-2">
                                    <div className="p-1 bg-muted rounded"><MoreHorizontal className="h-3 w-3" /></div>
                                    <span><strong>{t("help.more_actions", "More")}:</strong> {t("help.click_more", "Click the ellipsis for advanced options like 'Split' or 'Duplicate'.")}</span>
                                </li>
                            </ul>
                        </>
                    ) : (
                        <>
                            <p className="text-sm text-muted-foreground">{t("help.gestures_intro", "On mobile devices, you can use swipe gestures to quickly manage your items.")}</p>
                            <SwipeDemo />
                            <ul className="space-y-2 text-sm">
                                <li className="flex gap-2">
                                    <ArrowLeft className="h-5 w-5 text-red-500 shrink-0" />
                                    <span><strong>{t("help.swipe_left", "Swipe Left")}:</strong> {t("help.swipe_left_desc", "Deletes the item (Transactions, Categories, Groups, etc.)")}</span>
                                </li>
                                <li className="flex gap-2">
                                    <ChevronRight className="h-5 w-5 text-blue-500 shrink-0" />
                                    <span><strong>{t("help.swipe_right", "Swipe Right")}:</strong> {t("help.swipe_right_desc", "Edits the item details.")}</span>
                                </li>
                            </ul>
                        </>
                    )}
                </div>
            )
        },
        {
            id: "data_logic",
            icon: Trash2,
            titleKey: "help.data_logic_title",
            descriptionKey: "help.data_logic_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <div className="p-3 bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 dark:border-amber-500/30 rounded-lg">
                        <h4 className="font-semibold text-amber-600 mb-1 flex items-center gap-2">
                            <Trash2 className="h-4 w-4" />
                            {t("help.deleting_categories_title", "Deleting Categories")}
                        </h4>
                        <p>{t("help.deleting_categories_expl", "If you delete a Category that has existing transactions, those transactions will NOT be deleted. Instead, they will be moved to 'Uncategorized' so you don't lose your financial records.")}</p>
                    </div>

                    <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg">
                        <h4 className="font-semibold text-blue-600 mb-1 flex items-center gap-2">
                            <Edit className="h-4 w-4" />
                            {t("help.editing_recurring_title", "Editing Recurring")}
                        </h4>
                        <p>{t("help.editing_recurring_expl", "Changes to a Recurring Transaction template only affect *future* transactions generated from it. Past transactions remain unchanged.")}</p>
                    </div>
                </div>
            )
        },
        {
            id: "account",
            icon: RefreshCw,
            titleKey: "account_sync_title",
            descriptionKey: "account_sync_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.sync_intro")}</p>
                    <div className="grid gap-3">
                        <div className="p-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-green-600 flex items-center gap-2">
                                <WifiOff className="h-4 w-4" />
                                {t("help.sync_local_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.sync_local_expl")}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                                <Cloud className="h-4 w-4" />
                                {t("help.sync_cloud_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.sync_cloud_expl")}</p>
                        </div>
                        <div className="p-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-red-600 flex items-center gap-2">
                                <LogOut className="h-4 w-4" />
                                {t("help.logout_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.logout_expl")}</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "contexts",
            icon: Tags,
            titleKey: "help.contexts_title",
            descriptionKey: "help.contexts_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.contexts_intro")}</p>
                    <div className="p-4 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-xl space-y-3">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-primary/10 rounded-lg">
                                <Tags className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                                <h4 className="font-medium text-primary">Categories</h4>
                                <p className="text-xs text-muted-foreground mt-1">Food, Transport, Utilities</p>
                            </div>
                        </div>
                        <div className="flex justify-center">
                            <ArrowLeftRight className="h-4 w-4 text-muted-foreground rotate-90" />
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-purple-500/10 rounded-lg">
                                <Layers className="h-5 w-5 text-purple-600" />
                            </div>
                            <div>
                                <h4 className="font-medium text-purple-600">Contexts</h4>
                                <p className="text-xs text-muted-foreground mt-1">Weekend Trip, Office Renovation</p>
                            </div>
                        </div>
                        <p className="text-xs pt-2 border-t mt-2">
                            {t("help.contexts_vs_cat_expl")}
                        </p>
                    </div>
                </div>
            )
        },
        {
            id: "groups",
            icon: Users,
            titleKey: "help.groups_title",
            descriptionKey: "help.groups_desc",
            content: (
                <div className="space-y-5 text-sm">
                    <p>{t("help.groups_intro")}</p>

                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="members">
                            <AccordionTrigger className="gap-2">
                                <Users className="h-4 w-4 text-blue-500" />
                                {t("help.groups_members_title")}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {t("help.groups_members_expl")}
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="owner">
                            <AccordionTrigger className="gap-2">
                                <Crown className="h-4 w-4 text-yellow-500" />
                                {t("help.groups_owner_title")}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {t("help.groups_owner_expl")}
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="categories">
                            <AccordionTrigger className="gap-2">
                                <Tags className="h-4 w-4 text-green-500" />
                                {t("help.groups_categories_title")}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {t("help.groups_categories_expl")}
                            </AccordionContent>
                        </AccordionItem>

                        <AccordionItem value="splits">
                            <AccordionTrigger className="gap-2">
                                <Percent className="h-4 w-4 text-purple-500" />
                                {t("help.groups_splits_title")}
                            </AccordionTrigger>
                            <AccordionContent className="text-muted-foreground">
                                {t("help.groups_splits_expl")}
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </div>
            )
        },
        {
            id: "recurring",
            icon: RefreshCw,
            titleKey: "help.recurring_title",
            descriptionKey: "help.recurring_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.recurring_intro")}</p>
                    <div className="grid gap-3">
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg space-y-1">
                            <h4 className="font-semibold flex items-center gap-2">
                                <RefreshCw className="h-4 w-4" />
                                {t("help.recurring_auto_gen")}
                            </h4>
                            <p className="text-muted-foreground text-xs">{t("help.recurring_auto_gen_expl")}</p>
                        </div>
                        <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg space-y-1">
                            <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                                <Edit className="h-4 w-4" />
                                {t("help.editing_recurring_title")}
                            </h4>
                            <p className="text-muted-foreground text-xs">{t("help.editing_recurring_expl")}</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "import",
            icon: Upload,
            titleKey: "help.import_title",
            descriptionKey: "help.import_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.import_intro")}</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg">
                            <h4 className="font-semibold mb-1">{t("help.import_formats_title")}</h4>
                            <p className="text-xs text-muted-foreground">{t("help.import_formats_expl")}</p>
                        </div>
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg">
                            <h4 className="font-semibold mb-1">{t("help.import_generic_title")}</h4>
                            <p className="text-xs text-muted-foreground">{t("help.import_generic_expl")}</p>
                        </div>
                        <div className="p-3 bg-purple-500/10 dark:bg-purple-500/20 border border-purple-500/20 dark:border-purple-500/30 rounded-lg sm:col-span-2">
                            <h4 className="font-semibold mb-1 text-purple-600 flex items-center gap-2">
                                <Sparkles className="h-3 w-3" />
                                {t("help.import_rules_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.import_rules_expl")}</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "customization",
            icon: Palette,
            titleKey: "help.customization_title",
            descriptionKey: "help.customization_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.customization_intro")}</p>
                    <div className="space-y-4">
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-full"><Moon className="h-4 w-4" /></div>
                            <div>
                                <h4 className="font-semibold">{t("help.customization_themes_title")}</h4>
                                <p className="text-muted-foreground text-xs">{t("help.customization_themes_expl")}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <div className="p-2 bg-muted rounded-full"><Palette className="h-4 w-4" /></div>
                            <div>
                                <h4 className="font-semibold">{t("help.customization_colors_title")}</h4>
                                <p className="text-muted-foreground text-xs mb-2">{t("help.customization_colors_expl")}</p>

                                <div className="flex flex-wrap gap-1.5 pt-1">
                                    {Object.values(THEME_COLORS).map((color) => (
                                        <div
                                            key={color.name}
                                            className="h-6 w-6 rounded-full border border-border/50 shadow-sm"
                                            style={{ backgroundColor: `hsl(${color.light.primary})` }}
                                            title={color.label}
                                        />
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "profile",
            icon: User2,
            titleKey: "help.profile_title",
            descriptionKey: "help.profile_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.profile_intro")}</p>

                    <div className="grid gap-3">
                        <div className="p-3 bg-blue-500/10 dark:bg-blue-500/20 border border-blue-500/20 dark:border-blue-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-blue-600 flex items-center gap-2">
                                <User2 className="h-4 w-4" />
                                {t("help.profile_identity_title", "Public Identity")}
                            </h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p><strong>{t("help.profile_name_title")}:</strong> {t("help.profile_name_expl")}</p>
                            </div>
                        </div>

                        <div className="p-3 bg-red-500/10 dark:bg-red-500/20 border border-red-500/20 dark:border-red-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-red-600 flex items-center gap-2">
                                <ShieldAlert className="h-4 w-4" />
                                {t("help.profile_security_title", "Device Security")}
                            </h4>
                            <div className="text-xs text-muted-foreground space-y-1">
                                <p><strong>{t("help.logout_title")}:</strong> {t("help.logout_expl")}</p>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "statistics",
            icon: BarChart3,
            titleKey: "help.stats_title",
            descriptionKey: "help.stats_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.stats_intro")}</p>
                    <div className="grid gap-3">
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <PieChart className="h-4 w-4" />
                                {t("help.stats_charts_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.stats_charts_expl")}</p>
                        </div>
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Activity className="h-4 w-4" />
                                {t("help.stats_metrics_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.stats_metrics_expl")}</p>
                        </div>
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <ArrowLeftRight className="h-4 w-4" />
                                {t("help.stats_comparison_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.stats_comparison_expl")}</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "budget",
            icon: Wallet,
            titleKey: "help.budget_title",
            descriptionKey: "help.budget_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.budget_intro")}</p>
                    <div className="grid gap-3">
                        <div className="p-3 bg-green-500/10 dark:bg-green-500/20 border border-green-500/20 dark:border-green-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-green-600 flex items-center gap-2">
                                <Wallet className="h-4 w-4" />
                                {t("help.budget_monthly_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.budget_monthly_expl")}</p>
                        </div>
                        <div className="p-3 bg-muted/50 dark:bg-muted/20 border border-transparent dark:border-border/50 rounded-lg space-y-2">
                            <h4 className="font-semibold flex items-center gap-2">
                                <Tags className="h-4 w-4" />
                                {t("help.budget_category_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.budget_category_expl")}</p>
                        </div>
                    </div>
                </div>
            )
        },
        {
            id: "tips",
            icon: Lightbulb,
            titleKey: "help.tips_title",
            descriptionKey: "help.tips_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.tips_intro")}</p>
                    <div className="grid gap-3">
                        <div className="p-3 bg-yellow-500/10 dark:bg-yellow-500/20 border border-yellow-500/20 dark:border-yellow-500/30 rounded-lg space-y-2">
                            <h4 className="font-semibold text-yellow-600 flex items-center gap-2">
                                <EyeOff className="h-4 w-4" />
                                {t("help.tips_visibility_title")}
                            </h4>
                            <p className="text-xs text-muted-foreground">{t("help.tips_visibility_expl")}</p>
                        </div>
                    </div>
                </div>
            )
        },




        {
            id: "pwa",
            icon: Smartphone,
            titleKey: "help.pwa_title",
            descriptionKey: "help.pwa_desc",
            content: (
                <div className="space-y-4 text-sm">
                    <p>{t("help.pwa_expl", "This app is a PWA (Progressive Web App). You can install it on your home screen for a native app experience.")}</p>
                    <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                        <li><strong>iOS:</strong> {t("help.pwa_ios", "Tap 'Share' -> 'Add to Home Screen'")}</li>
                        <li><strong>Android:</strong> {t("help.pwa_android", "Tap 'Menu' -> 'Install App'")}</li>
                        <li><strong>Desktop:</strong> {t("help.pwa_desktop", "Click the install icon in your browser address bar")}</li>
                    </ul>
                </div>
            )
        }
    ];

    // Define sections for mobile grouping
    const sections: HelpSection[] = [
        {
            id: "essentials",
            titleKey: "help.section_essentials_title",
            descriptionKey: "help.section_essentials_desc",
            topicIds: ["actions", "pwa", "customization"]
        },
        {
            id: "daily",
            titleKey: "help.section_daily_title",
            descriptionKey: "help.section_daily_desc",
            topicIds: ["recurring", "import", "tips"]
        },
        {
            id: "organization",
            titleKey: "help.section_org_title",
            descriptionKey: "help.section_org_desc",
            topicIds: ["groups", "contexts", "data_logic"]
        },
        {
            id: "analytics",
            titleKey: "help.section_analytics_title",
            descriptionKey: "help.section_analytics_desc",
            topicIds: ["statistics", "budget"]
        },
        {
            id: "account",
            titleKey: "help.section_account_title",
            descriptionKey: "help.section_account_desc",
            topicIds: ["profile", "account"]
        }
    ];

    return { topics, sections };
};


// --- Main Components ---

export function HelpSystemWrapper({
    children,
    triggerAsChild = false
}: {
    children?: React.ReactNode,
    triggerAsChild?: boolean
}) {
    const [open, setOpen] = useState(false);
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const { topics, sections } = useHelpTopics();
    const { t } = useTranslation();

    // Mobile specific state
    const [selectedTopicId, setSelectedTopicId] = useState<string | null>(null);
    const selectedTopic = topics.find(topic => topic.id === selectedTopicId);

    if (isDesktop) {
        return (
            <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild={triggerAsChild}>
                    {children || <Button variant="ghost" size="icon"><HelpCircle /></Button>}
                </DialogTrigger>
                <DialogContent className="max-w-4xl h-[80vh] flex flex-col p-0 gap-0 overflow-hidden">
                    <DialogHeader className="px-6 py-4 border-b">
                        <DialogTitle className="flex items-center gap-2">
                            <HelpCircle className="h-5 w-5 text-primary" />
                            {t("help.title", "Help & Guide")}
                        </DialogTitle>
                        <DialogDescription>
                            {t("help.subtitle", "Learn how to use the app and understand how it works.")}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="flex flex-1 overflow-hidden">
                        {/* Sidebar */}
                        <div className="w-1/3 border-r bg-muted/30 dark:bg-muted/10 overflow-y-auto p-4 space-y-2">
                            {sections.map(section => {
                                const sectionTopics = section.topicIds
                                    .map(id => topics.find(t => t.id === id))
                                    .filter((t): t is HelpTopic => t !== undefined);

                                if (sectionTopics.length === 0) return null;

                                return (
                                    <div key={section.id}>
                                        <h3 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                            {t(section.titleKey)}
                                        </h3>
                                        <div className="space-y-1">
                                            {sectionTopics.map(topic => (
                                                <button
                                                    key={topic.id}
                                                    onClick={() => setSelectedTopicId(topic.id)}
                                                    className={cn(
                                                        "w-full flex items-center gap-3 p-2 px-3 rounded-md text-left transition-colors text-sm",
                                                        selectedTopicId === topic.id
                                                            ? "bg-primary/10 text-primary font-medium"
                                                            : "hover:bg-muted text-foreground/80 hover:text-foreground"
                                                    )}
                                                >
                                                    <topic.icon className="h-4 w-4 shrink-0" />
                                                    <span>{t(topic.titleKey)}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Content Area */}
                        <ScrollArea className="flex-1 p-6">
                            {selectedTopic ? (
                                <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-right-4 duration-300">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 rounded-full bg-primary/10 text-primary">
                                            <selectedTopic.icon className="h-6 w-6" />
                                        </div>
                                        <h2 className="text-2xl font-bold">{t(selectedTopic.titleKey)}</h2>
                                    </div>
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        {selectedTopic.content}
                                    </div>
                                </div>
                            ) : (
                                <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                                    <HelpCircle className="h-12 w-12 mb-4 opacity-20" />
                                    <h3 className="text-lg font-medium mb-2">{t("help.welcome_title", "Welcome to the Help Center")}</h3>
                                    <p>{t("help.welcome_select", "Select a topic from the left to get started.")}</p>
                                </div>
                            )}
                        </ScrollArea>
                    </div>
                </DialogContent>
            </Dialog>
        );
    }

    // Mobile Implementation (Drawer)
    return (
        <Drawer open={open} onOpenChange={(val) => {
            setOpen(val);
            if (!val) setTimeout(() => setSelectedTopicId(null), 300); // Reset after close
        }}>
            <DrawerTrigger asChild={triggerAsChild}>
                {children || <Button variant="ghost" size="icon"><HelpCircle /></Button>}
            </DrawerTrigger>
            <DrawerContent className="h-[92vh] flex flex-col bg-background/95 backdrop-blur-xl">
                {/* Decorative background element */}
                <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-primary/10 to-transparent pointer-events-none" />

                <div className="flex-1 overflow-hidden relative flex flex-col">
                    {/* Header */}
                    <div className="px-6 pt-6 pb-2 shrink-0 z-10 flex items-center justify-between">
                        {!selectedTopic ? (
                            <div>
                                <DrawerTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary to-primary/60">
                                    {t("help.title", "Help Center")}
                                </DrawerTitle>
                                <DrawerDescription className="text-muted-foreground font-medium">
                                    {t("help.subtitle", "How can we help?")}
                                </DrawerDescription>
                            </div>
                        ) : (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-2 gap-1 text-muted-foreground hover:text-foreground"
                                onClick={() => setSelectedTopicId(null)}
                            >
                                <ArrowLeft className="h-4 w-4" />
                                {t("back", "Back")}
                            </Button>
                        )}
                        <div className="p-2 bg-primary/10 rounded-full">
                            <HelpCircle className="h-5 w-5 text-primary" />
                        </div>
                    </div>

                    {/* Content Area with Transitions */}
                    <div className="flex-1 overflow-hidden relative w-full">
                        {selectedTopic ? (
                            <motion.div
                                key="detail"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                transition={{ duration: 0.25, ease: "easeOut" }}
                                className="absolute inset-0 flex flex-col"
                            >
                                <ScrollArea className="flex-1 px-6 pb-8 pt-2">
                                    <div className="pb-20">
                                        <div className="flex items-center gap-3 mb-6">
                                            <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 shadow-sm text-primary">
                                                <selectedTopic.icon className="h-6 w-6" />
                                            </div>
                                            <h2 className="text-2xl font-bold tracking-tight">{t(selectedTopic.titleKey)}</h2>
                                        </div>
                                        <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground/90">
                                            {selectedTopic.content}
                                        </div>
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="list"
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                transition={{ duration: 0.2 }}
                                className="absolute inset-0"
                            >
                                <ScrollArea className="h-full px-5 pb-8 pt-2">
                                    <div className="space-y-6 pb-20">
                                        {sections.map((section) => {
                                            const sectionTopics = section.topicIds
                                                .map(id => topics.find(t => t.id === id))
                                                .filter((t): t is HelpTopic => t !== undefined);

                                            if (sectionTopics.length === 0) return null;

                                            return (
                                                <div key={section.id}>
                                                    {/* Section Header */}
                                                    <div className="flex items-center gap-2 mb-3 px-1">
                                                        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                                                            {t(section.titleKey)}
                                                        </h3>
                                                        <div className="flex-1 h-px bg-border/50" />
                                                    </div>

                                                    {/* Section Topics */}
                                                    <div className="space-y-2">
                                                        {sectionTopics.map((topic) => (
                                                            <button
                                                                key={topic.id}
                                                                type="button"
                                                                onClick={() => setSelectedTopicId(topic.id)}
                                                                onPointerDown={(e) => e.stopPropagation()}
                                                                className="group relative flex items-center w-full p-3.5 rounded-xl border border-transparent dark:border-border/50 bg-muted/50 dark:bg-muted/20 hover:bg-muted/70 active:scale-[0.98] transition-all duration-200 shadow-sm text-left overflow-hidden touch-manipulation"
                                                            >
                                                                {/* Gradient Background Effect on Hover/Active */}
                                                                <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-primary/0 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

                                                                <div className="h-9 w-9 mr-3 rounded-lg bg-background/80 flex items-center justify-center shadow-sm text-primary group-hover:text-primary/80 transition-colors">
                                                                    <topic.icon className="h-4 w-4" />
                                                                </div>
                                                                <div className="flex-1 min-w-0">
                                                                    <h4 className="font-medium text-sm text-foreground/90 truncate">{t(topic.titleKey)}</h4>
                                                                    <p className="text-xs text-muted-foreground truncate opacity-80">{t(topic.descriptionKey)}</p>
                                                                </div>
                                                                <ChevronRight className="h-4 w-4 text-muted-foreground/50 group-hover:text-primary/50 transition-colors" />
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </ScrollArea>
                            </motion.div>
                        )}
                    </div>
                </div>
            </DrawerContent>
        </Drawer>
    );
}
