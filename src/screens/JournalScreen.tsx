import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { Text, Surface, Appbar, useTheme } from 'react-native-paper';
import Svg, { Path as SvgPath, Rect as SvgRect, Line as SvgLine, Circle as SvgCircle } from 'react-native-svg';
import type { TabScreenNavigationProp } from '../types';
import { DailyHunt } from '../types';
import {
    getJournalEntriesByDate,
    getAllJournalDates,
    JournalEntry,
    getWeeklyHistory,
    getDailySummary,
} from '../utils/journalStorage';
import { loadDailyHunt } from '../utils/progressionStorage';
import { getVisionActivity, VisionActivity } from '../utils/visionBoardStorage';
import { trackEvent } from '../lib/analytics';
import { ProgressChart } from '../components/ProgressChart';

const { width: screenWidth } = Dimensions.get('window');

// ---------- EntryCard ----------

const EntryCard: React.FC<{ entry: JournalEntry }> = ({ entry }) => {
    const theme = useTheme();
    const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const images = entry.images && entry.images.length > 0
        ? entry.images
        : entry.imageUri ? [entry.imageUri] : [];
    const hasText = entry.response && entry.response.trim().length > 0;

    return (
        <View style={card.wrap}>
            <Text style={[card.timestamp, { color: theme.colors.outline }]}>{time}</Text>

            {entry.quoteText ? (
                <Surface style={[card.quoteCard, { backgroundColor: theme.colors.surfaceVariant }]} elevation={0}>
                    <View style={[card.quoteStrip, { backgroundColor: theme.colors.primary }]} />
                    <View style={card.pad}>
                        <Text style={[card.quoteText, { color: theme.colors.onSurfaceVariant }]}>
                            "{entry.quoteText}"
                        </Text>
                    </View>
                </Surface>
            ) : null}

            {hasText ? (
                <Surface style={[card.block, { backgroundColor: theme.colors.surface }]} elevation={1}>
                    <View style={card.pad}>
                        <Text style={[card.label, { color: theme.colors.outline }]}>Reflection</Text>
                        <Text style={[card.body, { color: theme.colors.onSurface }]}>{entry.response}</Text>
                    </View>
                </Surface>
            ) : null}

            {images.length > 0 ? (
                <View>
                    <Text style={[card.label, { color: theme.colors.outline, marginBottom: 8, marginLeft: 2 }]}>Canvas</Text>
                    {images.map((uri, i) => (
                        <Surface key={i} style={[card.imgCard, { backgroundColor: theme.colors.surface }]} elevation={1}>
                            <Image source={{ uri }} style={card.img} resizeMode="contain" />
                        </Surface>
                    ))}
                </View>
            ) : null}

            {entry.spiritReply ? (
                <Surface style={[card.spiritCard, { backgroundColor: theme.colors.primaryContainer }]} elevation={0}>
                    <View style={card.pad}>
                        <Text style={[card.label, { color: theme.colors.onPrimaryContainer, opacity: 0.65 }]}>
                            ✦  Ulbo's Reflection
                        </Text>
                        <Text style={[card.spiritText, { color: theme.colors.onPrimaryContainer }]}>
                            {entry.spiritReply}
                        </Text>
                        {entry.sentimentTags && entry.sentimentTags.length > 0 ? (
                            <View style={card.tagRow}>
                                {entry.sentimentTags.slice(0, 4).map((tag, i) => (
                                    <View key={i} style={[card.tag, { backgroundColor: theme.colors.primary + '28' }]}>
                                        <Text style={[card.tagText, { color: theme.colors.primary }]}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                </Surface>
            ) : null}
        </View>
    );
};

// ---------- HuntCard ----------

const HuntCard: React.FC<{ hunt: DailyHunt }> = ({ hunt }) => {
    const theme = useTheme();
    const firstTime = hunt.entries[0]?.completedAt
        ? new Date(hunt.entries[0].completedAt).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : '';

    return (
        <View style={card.wrap}>
            {firstTime ? <Text style={[card.timestamp, { color: theme.colors.outline }]}>{firstTime}</Text> : null}
            <Surface style={[card.block, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={[card.huntHeader, { borderBottomColor: theme.colors.outline + '20' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[card.iconWrap, { backgroundColor: theme.colors.primary + '14' }]}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                <SvgCircle cx="12" cy="12" r="10" stroke={theme.colors.primary} strokeWidth={1.8} />
                                <SvgCircle cx="12" cy="12" r="6" stroke={theme.colors.primary} strokeWidth={1.5} />
                                <SvgCircle cx="12" cy="12" r="2" fill={theme.colors.primary} />
                                <SvgLine x1="12" y1="2" x2="12" y2="5" stroke={theme.colors.primary} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="12" y1="19" x2="12" y2="22" stroke={theme.colors.primary} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="2" y1="12" x2="5" y2="12" stroke={theme.colors.primary} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="19" y1="12" x2="22" y2="12" stroke={theme.colors.primary} strokeWidth={1.5} strokeLinecap="round" />
                            </Svg>
                        </View>
                        <Text style={[card.huntTitle, { color: theme.colors.onSurface }]}>Positivity Hunt</Text>
                    </View>
                    {hunt.completed ? (
                        <View style={[card.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                            <Text style={[card.badgeText, { color: theme.colors.primary }]}>Complete</Text>
                        </View>
                    ) : null}
                </View>
                {hunt.entries.map((entry, i) => (
                    <View
                        key={i}
                        style={[
                            card.huntRow,
                            i < hunt.entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.colors.outline + '10' },
                        ]}
                    >
                        <View style={[card.bullet, { backgroundColor: theme.colors.primary }]} />
                        <Text style={[card.body, { color: theme.colors.onSurface, flex: 1 }]}>{entry.text}</Text>
                    </View>
                ))}
            </Surface>
        </View>
    );
};

// ---------- SummaryCard ----------

const SummaryCard: React.FC<{ summary: string }> = ({ summary }) => {
    const theme = useTheme();
    return (
        <Surface
            style={[card.spiritCard, {
                backgroundColor: (theme.colors as any).secondaryContainer ?? theme.colors.surfaceVariant,
                marginBottom: 20,
            }]}
            elevation={0}
        >
            <View style={card.pad}>
                <Text style={[card.label, {
                    color: (theme.colors as any).onSecondaryContainer ?? theme.colors.onSurfaceVariant,
                    opacity: 0.65,
                }]}>
                    ✦  Daily Summary
                </Text>
                <Text style={[card.spiritText, {
                    color: (theme.colors as any).onSecondaryContainer ?? theme.colors.onSurfaceVariant,
                }]}>
                    {summary}
                </Text>
            </View>
        </Surface>
    );
};

// ---------- VisionCard ----------

const VisionCard: React.FC<{ activities: VisionActivity[] }> = ({ activities }) => {
    const theme = useTheme();
    const firstTime = activities[0]?.addedAt
        ? new Date(activities[0].addedAt).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : '';
    const imageItems = activities.filter(a => a.type === 'image');
    const textItems = activities.filter(a => a.type === 'text');

    return (
        <View style={card.wrap}>
            {firstTime ? <Text style={[card.timestamp, { color: theme.colors.outline }]}>{firstTime}</Text> : null}
            <Surface style={[card.block, { backgroundColor: theme.colors.surface }]} elevation={1}>
                <View style={[card.huntHeader, { borderBottomColor: theme.colors.outline + '20' }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={[card.iconWrap, { backgroundColor: theme.colors.primary + '14' }]}>
                            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                                <SvgRect x="3" y="3" width="18" height="18" rx="3" stroke={theme.colors.primary} strokeWidth={1.8} />
                                <SvgPath d="M8 17l2.5-3.5L13 16l3-4 4 5" stroke={theme.colors.primary} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                <SvgCircle cx="9" cy="9" r="2" stroke={theme.colors.primary} strokeWidth={1.5} />
                            </Svg>
                        </View>
                        <Text style={[card.huntTitle, { color: theme.colors.onSurface }]}>Vision Board</Text>
                    </View>
                    <View style={[card.badge, { backgroundColor: theme.colors.primary + '20' }]}>
                        <Text style={[card.badgeText, { color: theme.colors.primary }]}>
                            {activities.length} item{activities.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {/* Image thumbnails row */}
                {imageItems.length > 0 ? (
                    <View style={card.visionImgRow}>
                        {imageItems.slice(0, 4).map((a, i) => (
                            <Image key={i} source={{ uri: a.content }} style={card.visionThumb} resizeMode="cover" />
                        ))}
                        {imageItems.length > 4 ? (
                            <View style={[card.visionThumb, { backgroundColor: theme.colors.surfaceVariant, alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={[card.badgeText, { color: theme.colors.outline }]}>+{imageItems.length - 4}</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {/* Text affirmations */}
                {textItems.length > 0 ? (
                    <View style={{ padding: 14, paddingTop: imageItems.length > 0 ? 0 : 14 }}>
                        {textItems.slice(0, 3).map((a, i) => (
                            <Text key={i} style={[card.body, { color: theme.colors.onSurface, marginBottom: 4 }]} numberOfLines={1}>
                                "{a.content}"
                            </Text>
                        ))}
                    </View>
                ) : null}
            </Surface>
        </View>
    );
};

// Shared card stylesheet
const card = StyleSheet.create({
    wrap: { marginBottom: 20 },
    timestamp: { fontFamily: 'Caveat', fontSize: 13, marginBottom: 6, marginLeft: 4 },
    quoteCard: { borderRadius: 12, flexDirection: 'row', overflow: 'hidden', marginBottom: 8 },
    quoteStrip: { width: 5 },
    pad: { padding: 14 },
    quoteText: { fontStyle: 'italic', fontSize: 15, lineHeight: 22 },
    block: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
    label: { fontSize: 11, fontFamily: 'Caveat-Bold', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 6 },
    body: { fontFamily: 'Caveat', fontSize: 19, lineHeight: 27 },
    imgCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
    img: { width: '100%', height: screenWidth - 64 },
    spiritCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 8 },
    spiritText: { fontFamily: 'Caveat', fontSize: 18, lineHeight: 26 },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    tagText: { fontFamily: 'Caveat-Medium', fontSize: 13 },
    huntHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderBottomWidth: 1,
    },
    huntTitle: { fontFamily: 'Caveat-Bold', fontSize: 18 },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
    badgeText: { fontFamily: 'Caveat-Medium', fontSize: 13 },
    huntRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingHorizontal: 14, gap: 10 },
    bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 7, flexShrink: 0 },
    iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    visionImgRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, padding: 14 },
    visionThumb: { width: 56, height: 56, borderRadius: 8, overflow: 'hidden' },
});

// ---------- Feed item type ----------

type FeedItem =
    | { kind: 'journal'; entry: JournalEntry; time: number }
    | { kind: 'hunt'; hunt: DailyHunt; time: number }
    | { kind: 'vision'; activities: VisionActivity[]; time: number };

// ---------- Main screen ----------

export const JournalScreen: React.FC = () => {
    const navigation = useNavigation<TabScreenNavigationProp<'Journal'>>();
    const theme = useTheme();
    const [selectedDate, setSelectedDate] = useState('');
    const [markedDates, setMarkedDates] = useState<Record<string, any>>({});
    const [weeklyData, setWeeklyData] = useState<{ day: string; date: string; completed: boolean; isToday: boolean }[]>([]);
    const [entries, setEntries] = useState<JournalEntry[]>([]);
    const [hunt, setHunt] = useState<DailyHunt | null>(null);
    const [visionActivities, setVisionActivities] = useState<VisionActivity[]>([]);
    const [dailySummary, setDailySummary] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const loadBaseData = useCallback(async () => {
        const [dates, history] = await Promise.all([getAllJournalDates(), getWeeklyHistory()]);
        const marks: Record<string, any> = {};
        dates.forEach(d => { marks[d] = { marked: true, dotColor: theme.colors.primary }; });
        setMarkedDates(marks);
        setWeeklyData(history);
    }, [theme.colors.primary]);

    const loadDateData = useCallback(async (date: string) => {
        setLoading(true);
        try {
            const [allEntries, huntData, summary, visionLog] = await Promise.all([
                getJournalEntriesByDate(date),
                loadDailyHunt(date),
                getDailySummary(date),
                getVisionActivity(date),
            ]);
            setEntries(allEntries);
            setHunt(huntData.entries.length > 0 ? huntData : null);
            setVisionActivities(visionLog);
            setDailySummary(summary);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadBaseData(); }, [loadBaseData]);

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            loadBaseData();
            if (selectedDate) loadDateData(selectedDate);
        });
        return unsubscribe;
    }, [navigation, loadBaseData, loadDateData, selectedDate]);

    const handleDayPress = useCallback(async (day: DateData) => {
        setSelectedDate(day.dateString);
        await loadDateData(day.dateString);
        trackEvent('journal_entry_viewed', { date: day.dateString });
    }, [loadDateData]);

    // Build chronological feed
    const feedItems: FeedItem[] = [
        ...entries.map(e => ({ kind: 'journal' as const, entry: e, time: e.createdAt })),
        ...(hunt ? [{
            kind: 'hunt' as const,
            hunt,
            time: hunt.entries[0]?.completedAt
                ? new Date(hunt.entries[0].completedAt).getTime()
                : 0,
        }] : []),
        ...(visionActivities.length > 0 ? [{
            kind: 'vision' as const,
            activities: visionActivities,
            time: new Date(visionActivities[0].addedAt).getTime(),
        }] : []),
    ].sort((a, b) => a.time - b.time);

    const hasActivity = feedItems.length > 0;

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
            <Appbar.Header style={{ backgroundColor: 'transparent' }} statusBarHeight={0}>
                <Appbar.Content title="Journal" titleStyle={{ fontFamily: 'Caveat-Bold', fontSize: 28 }} />
            </Appbar.Header>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ paddingHorizontal: 16 }}>
                    <Text variant="titleMedium" style={{ color: theme.colors.outline, marginTop: -8, marginBottom: 16 }}>
                        Your reflection history
                    </Text>

                    <ProgressChart data={weeklyData} />

                    <Surface style={[styles.calendarCard, { backgroundColor: theme.colors.surface }]} elevation={2}>
                        <Calendar
                            onDayPress={handleDayPress}
                            markedDates={{
                                ...markedDates,
                                ...(selectedDate ? {
                                    [selectedDate]: {
                                        ...markedDates[selectedDate],
                                        selected: true,
                                        selectedColor: theme.colors.primaryContainer,
                                        selectedTextColor: theme.colors.onPrimaryContainer,
                                    }
                                } : {}),
                            }}
                            theme={{
                                backgroundColor: theme.colors.surface,
                                calendarBackground: theme.colors.surface,
                                textSectionTitleColor: theme.colors.outline,
                                selectedDayBackgroundColor: theme.colors.primaryContainer,
                                selectedDayTextColor: theme.colors.onPrimaryContainer,
                                todayTextColor: theme.colors.primary,
                                dayTextColor: theme.colors.onSurface,
                                textDisabledColor: theme.colors.onSurfaceDisabled,
                                dotColor: theme.colors.primary,
                                selectedDotColor: theme.colors.primary,
                                arrowColor: theme.colors.primary,
                                monthTextColor: theme.colors.onSurface,
                                textMonthFontFamily: 'Caveat-Bold',
                                textMonthFontSize: 22,
                                textDayHeaderFontFamily: 'Caveat',
                                textDayHeaderFontSize: 14,
                                textDayFontFamily: 'Caveat',
                                textDayFontSize: 16,
                            }}
                        />
                    </Surface>

                    {/* Activity feed */}
                    {selectedDate ? (
                        <View style={styles.feedSection}>
                            <Text
                                variant="headlineSmall"
                                style={{ fontFamily: 'Caveat-Bold', marginBottom: 16, color: theme.colors.onBackground }}
                            >
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long', month: 'long', day: 'numeric',
                                })}
                            </Text>

                            {loading ? (
                                <ActivityIndicator color={theme.colors.primary} style={{ paddingVertical: 40 }} />
                            ) : hasActivity ? (
                                <>
                                    {dailySummary ? <SummaryCard summary={dailySummary} /> : null}
                                    {feedItems.map((item, i) =>
                                        item.kind === 'journal'
                                            ? <EntryCard key={item.entry.id} entry={item.entry} />
                                            : item.kind === 'hunt'
                                                ? <HuntCard key={`hunt-${i}`} hunt={item.hunt} />
                                                : <VisionCard key={`vision-${i}`} activities={item.activities} />
                                    )}
                                </>
                            ) : (
                                <View style={styles.emptyEntry}>
                                    <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
                                        <SvgPath
                                            d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                            stroke={theme.colors.outline + '60'} strokeWidth={1.5}
                                            strokeLinecap="round" strokeLinejoin="round"
                                        />
                                        <SvgPath
                                            d="M14 2v6h6"
                                            stroke={theme.colors.outline + '60'} strokeWidth={1.5}
                                            strokeLinecap="round" strokeLinejoin="round"
                                        />
                                        <SvgLine x1="8" y1="13" x2="16" y2="13" stroke={theme.colors.outline + '40'} strokeWidth={1.5} strokeLinecap="round" />
                                        <SvgLine x1="8" y1="17" x2="13" y2="17" stroke={theme.colors.outline + '40'} strokeWidth={1.5} strokeLinecap="round" />
                                    </Svg>
                                    <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>No activity for this day</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.emptyEntry}>
                            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
                                <SvgRect x="3" y="4" width="18" height="18" rx="2" stroke={theme.colors.outline + '60'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                <SvgLine x1="16" y1="2" x2="16" y2="6" stroke={theme.colors.outline + '60'} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="8" y1="2" x2="8" y2="6" stroke={theme.colors.outline + '60'} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="3" y1="10" x2="21" y2="10" stroke={theme.colors.outline + '60'} strokeWidth={1.5} strokeLinecap="round" />
                            </Svg>
                            <Text variant="bodyLarge" style={{ color: theme.colors.outline }}>Tap a date to view your reflections</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1 },
    scrollView: { flex: 1 },
    calendarCard: {
        borderRadius: 16,
        padding: 8,
        marginBottom: 24,
        overflow: 'hidden',
    },
    feedSection: { marginBottom: 16 },
    emptyEntry: {
        alignItems: 'center',
        paddingVertical: 40,
        opacity: 0.7,
    },
});

export default JournalScreen;
