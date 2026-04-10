import { supabase } from '../lib/supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

export interface SharedReflection {
    id: string;
    user_id: string;
    quote_id: string; // stored as string; normalize with String() before insert
    reflection_text: string | null;
    canvas_image_url: string | null;
    likes_count: number;
    created_at: string;
    // profile join fields (populated when profiles table is joined)
    username?: string;
    avatar_url?: string;
    is_liked_by_user?: boolean;
}

export const fetchCommunityFeed = async (limit = 20, offset = 0): Promise<SharedReflection[]> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();

        // 1. Fetch reflections with profile join for display names
        const { data: reflections, error } = await supabase
            .from('shared_reflections')
            .select('*, profiles(username, avatar_url)')
            .order('created_at', { ascending: false })
            .range(offset, offset + limit - 1);

        if (error) throw error;
        if (!reflections || reflections.length === 0) return [];

        // Flatten the profiles join into the top-level object
        let items: SharedReflection[] = (reflections as any[]).map((r) => ({
            ...r,
            username: r.profiles?.username ?? null,
            avatar_url: r.profiles?.avatar_url ?? null,
            profiles: undefined,
        }));

        // 2. If user is logged in, fetch their likes for these reflections
        if (user) {
            const reflectionIds = items.map(r => r.id);
            const { data: likes, error: likesError } = await supabase
                .from('reflection_likes')
                .select('reflection_id')
                .eq('user_id', user.id)
                .in('reflection_id', reflectionIds);

            if (!likesError && likes) {
                const likedIds = new Set(likes.map(l => l.reflection_id));
                items = items.map(item => ({
                    ...item,
                    is_liked_by_user: likedIds.has(item.id)
                }));
            }
        }

        return items;

    } catch (error) {
        console.error('Error fetching community feed:', error);
        return [];
    }
};

export const uploadCommunityImage = async (imageUri: string): Promise<string | null> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        // Reverting to Base64 as fetch/blob caused Network Request Failed on invalid file:// URIs
        const base64 = await FileSystem.readAsStringAsync(imageUri, {
            encoding: 'base64',
        });

        const fileName = `${user.id}/${Date.now()}.png`;
        const { data, error } = await supabase.storage
            .from('community_images')
            .upload(fileName, decode(base64), {
                contentType: 'image/png',
                upsert: false
            });

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
            .from('community_images')
            .getPublicUrl(fileName);

        return publicUrl;
    } catch (error) {
        console.error('Error uploading community image:', error);
        return null;
    }
};

export const postReflectionToCommunity = async (
    quoteId: string | number,  // accepts both — Quote.id is number, community stores as string
    reflectionText?: string,
    canvasImageUrl?: string
): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const { error } = await supabase
            .from('shared_reflections')
            .insert({
                user_id: user.id,
                quote_id: String(quoteId),  // normalize to string
                reflection_text: reflectionText,
                canvas_image_url: canvasImageUrl,
            });

        if (error) throw error;
        return true;

    } catch (error) {
        console.error('Error posting to community:', error);
        return false;
    }
};

export const toggleLikeReflection = async (reflectionId: string, isLiked: boolean): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        if (isLiked) {
            // Retract like
            const { error } = await supabase
                .from('reflection_likes')
                .delete()
                .eq('reflection_id', reflectionId)
                .eq('user_id', user.id);
            if (error) throw error;

            // Decrement count (optimistic update happens in UI, but safe to do RPC or trigger if needed)
            // For simplicity, we just rely on the UI or refetch. 
            // To be proper, we should use an RPC function `decrement_likes`
            await supabase.rpc('decrement_likes', { row_id: reflectionId });

        } else {
            // Add like
            const { error } = await supabase
                .from('reflection_likes')
                .insert({ reflection_id: reflectionId, user_id: user.id });
            if (error) throw error;

            await supabase.rpc('increment_likes', { row_id: reflectionId });
        }

        return true;
    } catch (error) {
        console.error('Error toggling like:', error);
        return false;
    }
};
