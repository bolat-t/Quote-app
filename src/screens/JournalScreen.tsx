/**
 * JournalScreen — renders the "History" tab.
 *
 * Infinite-scroll timeline of every past day's emotion, 3-things and reflect
 * entries. Earlier versions were a single-day journal view (hence the file
 * name); kept stable to avoid churning imports.
 */
import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image,
    ActivityIndicator, TouchableOpacity,
    NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
const potatoAvatar = require('../../assets/chat_potato.png');
import Svg, { Path as SvgPath } from 'react-native-svg';
import type { TabScreenNavigationProp } from '../types';
import { DailyHunt } from '../types';
import {
    getJournalEntries,
    JournalEntry,
} from '../utils/journalStorage';
import { loadAllDailyHunts } from '../utils/progressionStorage';
import { loadAllVisionActivities, VisionActivity } from '../utils/visionBoardStorage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { trackEvent } from '../lib/analytics';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { useHistoryCalendar } from '../context/HistoryCalendarContext';

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

// ─── Helpers ────────────────────────────────────────────────────────────────

const pad = (n: number) => String(n).padStart(2, '0');
const toDateStr = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

type MoodLevel = 1 | 2 | 3 | 4 | 5;

const getMoodLevel = (score?: number): MoodLevel | null => {
    if (!score) return null;
    const s = Math.max(1, Math.min(10, Math.round(score)));
    if (s <= 2) return 1;
    if (s <= 4) return 2;
    if (s <= 6) return 3;
    if (s <= 8) return 4;
    return 5;
};

// ─── MoodFace ────────────────────────────────────────────────────────────────

const MOOD_POTATO_IMAGES: Record<MoodLevel, any> = {
    1: require('../../assets/mascot/potato_emotion_states/potato_upset_selected.png'),
    2: require('../../assets/mascot/potato_emotion_states/potato_sad_selected.png'),
    3: require('../../assets/mascot/potato_emotion_states/potato_bored_selected.png'),
    4: require('../../assets/mascot/potato_emotion_states/potato_happy_unselected.png'),
    5: require('../../assets/mascot/potato_emotion_states/potato_happy_selected.png'),
};

const MoodFace: React.FC<{ level: MoodLevel; size?: number }> = ({ level, size = 26 }) => (
    <Image
        source={MOOD_POTATO_IMAGES[level]}
        style={{ width: size, height: size }}
        resizeMode="contain"
    />
);

// ─── Shared types ────────────────────────────────────────────────────────────

type MoodMap = Record<string, { score?: number; hasEntry: boolean }>;

// ─── Shared SVGs ─────────────────────────────────────────────────────────────

const ChevronLeft = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M15 18l-6-6 6-6" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
const ChevronRight = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M9 18l6-6-6-6" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

// ─── New History page components ──────────────────────────────────────────────

