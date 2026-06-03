import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Delete, Divide, Equal, Minus, Plus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalculatorProps {
    onOperation: (op: string) => void;
    onEqual: () => void;
    onClear: () => void;
    activeOperation: string | null;
    className?: string;
}

export function Calculator({
    onOperation,
    onEqual,
    onClear,
    activeOperation,
    className,
}: CalculatorProps) {
    const { t } = useTranslation();

    const ops = [
        { label: "/", icon: Divide, aria: t("calc_divide", { defaultValue: "Divide" }) },
        { label: "*", icon: X, aria: t("calc_multiply", { defaultValue: "Multiply" }) },
        { label: "-", icon: Minus, aria: t("calc_subtract", { defaultValue: "Subtract" }) },
        { label: "+", icon: Plus, aria: t("calc_add", { defaultValue: "Add" }) },
    ];

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("calc_clear", { defaultValue: "Clear" })}
                className="flex-1 h-9 bg-muted text-muted-foreground hover:text-foreground"
                onClick={onClear}
            >
                <Delete className="h-4 w-4" />
            </Button>
            {ops.map((op) => (
                <Button
                    key={op.label}
                    type="button"
                    variant="ghost"
                    size="sm"
                    aria-label={op.aria}
                    className={cn(
                        "flex-1 h-9 transition-colors",
                        activeOperation === op.label
                            ? "bg-foreground text-background hover:bg-foreground"
                            : "bg-muted text-muted-foreground hover:text-foreground"
                    )}
                    onClick={() => onOperation(op.label)}
                >
                    <op.icon className="h-4 w-4" />
                </Button>
            ))}
            <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label={t("calc_equals", { defaultValue: "Equals" })}
                className="flex-1 h-9 bg-[hsl(var(--gonuts-orange))] text-white hover:bg-[hsl(var(--gonuts-orange))]/90"
                onClick={onEqual}
            >
                <Equal className="h-4 w-4" />
            </Button>
        </div>
    );
}
