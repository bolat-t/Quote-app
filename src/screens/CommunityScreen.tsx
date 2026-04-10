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

const { width } = Dimensions.get('window');

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export const CommunityScreen: React.FC = () => {
    const { user } = useAuth();
    const [reflections, setReflections] = useState<SharedReflection[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadReflections = async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await fetchCommunityFeed();
            setReflections(data);
        } catch {
            setError('Could not load the community feed. Pull down to try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        setError(null);
        try {
            const data = await fetchCommunityFeed();
            setReflections(data);
        } catch {
            setError('Could not refresh. Try again.');
        } finally {
            setRefreshing(false);
        }
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
        <View style={styles.card}>
            {/* Header/Date */}
            <Text style={styles.date}>
                {formatDate(item.created_at)}
            </Text>

            {/* Quote ID */}
            <Text style={styles.quoteId}>Quote #{item.quote_id.slice(0, 8)}</Text>

            {/* Reflection Text */}
            {item.reflection_text && (
                <Text style={styles.reflectionText}>{item.reflection_text}</Text>
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
            <View style={styles.cardFooter}>
                <TouchableOpacity
                    style={styles.likeButton}
                    onPress={() => handleLike(item.id, item.likes_count, !!item.is_liked_by_user)}
                    accessibilityLabel={item.is_liked_by_user ? `Unlike, ${item.likes_count} likes` : `Like, ${item.likes_count} likes`}
                    accessibilityRole="button"
                    accessibilityState={{ selected: !!item.is_liked_by_user }}
                >
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill={item.is_liked_by_user ? YELLOW : 'none'}>
                        <Path
                            d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
                            stroke={item.is_liked_by_user ? BLACK : BLACK}
                            strokeWidth={1.5}
                        />
                    </Svg>
                    <Text style={[styles.likeCount, { color: item.is_liked_by_user ? BLACK : BLACK + '70' }]}>
                        {item.likes_count}
                    </Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    return (
        <SafeAreaView style={styles.container} edges={['top']}>
            <View style={styles.header}>
                <Text style={styles.title}>Community Wall</Text>
            </View>

            {loading ? (
                <ActivityIndicator style={{ marginTop: 40 }} color={BLACK} />
            ) : error ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity
                        style={styles.retryBtn}
                        onPress={loadReflections}
                        accessibilityLabel="Retry loading community feed"
                        accessibilityRole="button"
                    >
                        <Text style={styles.retryText}>Try Again</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={reflections}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={BLACK} />
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
        backgroundColor: WHITE,
    },
    header: {
        paddingHorizontal: 24,
        paddingBottom: 16,
        paddingTop: 8,
        borderBottomWidth: 2,
        borderBottomColor: BLACK,
    },
    title: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 32,
        color: BLACK,
    },
    listContent: {
        padding: 16,
        gap: 24,
    },
    card: {
        backgroundColor: WHITE,
        borderRadius: 16,
        padding: 16,
        borderWidth: 2,
        borderColor: BLACK,
    },
    date: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 12,
        marginBottom: 4,
        color: BLACK + '60',
    },
    quoteId: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 12,
        marginBottom: 12,
        color: BLACK + '40',
    },
    reflectionText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
        lineHeight: 26,
        marginBottom: 12,
        color: BLACK,
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
        borderTopColor: BLACK + '15',
    },
    likeButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        padding: 4,
    },
    likeCount: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
    },
    emptyText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 18,
        color: BLACK + '60',
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 60,
        paddingHorizontal: 32,
        gap: 16,
    },
    errorText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
        color: BLACK,
        opacity: 0.6,
        textAlign: 'center',
    },
    retryBtn: {
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 16,
        paddingVertical: 12,
        paddingHorizontal: 28,
    },
    retryText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 15,
        color: BLACK,
    },
});
