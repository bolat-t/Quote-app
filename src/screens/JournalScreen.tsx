import React, { useState, useCallback, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Image, Dimensions, ActivityIndicator } from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { useNavigation } from '@react-navigation/native';
import { Appbar } from 'react-native-paper';
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

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

// ---------- EntryCard ----------

const EntryCard: React.FC<{ entry: JournalEntry }> = ({ entry }) => {
    const time = new Date(entry.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit', minute: '2-digit', hour12: true,
    });
    const images = entry.images && entry.images.length > 0
        ? entry.images
        : entry.imageUri ? [entry.imageUri] : [];
    const hasText = entry.response && entry.response.trim().length > 0;

    return (
        <View style={card.wrap}>
            <Text style={card.timestamp}>{time}</Text>

            {entry.quoteText ? (
                <View style={card.quoteCard}>
                    <View style={card.quoteStrip} />
                    <View style={card.pad}>
                        <Text style={card.quoteText}>"{entry.quoteText}"</Text>
                    </View>
                </View>
            ) : null}

            {hasText ? (
                <View style={card.block}>
                    <View style={card.pad}>
                        <Text style={card.label}>Reflection</Text>
                        <Text style={card.body}>{entry.response}</Text>
                    </View>
                </View>
            ) : null}

            {images.length > 0 ? (
                <View>
                    <Text style={[card.label, { marginBottom: 8, marginLeft: 2 }]}>Canvas</Text>
                    {images.map((uri, i) => (
                        <View key={i} style={card.imgCard}>
                            <Image source={{ uri }} style={card.img} resizeMode="contain" />
                        </View>
                    ))}
                </View>
            ) : null}

            {entry.spiritReply ? (
                <View style={card.spiritCard}>
                    <View style={card.pad}>
                        <Text style={[card.label, { opacity: 0.65, color: BLACK }]}>✦  Ulbo's Reflection</Text>
                        <Text style={card.spiritText}>{entry.spiritReply}</Text>
                        {entry.sentimentTags && entry.sentimentTags.length > 0 ? (
                            <View style={card.tagRow}>
                                {entry.sentimentTags.slice(0, 4).map((tag, i) => (
                                    <View key={i} style={card.tag}>
                                        <Text style={card.tagText}>{tag}</Text>
                                    </View>
                                ))}
                            </View>
                        ) : null}
                    </View>
                </View>
            ) : null}
        </View>
    );
};

// ---------- HuntCard ----------

