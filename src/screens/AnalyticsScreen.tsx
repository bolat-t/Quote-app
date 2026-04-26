import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJournalEntries, JournalEntry, calculateStreak } from '../utils/journalStorage';
import { Svg, Path, Circle, Line } from 'react-native-svg';
import { ActivityRings } from '../components/ActivityRings';
import { BLACK, WHITE, YELLOW } from '../constants/colors';

const { width: screenWidth } = Dimensions.get('window');

type NavProps = {
    navigation: any;
};

export const AnalyticsScreen: React.FC<NavProps> = ({ navigation }) => {
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [averageMood, setAverageMood] = useState(0);
    const [streak, setStreak] = useState(0);
    const [tagCounts, setTagCounts] = useState<{ [tag: string]: number }>({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        setError(null);
        try {
            const [allEntries, currentStreak] = await Promise.all([
                getJournalEntries(),
                calculateStreak(),
            ]);
            setStreak(currentStreak);
            // Sort by date ascending
            const sorted = [...allEntries].sort((a, b) => a.createdAt - b.createdAt);
            setEntries(sorted);

            // Calc stats
            let totalMood = 0;
            let moodCount = 0;
            const tags: { [tag: string]: number } = {};

            sorted.forEach(e => {
                if (e.moodScore) {
                    totalMood += e.moodScore;
                    moodCount++;
                }
                if (e.sentimentTags) {
                    e.sentimentTags.forEach(t => {
                        tags[t] = (tags[t] || 0) + 1;
                    });
                }
            });

            setAverageMood(moodCount > 0 ? parseFloat((totalMood / moodCount).toFixed(1)) : 0);
            setTagCounts(tags);
        } catch {
            setError('Could not load your data. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    // Simple Line Chart Implementation
    const renderMoodChart = () => {
        const data = entries.filter(e => e.moodScore).slice(-7); // Last 7 entries with mood
        if (data.length < 2) return (
            <Text style={{ color: BLACK, opacity: 0.5, textAlign: 'center', marginVertical: 20, fontFamily: 'MontserratAlternates-ExtraBoldItalic' }}>
                Not enough data for chart yet. Keep journaling!
            </Text>
        );

        const height = 150;
        const width = screenWidth - 48;
        const padding = 20;

        // Scale
        const getX = (index: number) => padding + (index * ((width - 2 * padding) / (data.length - 1)));
        const getY = (score: number) => height - padding - ((score - 1) / 9) * (height - 2 * padding);

        // Path
        let pathD = `M ${getX(0)} ${getY(data[0].moodScore || 5)}`;
        data.forEach((e, i) => {
            if (i > 0) pathD += ` L ${getX(i)} ${getY(e.moodScore || 5)}`;
        });

        return (
            <View style={{ alignItems: 'center' }}>
                <Svg width={width} height={height}>
                    {/* Grid Lines */}
                    {[1, 5, 10].map(val => (
                        <Line
                            key={val}
                            x1={padding}
                            y1={getY(val)}
                            x2={width - padding}
                            y2={getY(val)}
                            stroke={BLACK}
                            strokeOpacity={0.1}
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Line */}
                    <Path d={pathD} stroke={YELLOW} strokeWidth={3} fill="none" />

                    {/* Dots */}
                    {data.map((e, i) => (
                        <Circle
                            key={i}
                            cx={getX(i)}
                            cy={getY(e.moodScore || 5)}
                            r={4}
                            fill={WHITE}
                            stroke={YELLOW}
                            strokeWidth={2}
                        />
                    ))}
                </Svg>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: width - 2 * padding, marginTop: 4 }}>
                    {data.map((e, i) => (
                        <Text key={i} style={{ fontSize: 10, color: BLACK, opacity: 0.7 }}>
                            {new Date(e.date).getDate()}
                        </Text>
                    ))}
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={BLACK} />
                <Text style={[styles.title, { fontSize: 16, marginTop: 12, opacity: 0.5 }]}>Loading your data…</Text>
            </SafeAreaView>
        );
    }

    if (error) {
        return (
            <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 }]}>
                <Text style={[styles.title, { fontSize: 18, textAlign: 'center', marginBottom: 16 }]}>Something went wrong</Text>
                <Text style={{ fontFamily: 'MontserratAlternates-ExtraBoldItalic', fontSize: 14, color: BLACK, opacity: 0.5, textAlign: 'center', marginBottom: 24 }}>{error}</Text>
                <TouchableOpacity
                    onPress={loadData}
                    style={{ backgroundColor: YELLOW, borderWidth: 2, borderColor: BLACK, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 32 }}
                    accessibilityLabel="Retry loading analytics"
                    accessibilityRole="button"
                >
                    <Text style={{ fontFamily: 'MontserratAlternates-ExtraBoldItalic', fontSize: 16, color: BLACK }}>Try Again</Text>
                </TouchableOpacity>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={{ marginRight: 16 }}
                    accessibilityLabel="Go back"
                    accessibilityRole="button"
                >
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path d="M15 18l-6-6 6-6" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>
                <Text style={styles.title}>Mood Analytics</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Activity Rings */}
                <ActivityRings
                    entriesTotal={entries.length}
                    streak={streak}
                    avgMood={averageMood}
                />

                {/* Chart Section */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mood Flow (Last 7 Entries)</Text>
                    {renderMoodChart()}
                </View>

                {/* Tags Cloud */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Emotional Themes</Text>
                    <View style={styles.tagCloud}>
                        {Object.entries(tagCounts)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 15) // Top 15 tags
                            .map(([tag, count], idx) => (
                                <View key={idx} style={styles.cloudTag}>
                                    <Text style={styles.cloudTagText}>#{tag}</Text>
                                    <View style={styles.countBadge}>
                                        <Text style={styles.countText}>{count}</Text>
                                    </View>
                                </View>
                            ))}
                        {Object.keys(tagCounts).length === 0 && (
                            <Text style={{ color: BLACK, opacity: 0.5, fontFamily: 'MontserratAlternates-ExtraBoldItalic' }}>
                                No emotions tagged yet.
                            </Text>
                        )}
                    </View>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        color: BLACK,
    },
    content: {
        padding: 24,
        paddingTop: 0,
    },
    section: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
        backgroundColor: WHITE,
        elevation: 6,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        marginBottom: 16,
        color: BLACK,
    },
    tagCloud: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    cloudTag: {
        paddingLeft: 12,
        paddingRight: 6,
        paddingVertical: 6,
        borderRadius: 20,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F0F0',
    },
    cloudTagText: {
        fontSize: 14,
        marginRight: 8,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        color: BLACK,
    },
    countBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
        backgroundColor: YELLOW,
    },
    countText: {
        fontSize: 10,
        color: BLACK,
        fontWeight: 'bold',
    },
});
