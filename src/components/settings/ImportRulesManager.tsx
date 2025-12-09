
import React from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { Button } from "@/components/ui/button";
import { Trash2, AlertCircle, ArrowRight } from "lucide-react";
import { toast } from 'sonner';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from '@/contexts/AuthProvider';
import { useTranslation } from "react-i18next";

export function ImportRulesManager() {
    const { user } = useAuth();
    const { t } = useTranslation();

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

    if (rules.length === 0) {
        return (
            <div className="text-center p-6 bg-slate-50 dark:bg-slate-900 rounded-lg border border-dashed text-muted-foreground text-sm">
                No import rules found. Create rules during import by clicking the magic wand icon.
            </div>
        );
    }

    return (
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
                    {rules.map((rule) => (
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
        </div>
    );
}
