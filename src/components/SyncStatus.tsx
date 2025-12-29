import { Cloud, CloudOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Badge } from "@/components/ui/badge";

interface SyncStatusBadgeProps {
  isPending: boolean;
  className?: string;
}

export function SyncStatusBadge({
  isPending,
  className,
}: SyncStatusBadgeProps) {
  const { t } = useTranslation();
  if (!isPending) {
    return null;
  }

  return (
    <Badge variant="secondary" className={className}>
      <CloudOff className="mr-1 h-3 w-3" />
      {t("pending")}
    </Badge>
  );
}

interface SyncIndicatorProps {
  isSyncing: boolean;
  isOnline: boolean;
  lastSyncTime?: Date;
}

export function SyncIndicator({
  isSyncing,
  isOnline,
  lastSyncTime,
}: SyncIndicatorProps) {
  const { t } = useTranslation();
  if (isSyncing) {
    return (
      <div className="flex items-center gap-2 text-sm text-primary">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Syncing...</span>
      </div>
    );
  }

  if (!isOnline) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <CloudOff className="h-4 w-4 text-amber-500" />
        <span>{t("offline")}</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm text-muted-foreground">
      <Cloud className="h-4 w-4 text-green-500" />
      <span>
        {lastSyncTime
          ? `Last sync: ${formatRelativeTime(lastSyncTime)}`
          : "Online"}
      </span>
    </div>
  );
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;

  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