const HuntCard: React.FC<{ hunt: DailyHunt }> = ({ hunt }) => {
    const firstTime = hunt.entries[0]?.completedAt
        ? new Date(hunt.entries[0].completedAt).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : '';

    return (
        <View style={card.wrap}>
            {firstTime ? <Text style={card.timestamp}>{firstTime}</Text> : null}
            <View style={card.block}>
                <View style={card.huntHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={card.iconWrap}>
                            <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
                                <SvgCircle cx="12" cy="12" r="10" stroke={BLACK} strokeWidth={1.8} />
                                <SvgCircle cx="12" cy="12" r="6" stroke={BLACK} strokeWidth={1.5} />
                                <SvgCircle cx="12" cy="12" r="2" fill={BLACK} />
                                <SvgLine x1="12" y1="2" x2="12" y2="5" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="12" y1="19" x2="12" y2="22" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="2" y1="12" x2="5" y2="12" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="19" y1="12" x2="22" y2="12" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round" />
                            </Svg>
                        </View>
                        <Text style={card.huntTitle}>Positivity Hunt</Text>
                    </View>
                    {hunt.completed ? (
                        <View style={card.badge}>
                            <Text style={card.badgeText}>Complete</Text>
                        </View>
                    ) : null}
                </View>
                {hunt.entries.map((entry, i) => (
                    <View
                        key={i}
                        style={[
                            card.huntRow,
                            i < hunt.entries.length - 1 && { borderBottomWidth: 1, borderBottomColor: BLACK + '10' },
                        ]}
                    >
                        <View style={card.bullet} />
                        <Text style={[card.body, { flex: 1 }]}>{entry.text}</Text>
                    </View>
                ))}
            </View>
        </View>
    );
};

// ---------- SummaryCard ----------

const SummaryCard: React.FC<{ summary: string }> = ({ summary }) => (
    <View style={[card.spiritCard, { marginBottom: 20 }]}>
        <View style={card.pad}>
            <Text style={[card.label, { opacity: 0.65, color: BLACK }]}>✦  Daily Summary</Text>
            <Text style={card.spiritText}>{summary}</Text>
        </View>
    </View>
);

// ---------- VisionCard ----------

const VisionCard: React.FC<{ activities: VisionActivity[] }> = ({ activities }) => {
    const firstTime = activities[0]?.addedAt
        ? new Date(activities[0].addedAt).toLocaleTimeString('en-US', {
            hour: '2-digit', minute: '2-digit', hour12: true,
        })
        : '';
    const imageItems = activities.filter(a => a.type === 'image');
    const textItems = activities.filter(a => a.type === 'text');

    return (
        <View style={card.wrap}>
            {firstTime ? <Text style={card.timestamp}>{firstTime}</Text> : null}
            <View style={card.block}>
                <View style={card.huntHeader}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View style={card.iconWrap}>
                            <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
                                <SvgRect x="3" y="3" width="18" height="18" rx="3" stroke={BLACK} strokeWidth={1.8} />
                                <SvgPath d="M8 17l2.5-3.5L13 16l3-4 4 5" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                <SvgCircle cx="9" cy="9" r="2" stroke={BLACK} strokeWidth={1.5} />
                            </Svg>
                        </View>
                        <Text style={card.huntTitle}>Vision Board</Text>
                    </View>
                    <View style={card.badge}>
                        <Text style={card.badgeText}>
                            {activities.length} item{activities.length !== 1 ? 's' : ''}
                        </Text>
                    </View>
                </View>

                {imageItems.length > 0 ? (
                    <View style={card.visionImgRow}>
                        {imageItems.slice(0, 4).map((a, i) => (
                            <Image key={i} source={{ uri: a.content }} style={card.visionThumb} resizeMode="cover" />
                        ))}
                        {imageItems.length > 4 ? (
                            <View style={[card.visionThumb, { backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center' }]}>
                                <Text style={card.badgeText}>+{imageItems.length - 4}</Text>
                            </View>
                        ) : null}
                    </View>
                ) : null}

                {textItems.length > 0 ? (
                    <View style={{ padding: 14, paddingTop: imageItems.length > 0 ? 0 : 14 }}>
                        {textItems.slice(0, 3).map((a, i) => (
                            <Text key={i} style={[card.body, { marginBottom: 4 }]} numberOfLines={1}>
                                "{a.content}"
                            </Text>
                        ))}
                    </View>
                ) : null}
            </View>
        </View>
    );
};

// Shared card stylesheet
const card = StyleSheet.create({
    wrap: { marginBottom: 20 },
    timestamp: { fontFamily: 'Carlito', fontSize: 13, marginBottom: 6, marginLeft: 4, color: '#888888' },
    quoteCard: { borderRadius: 12, flexDirection: 'row', overflow: 'hidden', marginBottom: 8, backgroundColor: WHITE, elevation: 4, shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
    quoteStrip: { width: 5, backgroundColor: YELLOW },
    pad: { padding: 14, flex: 1 },
    quoteText: { fontStyle: 'italic', fontSize: 15, lineHeight: 22, color: BLACK },
    block: { borderRadius: 12, overflow: 'hidden', marginBottom: 8, backgroundColor: WHITE, elevation: 4, shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
    label: { fontSize: 11, fontFamily: 'Carlito-Bold', letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6, color: '#666666' },
    body: { fontFamily: 'Carlito', fontSize: 18, lineHeight: 28, color: BLACK },
    imgCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 8, elevation: 4, shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
    img: { width: '100%', height: screenWidth - 64 },
    spiritCard: { borderRadius: 12, overflow: 'hidden', marginBottom: 8, backgroundColor: YELLOW, elevation: 4, shadowColor: BLACK, shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 6 },
    spiritText: { fontFamily: 'IndieFlower-Regular', fontSize: 18, lineHeight: 27, color: BLACK },
    tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
    tag: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: BLACK + '15' },
    tagText: { fontFamily: 'Carlito-Bold', fontSize: 13, color: BLACK },
    huntHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderBottomWidth: 1, borderBottomColor: BLACK + '15',
    },
    huntTitle: { fontFamily: 'Caveat-Bold', fontSize: 20, color: BLACK },
    badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: YELLOW, elevation: 2, shadowColor: BLACK, shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
    badgeText: { fontFamily: 'Carlito-Bold', fontSize: 13, color: BLACK },
    huntRow: { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingHorizontal: 14, gap: 10 },
    bullet: { width: 8, height: 8, borderRadius: 4, marginTop: 7, flexShrink: 0, backgroundColor: YELLOW },
    iconWrap: { width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: YELLOW + '30' },
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
        dates.forEach(d => { marks[d] = { marked: true, dotColor: YELLOW }; });
        setMarkedDates(marks);
        setWeeklyData(history);
    }, []);

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
        <View style={styles.container}>
            <Appbar.Header style={{ backgroundColor: 'transparent' }} statusBarHeight={0}>
                <Appbar.Content title="Journal" titleStyle={{ fontFamily: 'GasoekOne', fontSize: 28, color: BLACK }} />
            </Appbar.Header>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                <View style={{ paddingHorizontal: 16 }}>
                    <Text style={{ color: '#888888', marginTop: -8, marginBottom: 16, fontFamily: 'Carlito-Italic', fontSize: 16 }}>
                        Your reflection history
                    </Text>

                    <ProgressChart data={weeklyData} />

                    <View style={styles.calendarCard}>
                        <Calendar
                            onDayPress={handleDayPress}
                            markedDates={{
                                ...markedDates,
                                ...(selectedDate ? {
                                    [selectedDate]: {
                                        ...markedDates[selectedDate],
                                        selected: true,
                                        selectedColor: YELLOW,
                                        selectedTextColor: BLACK,
                                    }
                                } : {}),
                            }}
                            theme={{
                                backgroundColor: WHITE,
                                calendarBackground: WHITE,
                                textSectionTitleColor: '#888888',
                                selectedDayBackgroundColor: YELLOW,
                                selectedDayTextColor: BLACK,
                                todayTextColor: BLACK,
                                dayTextColor: BLACK,
                                textDisabledColor: '#CCCCCC',
                                dotColor: YELLOW,
                                selectedDotColor: BLACK,
                                arrowColor: BLACK,
                                monthTextColor: BLACK,
                                textMonthFontFamily: 'GasoekOne',
                                textMonthFontSize: 22,
                                textDayHeaderFontFamily: 'GasoekOne',
                                textDayHeaderFontSize: 14,
                                textDayFontFamily: 'GasoekOne',
                                textDayFontSize: 16,
                            }}
                        />
                    </View>

                    {/* Activity feed */}
                    {selectedDate ? (
                        <View style={styles.feedSection}>
                            <Text style={styles.feedDateHeader}>
                                {new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
                                    weekday: 'long', month: 'long', day: 'numeric',
                                })}
                            </Text>

                            {loading ? (
                                <ActivityIndicator color={YELLOW} style={{ paddingVertical: 40 }} />
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
                                            stroke={BLACK + '60'} strokeWidth={1.5}
                                            strokeLinecap="round" strokeLinejoin="round"
                                        />
                                        <SvgPath
                                            d="M14 2v6h6"
                                            stroke={BLACK + '60'} strokeWidth={1.5}
                                            strokeLinecap="round" strokeLinejoin="round"
                                        />
                                        <SvgLine x1="8" y1="13" x2="16" y2="13" stroke={BLACK + '40'} strokeWidth={1.5} strokeLinecap="round" />
                                        <SvgLine x1="8" y1="17" x2="13" y2="17" stroke={BLACK + '40'} strokeWidth={1.5} strokeLinecap="round" />
                                    </Svg>
                                    <Text style={styles.emptyText}>No activity for this day</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={styles.emptyEntry}>
                            <Svg width={48} height={48} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 8 }}>
                                <SvgRect x="3" y="4" width="18" height="18" rx="2" stroke={BLACK + '60'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                <SvgLine x1="16" y1="2" x2="16" y2="6" stroke={BLACK + '60'} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="8" y1="2" x2="8" y2="6" stroke={BLACK + '60'} strokeWidth={1.5} strokeLinecap="round" />
                                <SvgLine x1="3" y1="10" x2="21" y2="10" stroke={BLACK + '60'} strokeWidth={1.5} strokeLinecap="round" />
                            </Svg>
                            <Text style={styles.emptyText}>Tap a date to view your reflections</Text>
                        </View>
                    )}
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: WHITE },
    scrollView: { flex: 1 },
    calendarCard: {
        borderRadius: 16,
        padding: 8,
        marginBottom: 24,
        overflow: 'hidden',
        backgroundColor: WHITE,
        elevation: 8,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    feedSection: { marginBottom: 16 },
    feedDateHeader: {
        fontFamily: 'Caveat-Bold',
        fontSize: 26,
        marginBottom: 16,
        color: BLACK,
    },
    emptyEntry: {
        alignItems: 'center',
        paddingVertical: 40,
        opacity: 0.7,
    },
    emptyText: {
        fontFamily: 'Carlito',
        fontSize: 15,
        color: '#888888',
    },
});

export default JournalScreen;
