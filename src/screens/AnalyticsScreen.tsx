import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';
import { getJournalEntries, JournalEntry } from '../utils/journalStorage';
import { Svg, Path, Circle, Line, Text as SvgText } from 'react-native-svg';

const { width: screenWidth } = Dimensions.get('window');

type NavProps = {
    navigation: any;
};

export const AnalyticsScreen: React.FC<NavProps> = ({ navigation }) => {
    const { theme } = useTheme();
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [averageMood, setAverageMood] = useState(0);
    const [tagCounts, setTagCounts] = useState<{ [tag: string]: number }>({});

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        const allEntries = await getJournalEntries();
        // Sort by date ascending
        const sorted = allEntries.sort((a, b) => a.createdAt - b.createdAt);
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
    };

    // Simple Line Chart Implementation
    const renderMoodChart = () => {
        const data = entries.filter(e => e.moodScore).slice(-7); // Last 7 entries with mood
        if (data.length < 2) return (
            <Text style={{ color: theme.colors.text, opacity: 0.5, textAlign: 'center', marginVertical: 20, fontFamily: 'Carlito' }}>
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
                            stroke={theme.colors.text}
                            strokeOpacity={0.1}
                            strokeDasharray="4 4"
                        />
                    ))}

                    {/* Line */}
                    <Path d={pathD} stroke={theme.colors.primary} strokeWidth={3} fill="none" />

                    {/* Dots */}
                    {data.map((e, i) => (
                        <Circle
                            key={i}
                            cx={getX(i)}
                            cy={getY(e.moodScore || 5)}
                            r={4}
                            fill={theme.colors.background}
                            stroke={theme.colors.primary}
                            strokeWidth={2}
                        />
                    ))}
                </Svg>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', width: width - 2 * padding, marginTop: 4 }}>
                    {data.map((e, i) => (
                        <Text key={i} style={{ fontSize: 10, color: theme.colors.text, opacity: 0.7 }}>
                            {new Date(e.date).getDate()}
                        </Text>
                    ))}
                </View>
            </View>
        );
    };

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginRight: 16 }}>
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                        <Path d="M15 18l-6-6 6-6" stroke={theme.colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>
                <Text style={[styles.title, { color: theme.colors.text }]}>Mood Analytics</Text>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Stats Cards */}
                <View style={styles.statsRow}>
                    <View style={[styles.statCard, { backgroundColor: theme.colors.paper }]}>
                        <Text style={[styles.statLabel, { color: theme.colors.accent }]}>AVG MOOD</Text>
                        <Text style={[styles.statValue, { color: theme.colors.primary }]}>{averageMood}</Text>
                        <Text style={[styles.statSub, { color: theme.colors.text }]}>/ 10</Text>
                    </View>
                    <View style={[styles.statCard, { backgroundColor: theme.colors.paper }]}>
                        <Text style={[styles.statLabel, { color: theme.colors.accent }]}>ENTRIES</Text>
                        <Text style={[styles.statValue, { color: theme.colors.primary }]}>{entries.length}</Text>
                        <Text style={[styles.statSub, { color: theme.colors.text }]}>Total</Text>
                    </View>
                </View>

                {/* Chart Section */}
                <View style={[styles.section, { backgroundColor: theme.colors.paper }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Mood Flow (Last 7 Entries)</Text>
                    {renderMoodChart()}
                </View>

                {/* Tags Cloud */}
                <View style={[styles.section, { backgroundColor: theme.colors.paper }]}>
                    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Emotional Themes</Text>
                    <View style={styles.tagCloud}>
                        {Object.entries(tagCounts)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 15) // Top 15 tags
                            .map(([tag, count], idx) => (
                                <View key={idx} style={[styles.cloudTag, { backgroundColor: theme.colors.background }]}>
                                    <Text style={[styles.cloudTagText, { color: theme.colors.text }]}>#{tag}</Text>
                                    <View style={[styles.countBadge, { backgroundColor: theme.colors.accent }]}>
                                        <Text style={styles.countText}>{count}</Text>
                                    </View>
                                </View>
                            ))}
                        {Object.keys(tagCounts).length === 0 && (
                            <Text style={{ color: theme.colors.text, opacity: 0.5, fontFamily: 'Carlito' }}>
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
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 24,
    },
    title: {
        fontSize: 28,
        fontFamily: 'Caveat-Bold',
    },
    content: {
        padding: 24,
        paddingTop: 0,
    },
    statsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 24,
    },
    statCard: {
        width: '48%',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
    },
    statLabel: {
        fontSize: 12,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    statValue: {
        fontSize: 32,
        fontFamily: 'Caveat-Bold',
    },
    statSub: {
        fontSize: 12,
        opacity: 0.6,
    },
    section: {
        padding: 20,
        borderRadius: 16,
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 18,
        fontFamily: 'Caveat-Bold',
        marginBottom: 16,
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
    },
    cloudTagText: {
        fontSize: 14,
        marginRight: 8,
        fontFamily: 'Carlito',
    },
    countBadge: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 10,
    },
    countText: {
        fontSize: 10,
        color: 'white',
        fontWeight: 'bold',
    },
});
