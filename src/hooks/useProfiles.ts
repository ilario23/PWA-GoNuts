import { useLiveQuery } from "dexie-react-hooks";
import { db, Profile } from "@/lib/db";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/contexts/AuthProvider";
import { toast } from "sonner";
import i18n from "@/i18n";
import { decryptFields, ENCRYPTED_FIELDS } from "@/lib/crypto-middleware";

/**
 * Hook to fetch user profiles from the local database.
 * 
 * @param userIds - Array of user IDs to fetch profiles for
 * @returns Map of userId -> Profile
 */
export function useProfiles(userIds: string[]) {
    const profiles = useLiveQuery(async () => {
        if (!userIds || userIds.length === 0) return {};

        // Deduplicate IDs
        const uniqueIds = [...new Set(userIds)];

        const result: Record<string, Profile> = {};
        const profileList = await db.profiles.bulkGet(uniqueIds);

        // Decrypt sensitive fields
        const fields = ENCRYPTED_FIELDS.profiles || [];
        for (const profile of profileList) {
            if (profile) {
                const decrypted = fields.length > 0
                    ? await decryptFields(profile as unknown as Record<string, unknown>, fields) as unknown as Profile
                    : profile;
                result[decrypted.id] = decrypted;
            }
        }

        return result;
    }, [userIds.join(",")]);

    return profiles || {};
}

/**
 * Hook to fetch a single user profile
 */
export function useProfile(userId: string | undefined) {
    const profile = useLiveQuery(async () => {
        if (!userId) return undefined;
        const rawProfile = await db.profiles.get(userId);
        if (!rawProfile) return undefined;
        // Decrypt sensitive fields
        const fields = ENCRYPTED_FIELDS.profiles || [];
        if (fields.length > 0) {
            return decryptFields(rawProfile as unknown as Record<string, unknown>, fields) as unknown as Profile;
        }
        return rawProfile;
    }, [userId]);

    return profile;
}

/**
 * Hook to update the current user's profile
 * Follows offline-first pattern like useSettings
 */
export function useUpdateProfile() {
    const { user } = useAuth();

    const updateProfile = async (updates: Partial<Pick<Profile, 'full_name' | 'avatar_url'>>) => {
        if (!user) {
            console.warn('[Profile] No user, cannot update profile');
            return;
        }

        const updatedAt = new Date().toISOString();

        try {
            // Check if profile exists
            const existing = await db.profiles.get(user.id);

            if (existing) {
                // Update existing profile
                await db.profiles.update(user.id, {
                    ...updates,
                    updated_at: updatedAt,
                    pendingSync: 1, // Mark for sync
                });
            } else {
                // Create new profile
                await db.profiles.add({
                    id: user.id,
                    email: user.email,
                    ...updates,
                    updated_at: updatedAt,
                    pendingSync: 1,
                });
            }

            // Sync to Supabase
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    ...updates,
                    updated_at: updatedAt,
                });

            if (error) {
                console.error('[Profile] Failed to sync to Supabase:', error);
                // Don't throw - offline support will handle this via pendingSync
                toast.warning(
                    i18n.t('profile_update_offline', {
                        defaultValue: 'Profile updated locally, will sync when online'
                    })
                );
            } else {
                // Clear pending sync flag on success
                await db.profiles.update(user.id, { pendingSync: 0 });
                toast.success(i18n.t('profile_updated', {
                    defaultValue: 'Profile updated successfully'
                }));
            }
        } catch (error) {
            console.error('[Profile] Failed to update:', error);
            toast.error(i18n.t('profile_update_error', {
                defaultValue: 'Failed to update profile'
            }));
            throw error;
        }
    };

    return { updateProfile };
}
