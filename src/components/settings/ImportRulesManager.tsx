
import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight, Search, Wand2, X } from "lucide-react";
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { useAuth } from '@/contexts/AuthProvider';
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function ImportRulesManager() {
    const { user } = useAuth();
    const [searchTerm, setSearchTerm] = useState("");

    // Fetch rules and categories
    const rules = useLiveQuery(
        () => user ? db.import_rules.where('user_id').equals(user.id).filter(r => r.active === 1 && !r.deleted_at).toArray() : [],
        [user?.id]
    );

    const categories = useLiveQuery(
        () => user ? db.categories.where('user_id').equals(user.id).toArray() : [],
        [user?.id]
    );

    const categoryMap = useMemo(() => {
        const map = new Map<string, string>();
        categories?.forEach(c => map.set(c.id, c.name));
        return map;
    }, [categories]);

    if (!rules || !categories) return null;
    if (rules.length === 0) return null;

    const getCategoryName = (id: string) => {
        if (id === 'SKIP') return '⛔ Ignore / Skip';
        return categoryMap.get(id) || 'Unknown Category';
    };

    const handleDeleteRule = async (ruleId: string) => {
        try {
            await db.import_rules.update(ruleId, {
                active: 0,
                deleted_at: new Date().toISOString(),
                pendingSync: 1
            });
            toast.success("Rule deleted");
        } catch (error) {
            toast.error("Failed to delete rule");
            console.error(error);
        }
    };

    const filteredRules = rules.filter(rule => {
        if (!searchTerm) return true;
        const searchLower = searchTerm.toLowerCase();
        const matchString = rule.match_string.toLowerCase();
        const catName = getCategoryName(rule.category_id).toLowerCase();
        return matchString.includes(searchLower) || catName.includes(searchLower);
    });

    return (
        <Accordion type="single" collapsible className="w-full bg-card rounded-lg border shadow-sm">
            <AccordionItem value="rules" className="border-b-0">
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                        <Wand2 className="h-4 w-4 text-purple-500" />
                        <span className="font-semibold text-base">Import Rules</span>
                        <Badge variant="secondary" className="ml-2 font-mono text-xs">
                            {rules.length}
                        </Badge>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-0">
                    <div className="space-y-4">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                type="search"
                                placeholder="Search rules..."
                                className="pl-9"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm("")}
                                    className="absolute right-3 top-3 text-muted-foreground hover:text-foreground"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            )}
                        </div>

                        {filteredRules.length === 0 ? (
                            <div className="text-center py-8 text-muted-foreground text-sm border border-dashed rounded-lg">
                                No matching rules found.
                            </div>
                        ) : (
                            <div className="rounded-md border overflow-hidden">
                                {/* Desktop Table View */}
                                <div className="hidden md:block">
                                    <Table>
                                        <TableHeader>
                                            <TableRow className="bg-muted/50">
                                                <TableHead>Match Text</TableHead>
                                                <TableHead>Type</TableHead>
                                                <TableHead>Assigned Category</TableHead>
                                                <TableHead className="w-[50px]"></TableHead>
                                            </TableRow>
                                        </TableHeader>
                                        <TableBody>
                                            {filteredRules.map((rule) => (
                                                <TableRow key={rule.id}>
                                                    <TableCell className="font-mono text-sm font-medium">
                                                        "{rule.match_string}"
                                                    </TableCell>
                                                    <TableCell className="text-xs text-muted-foreground">
                                                        {rule.match_type}
                                                    </TableCell>
                                                    <TableCell>
                                                        <div className="flex items-center gap-2">
                                                            <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                                            <span className={cn(
                                                                "px-2 py-1 rounded text-xs font-medium",
                                                                rule.category_id === 'SKIP'
                                                                    ? "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300"
                                                                    : "bg-primary/10 text-primary"
                                                            )}>
                                                                {getCategoryName(rule.category_id)}
                                                            </span>
                                                        </div>
                                                    </TableCell>
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleDeleteRule(rule.id)}
                                                            title="Delete Rule"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            ))}
                                        </TableBody>
                                    </Table>
                                </div>

                                {/* Mobile List View */}
                                <div className="md:hidden divide-y divide-border">
                                    {filteredRules.map((rule) => (
                                        <div key={rule.id} className="p-3 flex items-center justify-between bg-card">
                                            <div className="flex-1 min-w-0 pr-3">
                                                <div className="font-mono text-sm font-medium truncate mb-1">
                                                    "{rule.match_string}"
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                                    <ArrowRight className="h-3 w-3" />
                                                    <span className={cn(
                                                        "font-medium truncate",
                                                        rule.category_id === 'SKIP' ? "text-red-600" : "text-primary"
                                                    )}>
                                                        {getCategoryName(rule.category_id)}
                                                    </span>
                                                </div>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 shrink-0 text-muted-foreground hover:text-destructive"
                                                onClick={() => handleDeleteRule(rule.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                        <div className="text-xs text-center text-muted-foreground">
                            Showing {filteredRules.length} of {rules.length} rules
                        </div>
                    </div>
                </AccordionContent>
            </AccordionItem>
        </Accordion>
    );
}
