import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import { DataDoctor, HealthReport, DataIssue } from "@/lib/data-doctor";
import { toast } from "sonner";

export function DataHealthCheck() {
    const { t } = useTranslation();
    const [isScanning, setIsScanning] = useState(false);
    const [report, setReport] = useState<HealthReport | null>(null);

    const runScan = async () => {
        setIsScanning(true);
        try {
            const result = await DataDoctor.checkup();
            setReport(result);
            if (result.issues.length === 0) {
                toast.success(t("health_check_clean", "Data is clean!"));
            } else {
                toast.warning(t("health_check_issues", { count: result.issues.length, defaultValue: `Found ${result.issues.length} issues` }));
            }
        } catch (error) {
            console.error(error);
            toast.error(t("health_check_error", "Scan failed"));
        } finally {
            setIsScanning(false);
        }
    };

    const handleFix = async (issue: DataIssue) => {
        try {
            if (issue.type === "zombie_recurring") {
                await DataDoctor.fixIssue(issue, "archive");
                toast.success(t("issue_fixed", "Issue fixed"));
            } else if (issue.type === "orphan_category") {
                // Auto-fix for orphans not fully implemented in logic yet, asking simply to delete for now
                // In reality we should prompt for new category. 
                // For this MVP, let's offer "Delete" or just show the issue so user goes to transaction and fixes it.
                // But user can't find it easily if it's broken.
                // Let's implement Soft Delete for now.
                await DataDoctor.fixIssue(issue, "delete");
                toast.success(t("transaction_deleted", "Transaction deleted"));
            } else if (issue.type === "future_transaction") {
                // Future transactions might be valid, so maybe just an alert?
                // Or delete?
                // Let's allow delete.
                await DataDoctor.fixIssue(issue, "delete");
                toast.success(t("transaction_deleted", "Transaction deleted"));
            }

            // Refresh report
            const result = await DataDoctor.checkup();
            setReport(result);
        } catch (e) {
            console.error(e);
            toast.error(t("error_fixing", "Could not fix issue"));
        }
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ActivityIcon className="h-5 w-5" />
                    {t("data_health_check", "Data Health Check")}
                </CardTitle>
                <CardDescription>
                    {t("data_health_check_desc", "Scan for data anomalies and fix them to ensure accurate statistics.")}
                </CardDescription>
            </CardHeader>
            <CardContent>
                {!report && (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-muted-foreground">
                        <CheckCircle2 className="h-12 w-12 mb-2 opacity-20" />
                        <p>{t("run_scan_hint", "Run a scan to check data integrity")}</p>
                    </div>
                )}

                {report && report.issues.length === 0 && (
                    <div className="flex flex-col items-center justify-center py-6 text-center text-green-600">
                        <CheckCircle2 className="h-12 w-12 mb-2" />
                        <p className="font-medium">{t("all_good", "All systems operational. No issues found.")}</p>
                    </div>
                )}

                {report && report.issues.length > 0 && (
                    <div className="space-y-4">
                        <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">{t("issues_found", "Issues Found")} ({report.issues.length})</h3>
                        </div>
                        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-2">
                            {report.issues.map((issue) => (
                                <div key={issue.id} className="flex items-start justify-between p-3 border rounded-md bg-muted/30">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant={
                                                issue.type === "orphan_category" ? "destructive" :
                                                    issue.type === "zombie_recurring" ? "secondary" : "default"
                                            }>
                                                {t(issue.type, issue.type.replace('_', ' '))}
                                            </Badge>
                                            <span className="text-xs font-mono text-muted-foreground">
                                                {issue.table === "transactions" ? "TX" : "REC"}
                                            </span>
                                        </div>
                                        <p className="text-sm">{issue.description}</p>
                                    </div>
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleFix(issue)}
                                    >
                                        {issue.type === "zombie_recurring" ? t("deactivate", "Deactivate") : t("delete", "Delete")}
                                    </Button>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </CardContent>
            <CardFooter>
                <Button
                    onClick={runScan}
                    disabled={isScanning}
                    className="w-full sm:w-auto"
                >
                    {isScanning && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isScanning ? t("scanning", "Scanning...") : t("run_scan", "Run Health Scan")}
                </Button>
            </CardFooter>
        </Card>
    );
}

function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
    return (
        <svg
            {...props}
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
        >
            <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
    )
}
