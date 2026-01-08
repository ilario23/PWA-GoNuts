import { useProfile } from "@/hooks/useProfiles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
    userId: string;
    className?: string; // Container class
    avatarClassName?: string; // Avatar element class
    showName?: boolean;
    fallbackName?: string; // Name to show if profile not found (e.g. "You")
}

export function UserAvatar({
    userId,
    className,
    avatarClassName,
    showName = false,
    fallbackName
}: UserAvatarProps) {
    const profile = useProfile(userId);

    // Determine display name
    // Priority: Profile Name -> Fallback Name -> ID (shortened)
    const displayName = profile?.full_name || profile?.email || fallbackName || userId.substring(0, 8);

    // Determine initials for avatar fallback
    const initials = displayName
        .split(" ")
        .map((n) => n[0])
        .join("")
        .substring(0, 2)
        .toUpperCase();

    return (
        <div className={cn("flex items-center gap-2", className)}>
            <Avatar className={cn("h-8 w-8", avatarClassName)}>
                <AvatarImage src={profile?.avatar_url} alt={displayName} />
                <AvatarFallback>{initials}</AvatarFallback>
            </Avatar>
            {showName && (
                <span className="text-sm font-medium truncate max-w-[150px]">
                    {displayName}
                </span>
            )}
        </div>
    );
}
