

import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from "@/components/ui/button";
import { Trash2, ArrowRight, ChevronDown, ChevronUp } from "lucide-react";
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
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthProvider';


export function ImportRulesManager() {
    const { user } = useAuth();
    const [showAll, setShowAll] = useState(false);

    // Fetch rules and categories
    const rules = useLiveQuery(
        () => user ? db.import_rules.where('user_id').equals(user.id).filter(r => r.active === 1 && !r.deleted_at).toArray() : [],
        [user?.id]
    );

    const categories = useLiveQuery(
        () => user ? db.categories.where('user_id').equals(user.id).toArray() : [],
        [user?.id]
    );

    if (!rules || !categories) return null;
    if (rules.length === 0) return null;

    const getCategoryName = (id: string) => {
        if (id === 'SKIP') return '⛔ Ignore / Skip';
        const cat = categories.find(c => c.id === id);
        return cat ? cat.name : 'Unknown Category';
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

    const visibleRules = showAll ? rules : rules.slice(0, 3);
    const hasMoreRules = rules.length > 3;

    return (
        <Card>
            <CardHeader className="pb-3">
                <CardTitle className="text-base">Import Rules</CardTitle>
                <CardDescription>Manage your auto-categorization rules.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="rounded-md border overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-slate-50 dark:bg-slate-900">
                                <TableHead>Match Text</TableHead>
                                <TableHead>Action</TableHead>
                                <TableHead className="w-[50px]"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {visibleRules.map((rule) => (
                                <TableRow key={rule.id}>
                                    <TableCell className="font-mono text-xs text-muted-foreground">
                                        "{rule.match_string}"
                                    </TableCell>
                                    <TableCell className="flex items-center gap-2">
                                        <ArrowRight className="h-3 w-3 text-muted-foreground" />
                                        <span className={rule.category_id === 'SKIP' ? 'text-red-500 font-medium text-xs' : 'text-xs'}>
                                            {getCategoryName(rule.category_id)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                            onClick={() => handleDeleteRule(rule.id)}
                                            title="Delete Rule"
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {hasMoreRules && (
                        <div className="p-2 flex justify-center bg-slate-50 dark:bg-slate-900 border-t">
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowAll(!showAll)}
                                className="text-xs text-muted-foreground w-full gap-2"
                            >
                                {showAll ? (
                                    <>
                                        <ChevronUp className="h-3 w-3" />
                                        Show Less
                                    </>
                                ) : (
                                    <>
                                        <ChevronDown className="h-3 w-3" />
                                        Show {rules.length - 3} More Rules
                                    </>
                                )}
                            </Button>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}
