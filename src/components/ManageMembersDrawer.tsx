import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { useGroups, GroupWithMembers } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
    Drawer,
    DrawerContent,
    DrawerHeader,
    DrawerTitle,
    DrawerDescription,
    DrawerFooter,
    DrawerClose,
} from "@/components/ui/drawer";
import {
    Accordion,
    AccordionContent,
    AccordionItem,
    AccordionTrigger,
} from "@/components/ui/accordion";
import { UserAvatar } from "@/components/UserAvatar";
import {
    Crown,
    UserMinus,
    AlertTriangle,
    UserPlus,
    Users,
    Copy,
    Check,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from "@/components/ui/dialog";
import { useIsMobile } from "@/hooks/use-mobile";

interface ManageMembersDrawerProps {
    group: GroupWithMembers | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ManageMembersDrawer({
    group,
    open,
    onOpenChange,
}: ManageMembersDrawerProps) {
    const { t } = useTranslation();
    const { user } = useAuth();
    const { addGroupMember, removeGroupMember, updateAllShares } = useGroups();
    const isMobile = useIsMobile();

    const [newMemberId, setNewMemberId] = useState("");
    const [newGuestName, setNewGuestName] = useState("");
    const [memberShares, setMemberShares] = useState<Record<string, string>>({});
    const [copiedId, setCopiedId] = useState(false);

    if (!group) return null;

    const totalShare = group.members.reduce(
        (sum, m) => {
            const val = memberShares[m.id];
            const share = val !== undefined
                ? (val === "" ? 0 : parseFloat(val))
                : m.share;
            return sum + (isNaN(share) ? 0 : share);
        },
        0
    );
    const isShareValid = Math.abs(totalShare - 100) < 0.1;

    const handleAddMember = async () => {
        if (!newMemberId.trim()) return;
        try {
            await addGroupMember(group.id, newMemberId, false);
            setNewMemberId("");
        } catch (error) {
            console.error("Failed to add member:", error);
            alert(t("error_occurred"));
        }
    };

    const handleAddGuest = async () => {
        if (!newGuestName.trim()) return;
        try {
            await addGroupMember(group.id, newGuestName, true);
            setNewGuestName("");
        } catch (error) {
            console.error("Failed to add guest:", error);
            alert(t("error_occurred"));
        }
    };

    const handleRemoveMember = async (memberId: string) => {
        if (confirm(t("confirm_delete_description"))) {
            await removeGroupMember(memberId);
        }
    };

    const handleSaveShares = async () => {
        const updates = Object.entries(memberShares).map(([memberId, share]) => ({
            memberId,
            share: share === "" ? 0 : parseFloat(share),
        }));
        await updateAllShares(group.id, updates);
        onOpenChange(false);
    };

    const copyMyId = () => {
        if (user?.id) {
            navigator.clipboard.writeText(user.id);
            setCopiedId(true);
            setTimeout(() => setCopiedId(false), 2000);
        }
    };

    const MainContent = (
        <div className="flex-1 overflow-y-auto">
            <Accordion type="single" collapsible defaultValue="members" className="w-full">
                {/* Add Member Section */}
                <AccordionItem value="add" className="border-b-0">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <span className="flex items-center gap-2 text-sm font-medium">
                            <UserPlus className="h-4 w-4" />
                            {t("add_member")}
                        </span>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                        <Tabs defaultValue="invite" className="w-full">
                            <TabsList className="grid w-full grid-cols-2 h-14">
                                <TabsTrigger value="invite" className="text-xs">{t("invite_user")}</TabsTrigger>
                                <TabsTrigger value="guest" className="text-xs">{t("add_guest")}</TabsTrigger>
                            </TabsList>

                            <TabsContent value="invite" className="space-y-3 pt-3">
                                <div className="bg-muted p-2.5 rounded-md text-xs text-muted-foreground flex items-center justify-between">
                                    <span>{t("share_id_hint")}</span>
                                    <Button variant="ghost" size="sm" onClick={copyMyId} className="h-5 gap-1 text-[10px] px-1.5 ml-1">
                                        {copiedId ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                                        {t("my_id")}
                                    </Button>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t("enter_user_id")}
                                        value={newMemberId}
                                        onChange={(e) => setNewMemberId(e.target.value)}
                                        className="flex-1 h-9 text-sm"
                                    />
                                    <Button onClick={handleAddMember} disabled={!newMemberId} size="sm" className="h-9">
                                        {t("add")}
                                    </Button>
                                </div>
                            </TabsContent>

                            <TabsContent value="guest" className="space-y-3 pt-3">
                                <div className="bg-muted p-2.5 rounded-md text-xs text-muted-foreground">
                                    <p>{t("guest_hint")}</p>
                                </div>
                                <div className="flex gap-2">
                                    <Input
                                        placeholder={t("guest_name")}
                                        value={newGuestName}
                                        onChange={(e) => setNewGuestName(e.target.value)}
                                        className="flex-1 h-9 text-sm"
                                    />
                                    <Button onClick={handleAddGuest} disabled={!newGuestName} size="sm" className="h-9">
                                        {t("add")}
                                    </Button>
                                </div>
                            </TabsContent>
                        </Tabs>
                    </AccordionContent>
                </AccordionItem>

                {/* Members List Section */}
                <AccordionItem value="members" className="border-b-0 border-t">
                    <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full">
                            <span className="flex items-center gap-2 text-sm font-medium">
                                <Users className="h-4 w-4" />
                                {t("members")} <span className="text-muted-foreground">({group.members.length})</span>
                            </span>
                            <Badge variant={isShareValid ? "outline" : "destructive"} className="mr-2 text-[10px] h-5 px-1.5 font-normal">
                                {totalShare.toFixed(2).replace(/\.00$/, "")}%
                            </Badge>
                        </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-0 pb-0">
                        <ScrollArea className="h-[350px] sm:h-[300px]">
                            <div className="space-y-1 px-4 pb-2">
                                {group.members.map((member) => (
                                    <div
                                        key={member.id}
                                        className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border bg-card/50 gap-3 text-sm"
                                    >
                                        {/* User Info */}
                                        <div className="flex items-center gap-3 overflow-hidden">
                                            {member.is_guest ? (
                                                <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 font-bold shrink-0 text-xs">
                                                    {member.guest_name ? member.guest_name.substring(0, 2).toUpperCase() : "??"}
                                                </div>
                                            ) : (
                                                <UserAvatar userId={member.user_id || ""} showName={false} className="h-8 w-8 shrink-0" />
                                            )}

                                            <div className="min-w-0 flex-1">
                                                <div className="font-medium flex items-center gap-1.5">
                                                    <span className="truncate max-w-[100px] sm:max-w-[150px]">
                                                        {member.is_guest
                                                            ? member.guest_name
                                                            : member.displayName || (member.user_id === user?.id ? t("you") : member.user_id?.substring(0, 8))}
                                                    </span>
                                                    {member.is_guest && <Badge variant="secondary" className="text-[9px] h-4 px-1 rounded-sm">{t("guest")}</Badge>}
                                                    {group.created_by === (member.user_id || "nocreator") && !member.is_guest && (
                                                        <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500 shrink-0" />
                                                    )}
                                                </div>
                                                <div className="text-[10px] text-muted-foreground truncate">
                                                    {member.is_guest ? t("managed_by_group") : member.profile?.email || "App User"}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Controls */}
                                        <div className="flex items-center justify-between sm:justify-end gap-3 w-full sm:w-auto mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-dashed sm:border-solid">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-muted-foreground sm:hidden tracking-tight">{t("your_share")}:</span>
                                                <div className="relative">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        value={memberShares[member.id] ?? member.share}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            // Allow empty string or valid decimal number (max 2 decimals)
                                                            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                // Prevent values > 100
                                                                if (val === "" || parseFloat(val) <= 100) {
                                                                    setMemberShares({
                                                                        ...memberShares,
                                                                        [member.id]: val,
                                                                    });
                                                                }
                                                            }
                                                        }}
                                                        className="w-20 h-7 text-right pr-6 py-0 text-xs"
                                                    />
                                                    <span className="absolute right-2 top-1.5 text-xs text-muted-foreground">%</span>
                                                </div>
                                            </div>

                                            {(member.user_id !== user?.id || member.is_guest) && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() => handleRemoveMember(member.id)}
                                                    className="text-destructive h-7 w-7 hover:bg-destructive/10 -mr-2"
                                                >
                                                    <UserMinus className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                        {!isShareValid && (
                            <div className="px-4 py-2 bg-destructive/10 text-destructive text-xs flex items-center gap-2 border-t border-destructive/20">
                                <AlertTriangle className="h-3 w-3" />
                                {t("shares_must_equal_100")}
                            </div>
                        )}
                    </AccordionContent>
                </AccordionItem>
            </Accordion>
        </div>
    );

    if (isMobile) {
        return (
            <Drawer open={open} onOpenChange={onOpenChange}>
                <DrawerContent className="h-[85vh] sm:h-auto font-sans">
                    <DrawerHeader>
                        <DrawerTitle>{t("manage_members")}</DrawerTitle>
                        <DrawerDescription>{group.name}</DrawerDescription>
                    </DrawerHeader>

                    {MainContent}

                    <DrawerFooter className="pt-2 border-t">
                        <Button onClick={handleSaveShares} disabled={!isShareValid} className="w-full">
                            {t("save_changes")}
                        </Button>
                        <DrawerClose asChild>
                            <Button variant="outline" className="w-full">{t("close")}</Button>
                        </DrawerClose>
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md max-h-[85vh] flex flex-col p-6">
                <DialogHeader>
                    <DialogTitle>{t("manage_members")}</DialogTitle>
                    <DialogDescription>{group.name}</DialogDescription>
                </DialogHeader>

                {MainContent}

                <DialogFooter>
                    <div className="flex flex-col sm:flex-row gap-2 w-full pt-2">
                        <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>{t("close")}</Button>
                        <Button onClick={handleSaveShares} disabled={!isShareValid} className="flex-1">
                            {t("save_changes")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
