import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Settings2 } from "lucide-react";
import { useTranslation } from "react-i18next";

interface ImportRevolutConfigProps {
    includeSavings: boolean;
    setIncludeSavings: (v: boolean) => void;
}

export function ImportRevolutConfig({ includeSavings, setIncludeSavings }: ImportRevolutConfigProps) {
    const { t } = useTranslation();

    return (
        <div className="flex flex-col items-center justify-center p-8 space-y-6">
            <div className="h-16 w-16 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center text-blue-600 dark:text-blue-400">
                <Settings2 className="h-8 w-8" />
            </div>
            <div className="text-center">
                <h3 className="text-lg font-semibold">{t("import.revolut_title", "Revolut Import Settings")}</h3>
                <p className="text-muted-foreground text-sm max-w-md mt-2">
                    {t("import.revolut_desc", "We detected a Revolut export. Would you like to import transfers to/from your savings accounts and pockets?")}
                </p>
            </div>

            <Card className="w-full max-w-md">
                <CardContent className="pt-6">
                    <div className="flex items-center justify-between space-x-2">
                        <div className="space-y-0.5">
                            <Label htmlFor="include-savings" className="text-base">{t("import.include_savings", "Include Savings & Pockets")}</Label>
                            <p className="text-xs text-muted-foreground">
                                {t("import.include_savings_desc", "If enabled, transfers to Vaults/Pockets are imported as expenses or income. If disabled, they are ignored to avoid duplicates or noise.")}
                            </p>
                        </div>
                        <Switch
                            id="include-savings"
                            checked={includeSavings}
                            onCheckedChange={setIncludeSavings}
                        />
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
