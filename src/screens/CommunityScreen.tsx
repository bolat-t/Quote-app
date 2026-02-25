import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    Image,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl,
    Dimensions
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { useFocusEffect } from '@react-navigation/native';
import { fetchCommunityFeed, toggleLikeReflection, SharedReflection } from '../utils/communityStorage';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

export const CommunityScreen: React.FC = () => {
    const { user } = useAuth();
    const { theme } = useTheme();
    const [reflections, setReflections] = useState<SharedReflection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadReflections = async () => {
        setLoading(true);
        const data = await fetchCommunityFeed();
        setReflections(data);
        setLoading(false);
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        const data = await fetchCommunityFeed();
        setReflections(data);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadReflections();
        }, [])
    );

    const handleLike = async (id: string, currentLikes: number, isLiked: boolean) => {
        Haptics.selectionAsync();

        // Optimistic update
        setReflections(prev => prev.map(r =>
            r.id === id
                ? { ...r, likes_count: isLiked ? currentLikes - 1 : currentLikes + 1, is_liked_by_user: !isLiked }
                : r
        ));

        const success = await toggleLikeReflection(id, isLiked);
        if (!success) {
            // Revert if failed
            setReflections(prev => prev.map(r =>
                r.id === id
                    ? { ...r, likes_count: currentLikes, is_liked_by_user: isLiked }
                    : r
            ));
        }
    };

    const renderItem = ({ item }: { item: SharedReflection }) => (
        <View style={[styles.card, { borderColor: theme.colors.onSurface + '05' }]}>
            {/* Header/Date */}
            <Text style={[styles.date, { color: theme.colors.onSurface + '60' }]}>
                {new Date(item.created_at).toLocaleDateString()}
            </Text>

            {/* Quote ID */}
            <Text style={[styles.quoteId, { color: theme.colors.onSurface + '40' }]}>Quote #{item.quote_id.slice(0, 8)}</Text>

            {/* Reflection Text */}
            {item.reflection_text && (
                <Text style={[styles.reflectionText, { color: theme.colors.onSurface }]}>{item.reflection_text}</Text>
            )}

            {/* Canvas Image */}
            {item.canvas_image_url && (
                <Image
                    source={{ uri: item.canvas_image_url }}
                    style={styles.canvasImage}
                    resizeMode="contain"
                />
            )}

            {/* Footer with Like Button */}
            <View style={[styles.cardFooter, { borderTopColor: theme.colors.onSurface + '05' }]}>
                <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => handleLike(item.id, item.likes_count, !!item.is_liked_by_user)}
                >
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill={item.is_liked_by_user ? theme.colors.primary : "none"}>
                        <Path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            stroke={item.is_liked_by_user ? theme.colors.primary : theme.colors.onSurface}
                            strokeWidth={1.5}
                        />
                    </Svg>
                    <Text style={[styles.likeCount, { color: item.is_liked_by_user ? theme.colors.primary : theme.colors.onSurface }]}>
                        {item.likes_count}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Community Wall</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 20 }} color={theme.colors.primary} />
            ) : (
                <FlatList
                    data={reflections}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.colors.primary} />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>Be the first to share a reflection!</Text>
                        </View>
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: 8,
        borderBottomWidth: 1,
        borderBottomColor: '#1A1D2310',
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 32,
        color: '#1A1D23',
    },
    listContent: {
        padding: 16,
        gap: 24,
    },
    card: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
        borderWidth: 1,
    },
    date: {
        fontFamily: 'Carlito',
        fontSize: 12,
        marginBottom: 4,
    },
    quoteId: {
        fontFamily: 'Carlito',
        fontSize: 12,
        marginBottom: 12,
    },
    reflectionText: {
        fontFamily: 'Carlito',
        fontSize: 18,
        lineHeight: 26,
        marginBottom: 12,
    },
    canvasImage: {
        width: '100%',
        height: 200,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        marginBottom: 12,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingTop: 12,
        borderTopWidth: 1,
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 4,
    },
    likeCount: {
        fontFamily: 'Caveat-Bold',
        fontSize: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontFamily: 'Carlito',
        fontSize: 18,
        color: '#94A3B860',
    },
});