// Horizontal 7-day strip — just *this* week (Sunday → Saturday).
// Selected day = solid yellow circle (no border).
const DayStrip: React.FC<{
    moodMap: MoodMap;
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
}> = ({ moodMap: _moodMap, selectedDate, onDayPress }) => {
    const days = React.useMemo(() => {
        const base = new Date();
        base.setHours(0, 0, 0, 0);
        // getDay(): Sunday = 0, Saturday = 6
        const sunday = new Date(base);
        sunday.setDate(base.getDate() - base.getDay());
        const arr: string[] = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(sunday);
            d.setDate(sunday.getDate() + i);
            arr.push(toDateStr(d));
        }
        return arr;
    }, []);

    return (
        <View style={dayStripStyles.pill}>
            {days.map(d => {
                const dayNum   = parseInt(d.slice(-2), 10);
                const selected = d === selectedDate;
                return (
                    <TouchableOpacity
                        key={d}
                        style={dayStripStyles.dayWrap}
                        onPress={() => onDayPress(d)}
                        activeOpacity={0.7}
                    >
                        <View style={[dayStripStyles.circle, selected && dayStripStyles.circleActive]}>
                            <Text style={[dayStripStyles.dayNum, selected && dayStripStyles.dayNumActive]}>
                                {dayNum}
                            </Text>
                        </View>
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const dayStripStyles = StyleSheet.create({
    pill: {
        flexDirection:   'row',
        backgroundColor: WHITE,
        borderRadius:    50,
        paddingVertical:   8,
        paddingHorizontal: 6,
        justifyContent:  'space-between',
    },
    dayWrap: {
        flex:           1,
        height:         42,
        alignItems:     'center',
        justifyContent: 'center',
    },
    circle: {
        width:          36,
        height:         36,
        borderRadius:   999,
        overflow:       'hidden',
        alignItems:     'center',
        justifyContent: 'center',
    },
    circleActive: {
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
        borderRadius: 999,
    },
    dayNum: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   16,
        color:      BLACK,
    },
    dayNumActive: {
        fontFamily: 'Inter-Bold',
        color:      BLACK,
    },
});

// ─── MonthView ───────────────────────────────────────────────────────────────
// Expanded calendar that drops in above the day divider when the user taps
// the calendar icon in the header.

const MONTH_DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MonthView: React.FC<{
    moodMap: MoodMap;
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
}> = ({ moodMap, selectedDate, onDayPress }) => {
    const [viewDate, setViewDate] = useState(() => new Date(selectedDate + 'T00:00:00'));
    const year  = viewDate.getFullYear();
    const month = viewDate.getMonth();
    const monthLabel = viewDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDow    = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: (number | null)[] = [
        ...Array(firstDow).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];
    while (cells.length % 7 !== 0) cells.push(null);
    const rows: (number | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) rows.push(cells.slice(i, i + 7));

    const todayStr = toDateStr(new Date());

    return (
        <View style={monthSt.card}>
            <View style={monthSt.headerRow}>
                <TouchableOpacity
                    style={monthSt.chevBtn}
                    onPress={() => setViewDate(new Date(year, month - 1, 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ChevronLeft />
                </TouchableOpacity>
                <Text style={monthSt.monthTitle}>{monthLabel}</Text>
                <TouchableOpacity
                    style={monthSt.chevBtn}
                    onPress={() => setViewDate(new Date(year, month + 1, 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ChevronRight />
                </TouchableOpacity>
            </View>

            <View style={monthSt.dowRow}>
                {MONTH_DOW_LABELS.map((d, i) => (
                    <View key={i} style={monthSt.cell}>
                        <Text style={monthSt.dowLabel}>{d}</Text>
                    </View>
                ))}
            </View>
            <View style={monthSt.topDivider} />

            {rows.map((row, ri) => (
                <View key={ri} style={monthSt.dateRow}>
                    {row.map((day, ci) => {
                        if (!day) return <View key={ci} style={monthSt.cell} />;

                        const dateStr    = `${year}-${pad(month + 1)}-${pad(day)}`;
                        const info       = moodMap[dateStr];
                        const level      = getMoodLevel(info?.score);
                        const isSelected = dateStr === selectedDate;
                        const isFuture   = dateStr > todayStr;

                        return (
                            <TouchableOpacity
                                key={ci}
                                style={monthSt.cell}
                                onPress={() => !isFuture && onDayPress(dateStr)}
                                activeOpacity={isFuture ? 1 : 0.7}
                            >
                                <View style={[monthSt.dayInner, isSelected && monthSt.dayInnerSelected]}>
                                    {level ? (
                                        <MoodFace level={level} size={30} />
                                    ) : (
                                        <Text
                                            style={[
                                                monthSt.dayNum,
                                                isFuture && monthSt.dayNumFuture,
                                            ]}
                                        >
                                            {day}
                                        </Text>
                                    )}
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

const monthSt = StyleSheet.create({
    card: {
        backgroundColor:   WHITE,
        borderRadius:      20,
        paddingHorizontal: 14,
        paddingTop:        18,
        paddingBottom:     10,
    },
    headerRow: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   12,
    },
    chevBtn: {
        width:           36,
        height:          36,
        borderRadius:    18,
        backgroundColor: '#EEEEEE',
        alignItems:      'center',
        justifyContent:  'center',
    },
    monthTitle: {
        fontFamily:    'Inter-Bold',
        fontSize:      20,
        color:         BLACK,
    },
    dowRow:      { flexDirection: 'row', marginTop: 4 },
    dateRow:     { flexDirection: 'row', marginTop: 4 },
    cell:        { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 4 },
    dowLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   12,
        color:      '#C7C7C7',
        paddingBottom: 6,
    },
    topDivider: {
        height:          1,
        backgroundColor: '#E5E7EB',
        marginTop:       2,
        marginBottom:    2,
    },
    dayInner: {
        width:          40,
        height:         40,
        borderRadius:   20,
        alignItems:     'center',
        justifyContent: 'center',
    },
    dayInnerSelected: {
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
    },
    dayNum: {
        fontFamily: 'Inter-Bold',
        fontSize:   17,
        color:      BLACK,
    },
    dayNumFuture: {
        color: '#D1D5DB',
    },
});

// "WEDNESDAY , APRIL 15" centered divider with horizontal lines on each side.
const DayDivider: React.FC<{ label: string }> = ({ label }) => (
    <View style={dividerStyles.row}>
        <View style={dividerStyles.line} />
        <Text style={dividerStyles.label}>{label}</Text>
        <View style={dividerStyles.line} />
    </View>
);

const dividerStyles = StyleSheet.create({
    row: {
        flexDirection: 'row',
        alignItems:    'center',
        gap:           12,
        paddingVertical: 4,
    },
    line: {
        flex:            1,
        height:          1,
        backgroundColor: '#555555',
    },
    label: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   12,
        color:      '#A0A0A0',
        letterSpacing: 1,
    },
});

// Base card used by all section cards — white rounded rectangle with a header
// row (date on the left, section name on the right).
const CardFrame: React.FC<{
    date:    string;
    section: string;
    children: React.ReactNode;
}> = ({ date, section, children }) => (
    <View style={cardStyles.card}>
        <View style={cardStyles.header}>
            <Text style={cardStyles.date}>{date}</Text>
            <Text style={cardStyles.section}>{section}</Text>
        </View>
        {children}
    </View>
);

const cardStyles = StyleSheet.create({
    card: {
        backgroundColor: WHITE,
        borderRadius:    18,
        padding:         18,
        gap:             14,
    },
    header: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
    },
    date: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   13,
        color:      '#9CA3AF',
    },
    section: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   13,
        color:      '#9CA3AF',
    },
});

const EmotionCard: React.FC<{
    date:      string;
    text:      string;
    moodScore?: number;
}> = ({ date, text, moodScore }) => {
    const mood = getMoodLevel(moodScore);
    return (
        <CardFrame date={date} section="Emotion">
            <View style={emotionStyles.row}>
                <Text style={emotionStyles.text}>{text}</Text>
                {mood && (
                    <Image
                        source={MOOD_POTATO_IMAGES[mood]}
                        style={emotionStyles.emoji}
                        resizeMode="contain"
                    />
                )}
            </View>
        </CardFrame>
    );
};

const emotionStyles = StyleSheet.create({
    row: {
        flexDirection:  'row',
        alignItems:     'flex-end',
        justifyContent: 'space-between',
        gap:            12,
    },
    text: {
        flex:       1,
        fontFamily: 'Inter-SemiBold',
        fontSize:   18,
        color:      BLACK,
        lineHeight: 26,
    },
    emoji: {
        width:  62,
        height: 62,
    },
});

const ArrowRight = () => (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
        <SvgPath d="M5 12h14M13 6l6 6-6 6" stroke={BLACK} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const ThreeThingsCard: React.FC<{ date: string; items: string[] }> = ({ date, items }) => (
    <CardFrame date={date} section="3 things">
        <View>
            {items.map((it, i) => (
                <React.Fragment key={i}>
                    <View style={threeStyles.item}>
                        <ArrowRight />
                        <Text style={threeStyles.itemText}>{it}</Text>
                    </View>
                    {i < items.length - 1 && <View style={threeStyles.divider} />}
                </React.Fragment>
            ))}
        </View>
    </CardFrame>
);

const threeStyles = StyleSheet.create({
    item: {
        flexDirection:   'row',
        alignItems:      'center',
        gap:             14,
        paddingVertical: 14,
    },
    bullet: {
        width: 8, height: 8, borderRadius: 4,
        backgroundColor: BLACK,
        flexShrink: 0,
    },
    itemText: {
        flex:       1,
        fontFamily: 'Inter-SemiBold',
        fontSize:   16,
        color:      BLACK,
    },
    divider: {
        height:          1,
        backgroundColor: '#D1D5DB',
    },
});

const ReflectCard: React.FC<{
    date:      string;
    quote:     string;
    answer:    string;
    ulboReply?: string;
}> = ({ date, quote, answer, ulboReply }) => (
    <CardFrame date={date} section="Reflect">
        {/* Quote bubble */}
        <View style={reflectStyles.quoteBubble}>
            <Text style={reflectStyles.quoteText}>{quote}</Text>
        </View>
        {/* Answer */}
        <Text style={reflectStyles.answerText}>{answer}</Text>
        {ulboReply ? (
            <>
                <View style={reflectStyles.answerDivider} />
                <View style={reflectStyles.ulboBubble}>
                    <Image source={potatoAvatar} style={reflectStyles.ulboAvatar} resizeMode="contain" />
                    <View style={reflectStyles.ulboBody}>
                        <Text style={reflectStyles.ulboName}>ulbo says</Text>
                        <Text style={reflectStyles.ulboText}>{ulboReply}</Text>
                    </View>
                </View>
            </>
        ) : null}
    </CardFrame>
);

const reflectStyles = StyleSheet.create({
    quoteBubble: {
        backgroundColor: '#E5E7EB',
        borderRadius:    14,
        paddingHorizontal: 16,
        paddingVertical:   12,
        alignSelf:       'flex-start',
        maxWidth:        '90%',
    },
    quoteText: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   16,
        color:      BLACK,
        lineHeight: 22,
    },
    answerText: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   16,
        color:      BLACK,
        lineHeight: 22,
    },
    answerDivider: {
        height:          1,
        backgroundColor: '#D1D5DB',
    },
    ulboBubble: {
        backgroundColor: '#E5E7EB',
        borderRadius:    14,
        padding:         12,
        flexDirection:   'row',
        alignItems:      'flex-start',
        gap:             10,
    },
    ulboAvatar: {
        width:  44,
        height: 44,
    },
    ulboBody: {
        flex: 1,
        gap:  2,
    },
    ulboName: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   13,
        color:      BLACK,
    },
    ulboText: {
        fontFamily: 'Inter-SemiBold',
        fontSize:   15,
        color:      BLACK,
        lineHeight: 21,
    },
});

// ─── Main screen ──────────────────────────────────────────────────────────────

// ─── DaySection ──────────────────────────────────────────────────────────────
// Renders a single day's history — divider + emotion / 3things / reflect cards.
// Reports its measured y-position back via onLayout so the parent can scroll
// to a specific date when the user taps it in the calendar.

const DaySection: React.FC<{
    date:    string;       // YYYY-MM-DD
    entries: JournalEntry[];
    hunt:    DailyHunt | null;
    onLayoutY?: (date: string, y: number) => void;
}> = React.memo(({ date, entries, hunt, onLayoutY }) => {
    const d = new Date(date + 'T00:00:00');
    const dividerLabel = d.toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    }).toUpperCase();
    const dateLabel = d.toLocaleDateString('en-US', {
        day: 'numeric', month: 'long', year: 'numeric',
    });

    const emotionEntry = entries.find(e => e.moodScore) ?? null;
    const reflectEntry = entries.find(e => e.quoteText && e.response) ?? null;
    const hasHunt      = hunt && hunt.entries.length > 0;
    const empty        = !emotionEntry && !hasHunt && !reflectEntry;

    return (
        <View
            style={{ gap: 16, marginBottom: 8 }}
            onLayout={onLayoutY ? e => onLayoutY(date, e.nativeEvent.layout.y) : undefined}
        >
            <DayDivider label={dividerLabel} />

            {emotionEntry && (
                <EmotionCard
                    date={dateLabel}
                    text={emotionEntry.response || ''}
                    moodScore={emotionEntry.moodScore}
                />
            )}

            {hasHunt && (
                <ThreeThingsCard
                    date={dateLabel}
                    items={hunt!.entries.map(e => e.text)}
                />
            )}

            {reflectEntry && (
                <ReflectCard
                    date={dateLabel}
                    quote={reflectEntry.quoteText || ''}
                    answer={reflectEntry.response || ''}
                    ulboReply={reflectEntry.spiritReply}
                />
            )}

            {empty && (
                <View style={styles.emptyDayWrap}>
                    <Text style={styles.emptyDayText}>Nothing recorded this day</Text>
                </View>
            )}
        </View>
    );
});

const PAGE_SIZE = 7;

export const JournalScreen: React.FC = () => {
    const navigation   = useNavigation<TabScreenNavigationProp<'History'>>();
    const headerHeight = useHeaderHeight();
    const insets       = useSafeAreaInsets();
    const { expanded: calExpanded, setExpanded: setCalExpanded } = useHistoryCalendar();

    // ── Base data ─────────────────────────────────────────────────────────────
    const [moodMap,    setMoodMap]    = useState<MoodMap>({});
    const [allEntries, setAllEntries] = useState<JournalEntry[]>([]);
    const [allHunts,   setAllHunts]   = useState<Record<string, DailyHunt>>({});
    const [allVision,  setAllVision]  = useState<Record<string, VisionActivity[]>>({});
    const [loading,    setLoading]    = useState(true);

    // Selected date (used for calendar highlighting + scrolling)
    const todayStr = toDateStr(new Date());
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // Pagination — how many days from `allDates` to render
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

    // Refs for scroll-to-date on calendar tap
    const scrollRef      = useRef<ScrollView | null>(null);
    const dayYPositions  = useRef<Record<string, number>>({});
    const pendingScrollY = useRef<string | null>(null);

    // Group entries by date for fast per-day lookup
    const entriesByDate = useMemo(() => {
        const map: Record<string, JournalEntry[]> = {};
        for (const e of allEntries) {
            if (!map[e.date]) map[e.date] = [];
            map[e.date].push(e);
        }
        return map;
    }, [allEntries]);

    // Every date that has any data — sorted descending (newest first).
    // Today is always included so the user always lands on "today" first,
    // even before they've recorded anything.
    const allDates = useMemo(() => {
        const set = new Set<string>();
        set.add(todayStr);
        Object.keys(entriesByDate).forEach(d => set.add(d));
        Object.keys(allHunts).forEach(d => {
            if (allHunts[d].entries.length > 0) set.add(d);
        });
        Object.keys(allVision).forEach(d => {
            if (allVision[d].length > 0) set.add(d);
        });
        return Array.from(set).sort((a, b) => b.localeCompare(a));
    }, [entriesByDate, allHunts, allVision, todayStr]);

    const visibleDates = useMemo(
        () => allDates.slice(0, visibleCount),
        [allDates, visibleCount]
    );

    // ── Data loading ──────────────────────────────────────────────────────────

    const loadAllData = useCallback(async () => {
        try {
            const [entries, hunts, vision] = await Promise.all([
                getJournalEntries(),
                loadAllDailyHunts(),
                loadAllVisionActivities(),
            ]);

            const map: MoodMap = {};
            entries.forEach(e => {
                if (!map[e.date]) map[e.date] = { hasEntry: true };
                if (e.moodScore) map[e.date].score = e.moodScore;
            });

            setMoodMap(map);
            setAllEntries(entries);
            setAllHunts(hunts);
            setAllVision(vision);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { loadAllData(); }, [loadAllData]);

    useEffect(() => {
        const unsub = navigation.addListener('focus', () => { loadAllData(); });
        return unsub;
    }, [navigation, loadAllData]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const recordDayY = useCallback((date: string, y: number) => {
        dayYPositions.current[date] = y;
        // If the user tapped a date that hadn't been laid out yet, scroll now.
        if (pendingScrollY.current === date) {
            pendingScrollY.current = null;
            scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
        }
    }, []);

    const handleDayPress = useCallback((dateStr: string) => {
        setSelectedDate(dateStr);
        setCalExpanded(false);
        trackEvent('journal_entry_viewed', { date: dateStr });

        // Find the index of that date in allDates. If it's beyond what's
        // currently rendered, expand visibleCount so it can be scrolled to.
        const idx = allDates.indexOf(dateStr);
        if (idx === -1) {
            // Date with no data — just scroll to top so the user sees today.
            scrollRef.current?.scrollTo({ y: 0, animated: true });
            return;
        }
        if (idx >= visibleCount) {
            // Need to render more days first; scroll once layout reports back.
            setVisibleCount(idx + 1);
            pendingScrollY.current = dateStr;
            return;
        }
        const y = dayYPositions.current[dateStr];
        if (typeof y === 'number') {
            scrollRef.current?.scrollTo({ y: Math.max(0, y - 8), animated: true });
        } else {
            // Fall through — onLayout will fire and the pending ref handles it.
            pendingScrollY.current = dateStr;
        }
    }, [allDates, visibleCount, setCalExpanded]);

    const handleScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
        const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent;
        const distFromBottom = contentSize.height - (contentOffset.y + layoutMeasurement.height);
        if (distFromBottom < 600 && visibleCount < allDates.length) {
            setVisibleCount(prev => Math.min(prev + PAGE_SIZE, allDates.length));
        }
    }, [allDates.length, visibleCount]);

    const reachedEnd = visibleCount >= allDates.length;

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollRef}
                style={styles.scroll}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={64}
                contentContainerStyle={{
                    paddingTop:        headerHeight + 16,
                    paddingBottom:     62 + insets.bottom + 16,
                    paddingHorizontal: 16,
                    gap: 16,
                }}
            >
                {calExpanded ? (
                    <MonthView
                        moodMap={moodMap}
                        selectedDate={selectedDate}
                        onDayPress={handleDayPress}
                    />
                ) : (
                    <DayStrip
                        moodMap={moodMap}
                        selectedDate={selectedDate}
                        onDayPress={handleDayPress}
                    />
                )}

                {loading ? (
                    <ActivityIndicator color={YELLOW} style={{ paddingVertical: 40 }} />
                ) : (
                    <>
                        {visibleDates.map(date => (
                            <DaySection
                                key={date}
                                date={date}
                                entries={entriesByDate[date] ?? []}
                                hunt={allHunts[date] ?? null}
                                onLayoutY={recordDayY}
                            />
                        ))}

                        {!reachedEnd && (
                            <ActivityIndicator
                                color={YELLOW}
                                style={{ paddingVertical: 24 }}
                            />
                        )}

                        {reachedEnd && allDates.length > 0 && (
                            <Text style={styles.endOfHistoryText}>
                                You've reached the beginning of your history
                            </Text>
                        )}
                    </>
                )}
            </ScrollView>
        </View>
    );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: BLACK },
    scroll:    { flex: 1 },

    // ── Empty-day card placeholder
    emptyDayWrap: {
        alignItems: 'center',
        paddingVertical: 16,
    },
    emptyDayText: {
        fontFamily: 'Inter-Medium',
        fontSize: 13,
        color: '#666666',
    },
    endOfHistoryText: {
        fontFamily: 'Inter-Medium',
        fontSize: 12,
        color: '#666666',
        textAlign: 'center',
        paddingVertical: 24,
    },
});

export default JournalScreen;
