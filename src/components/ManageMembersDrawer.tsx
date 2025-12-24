import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/contexts/AuthProvider";
import { useGroups, GroupWithMembers } from "@/hooks/useGroups";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    Crown,
    UserMinus,
    AlertTriangle,
    Check,
    Copy,
    ArrowLeft,
    X,
} from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
    DialogClose as DialogClosePrimitive,
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

    // State for managing view and inputs
    const [view, setView] = useState<"list" | "add">("list");
    const [newMemberId, setNewMemberId] = useState("");
    const [newGuestName, setNewGuestName] = useState("");
    const [memberShares, setMemberShares] = useState<Record<string, string>>({});
    const [copiedId, setCopiedId] = useState(false);

    if (!group) return null;

    // Derived state
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

    // Handlers
    const resetAddForm = () => {
        setNewMemberId("");
        setNewGuestName("");
    };

    const handleAddMember = async () => {
        if (!newMemberId.trim()) return;
        try {
            await addGroupMember(group.id, newMemberId, false);
            resetAddForm();
            setView("list");
        } catch (error) {
            console.error("Failed to add member:", error);
            // In a real app, use toast here
            alert(t("error_occurred"));
        }
    };

    const handleAddGuest = async () => {
        if (!newGuestName.trim()) return;
        try {
            await addGroupMember(group.id, newGuestName, true);
            resetAddForm();
            setView("list");
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

    // --- Sub-components (Helpers) ---

    const MemberAvatarPlaceholder = ({ name, isGuest }: { name: string; isGuest: boolean }) => {
        const initials = name.substring(0, 2).toUpperCase() || "??";
        // Simple deterministic color generation or static colors
        const bgColor = isGuest ? "bg-orange-100 text-orange-600" : "bg-primary/10 text-primary";

        return (
            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${bgColor}`}>
                {initials}
            </div>
        );
    };

    const AddMemberForm = () => (
        <div className="space-y-4 p-4">
            <Tabs defaultValue="invite" className="w-full">
                <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="invite">{t("invite_user")}</TabsTrigger>
                    <TabsTrigger value="guest">{t("add_guest")}</TabsTrigger>
                </TabsList>

                <TabsContent value="invite" className="space-y-4 pt-4">
                    <div className="bg-muted/50 p-3 rounded-md text-xs text-muted-foreground flex items-center justify-between border">
                        <span>{t("share_id_hint")}</span>
                        <Button variant="ghost" size="sm" onClick={copyMyId} className="h-6 text-[10px] px-2 ml-2">
                            {copiedId ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                            {t("my_id")}
                        </Button>
                    </div>
                    <div className="space-y-2">
                        <Input
                            placeholder={t("enter_user_id")}
                            value={newMemberId}
                            onChange={(e) => setNewMemberId(e.target.value)}
                        />
                        <Button onClick={handleAddMember} disabled={!newMemberId} className="w-full">
                            {t("send_invite")}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="guest" className="space-y-4 pt-4">
                    <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-md border">
                        {t("guest_hint")}
                    </p>
                    <div className="space-y-2">
                        <Input
                            placeholder={t("guest_name")}
                            value={newGuestName}
                            onChange={(e) => setNewGuestName(e.target.value)}
                        />
                        <Button onClick={handleAddGuest} disabled={!newGuestName} className="w-full">
                            {t("create_guest")}
                        </Button>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );

    // --- Mobile View ---

    // Header for Mobile
    const MobileHeader = () => (
        <DrawerHeader className="text-left border-b pb-4">
            <div className="flex justify-between items-start">
                <div>
                    <DrawerTitle>{view === "add" ? t("add_member") : t("manage_members")}</DrawerTitle>
                    <DrawerDescription className="mt-1">{group.name}</DrawerDescription>
                </div>
                {!isShareValid && view === "list" && (
                    <Badge variant="destructive" className="flex gap-1 animate-pulse">
                        <AlertTriangle className="h-3 w-3" />
                        {totalShare.toFixed(0)}%
                    </Badge>
                )}
            </div>
        </DrawerHeader>
    );

    if (isMobile) {
        return (
            <Drawer
                open={open}
                onOpenChange={(o) => {
                    if (!o) setView("list");
                    onOpenChange(o);
                }}
            >
                <DrawerContent className="h-[90vh] flex flex-col">
                    <MobileHeader />

                    <div className="flex-1 overflow-y-auto">
                        {view === "list" ? (
                            <div className="p-4 space-y-3">
                                {group.members.map((member) => {
                                    const displayName = member.is_guest
                                        ? member.guest_name
                                        : member.displayName || (member.user_id === user?.id ? t("you") : member.user_id?.substring(0, 8) || "Unknown");

                                    const isCreator = group.created_by === (member.user_id || "nocreator") && !member.is_guest;
                                    const canDelete = member.user_id !== user?.id || member.is_guest;

                                    return (
                                        <div key={member.id} className="flex items-center gap-3 p-3 bg-card border rounded-xl shadow-sm">
                                            <MemberAvatarPlaceholder name={displayName || "?"} isGuest={member.is_guest || false} />

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-1">
                                                    <span className="font-semibold text-sm truncate">{displayName}</span>
                                                    {isCreator && <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                                </div>
                                                <div className="text-xs text-muted-foreground truncate">
                                                    {member.is_guest ? t("guest") : member.profile?.email || "App User"}
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-end gap-2 w-[120px] shrink-0">
                                                <div className="relative w-16">
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="h-8 text-right pr-5 text-sm"
                                                        value={memberShares[member.id] ?? member.share}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                if (val === "" || parseFloat(val) <= 100) {
                                                                    setMemberShares({ ...memberShares, [member.id]: val });
                                                                }
                                                            }
                                                        }}
                                                    />
                                                    <span className="absolute right-2 top-2 text-xs text-muted-foreground">%</span>
                                                </div>

                                                <div className="w-8 flex justify-center">
                                                    {canDelete ? (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                        >
                                                            <UserMinus className="h-4 w-4" />
                                                        </Button>
                                                    ) : (
                                                        <div className="w-8 h-8" /> /* Spacer to maintain alignment */
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <AddMemberForm />
                        )}
                    </div>

                    <DrawerFooter className="border-t pt-4">
                        {view === "list" ? (
                            <div className="space-y-2">
                                <Button variant="outline" className="w-full" onClick={() => setView("add")}>
                                    {t("add_member")}
                                </Button>
                                <Button onClick={handleSaveShares} disabled={!isShareValid} className="w-full">
                                    {t("save_changes")}
                                </Button>
                                <DrawerClose asChild>
                                    <Button variant="ghost" className="w-full">{t("close")}</Button>
                                </DrawerClose>
                            </div>
                        ) : (
                            <div className="space-y-2">
                                <Button variant="outline" onClick={() => setView("list")} className="w-full">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    {t("back_to_list")}
                                </Button>
                            </div>
                        )}
                    </DrawerFooter>
                </DrawerContent>
            </Drawer>
        );
    }

    // --- Desktop View ---

    return (
        <Dialog open={open} onOpenChange={(o) => {
            if (!o) setView("list");
            onOpenChange(o);
        }}>
            {/* [&>button.absolute]:hidden removes the default close button from DialogContent */}
            <DialogContent className="max-w-2xl [&>button.absolute]:hidden">
                <DialogHeader>
                    <div className="flex items-center justify-between">
                        <div>
                            <DialogTitle>{t("manage_members")}</DialogTitle>
                            <DialogDescription>{group.name}</DialogDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            {view === "list" && (
                                <Button size="sm" variant="outline" onClick={() => setView("add")}>
                                    {t("add_member")}
                                </Button>
                            )}
                            <DialogClosePrimitive asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full">
                                    <X className="h-4 w-4" />
                                </Button>
                            </DialogClosePrimitive>
                        </div>
                    </div>
                </DialogHeader>

                <div className="mt-4 min-h-[300px]">
                    {view === "list" ? (
                        <div className="border rounded-md">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-[50px]"></TableHead>
                                        <TableHead>{t("name")}</TableHead>
                                        <TableHead>{t("type")}</TableHead>
                                        <TableHead className="text-right w-[100px]">{t("share")} (%)</TableHead>
                                        <TableHead className="w-[50px]"></TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {group.members.map((member) => {
                                        const displayName = member.is_guest
                                            ? member.guest_name
                                            : member.displayName || (member.user_id === user?.id ? t("you") : member.user_id?.substring(0, 8) || "Unknown");
                                        const isCreator = group.created_by === (member.user_id || "nocreator") && !member.is_guest;

                                        return (
                                            <TableRow key={member.id}>
                                                <TableCell>
                                                    <MemberAvatarPlaceholder name={displayName || "?"} isGuest={member.is_guest || false} />
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <span className="font-medium">{displayName}</span>
                                                        {isCreator && <Crown className="h-3 w-3 text-yellow-500 fill-yellow-500" />}
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={member.is_guest ? "secondary" : "outline"} className="font-normal">
                                                        {member.is_guest ? t("guest") : t("user")}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <Input
                                                        type="text"
                                                        inputMode="decimal"
                                                        className="h-8 text-right"
                                                        value={memberShares[member.id] ?? member.share}
                                                        onChange={(e) => {
                                                            const val = e.target.value;
                                                            if (val === "" || /^\d*\.?\d{0,2}$/.test(val)) {
                                                                if (val === "" || parseFloat(val) <= 100) {
                                                                    setMemberShares({ ...memberShares, [member.id]: val });
                                                                }
                                                            }
                                                        }}
                                                    />
                                                </TableCell>
                                                <TableCell>
                                                    {(member.user_id !== user?.id || member.is_guest) && (
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => handleRemoveMember(member.id)}
                                                        >
                                                            <UserMinus className="h-4 w-4" />
                                                        </Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </div>
                    ) : (
                        <div className="border rounded-md p-6">
                            <div className="mb-4">
                                <Button variant="ghost" size="sm" onClick={() => setView("list")} className="pl-0 hover:pl-2 transition-all">
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    {t("back_to_list")}
                                </Button>
                            </div>
                            <AddMemberForm />
                        </div>
                    )}
                </div>

                <DialogFooter className="flex items-center justify-between sm:justify-between gap-4 border-t pt-4">
                    <div className="flex items-center gap-2 text-sm">
                        {view === "list" && (
                            <>
                                <span className="text-muted-foreground">{t("total_share")}:</span>
                                <Badge variant={isShareValid ? "outline" : "destructive"}>
                                    {totalShare.toFixed(2).replace(/\.00$/, "")}%
                                </Badge>
                            </>
                        )}
                    </div>
                    <div className="flex gap-2">
                        <Button variant="outline" onClick={() => onOpenChange(false)}>{t("close")}</Button>
                        <Button onClick={handleSaveShares} disabled={!isShareValid}>
                            {t("save_changes")}
                        </Button>
                    </div>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
