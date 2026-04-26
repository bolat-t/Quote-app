import React, { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import {
    View, Text, StyleSheet, ScrollView, Image,
    ActivityIndicator, TouchableOpacity,
    NativeSyntheticEvent, NativeScrollEvent,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
const potatoAvatar = require('../../assets/mascot/potato_levels/level_2_potato.png');
import Svg, {
    Path as SvgPath,
    Rect as SvgRect,
    Circle as SvgCircle,
} from 'react-native-svg';
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
const GRAY   = '#F2F2F2';

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

const formatDateLabel = (dateStr: string): string => {
    const today = new Date();
    const todayStr = toDateStr(today);
    const yd = new Date(today); yd.setDate(today.getDate() - 1);
    const yesterdayStr = toDateStr(yd);
    if (dateStr === todayStr) return 'Today';
    if (dateStr === yesterdayStr) return 'Yesterday';
    return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });
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
const EntryDot = () => (
    <Svg width={8} height={8} viewBox="0 0 8 8">
        <SvgCircle cx="4" cy="4" r="3.5" fill={YELLOW} stroke={BLACK} strokeWidth={1} />
    </Svg>
);

// ─── New Icon SVGs ────────────────────────────────────────────────────────────


const ChevronDownSvg: React.FC<{ rotated?: boolean }> = ({ rotated }) => (
    <Svg
        width={16} height={16} viewBox="0 0 24 24" fill="none"
        style={{ transform: [{ rotate: rotated ? '180deg' : '0deg' }] }}
    >
        <SvgPath d="M6 9l6 6 6-6" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const SparkSvg = () => (
    <Svg width={13} height={13} viewBox="0 0 24 24">
        <SvgPath d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill={BLACK} />
    </Svg>
);


// ─── MoodCalendar ─────────────────────────────────────────────────────────────

type MoodMap = Record<string, { score?: number; hasEntry: boolean }>;

const DOW_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

const MoodCalendar: React.FC<{
    moodMap: MoodMap;
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
}> = ({ moodMap, selectedDate, onDayPress }) => {
    const [viewDate, setViewDate] = useState(new Date());
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
        <View style={calSt.wrap}>
            <View style={calSt.headerRow}>
                <TouchableOpacity
                    style={calSt.arrowBtn}
                    onPress={() => setViewDate(new Date(year, month - 1, 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ChevronLeft />
                </TouchableOpacity>
                <Text style={calSt.monthTitle}>{monthLabel}</Text>
                <TouchableOpacity
                    style={calSt.arrowBtn}
                    onPress={() => setViewDate(new Date(year, month + 1, 1))}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                    <ChevronRight />
                </TouchableOpacity>
            </View>

            <View style={calSt.weekRow}>
                {DOW_LABELS.map((d, i) => (
                    <View key={i} style={calSt.cell}>
                        <Text style={calSt.dowLabel}>{d}</Text>
                    </View>
                ))}
            </View>

            <View style={calSt.sep} />

            {rows.map((row, ri) => (
                <View key={ri} style={calSt.weekRow}>
                    {row.map((day, ci) => {
                        if (!day) return <View key={ci} style={calSt.cell} />;

                        const dateStr    = `${year}-${pad(month + 1)}-${pad(day)}`;
                        const info       = moodMap[dateStr];
                        const level      = getMoodLevel(info?.score);
                        const isSelected = dateStr === selectedDate;
                        const isToday    = dateStr === todayStr;
                        const future     = dateStr > todayStr;

                        return (
                            <TouchableOpacity
                                key={ci}
                                style={calSt.cell}
                                onPress={() => !future && onDayPress(dateStr)}
                                activeOpacity={future ? 1 : 0.7}
                            >
                                <View style={[
                                    calSt.dayInner,
                                    isSelected && calSt.selectedDay,
                                    isToday && !isSelected && calSt.todayRing,
                                ]}>
                                    {level ? (
                                        <MoodFace level={level} size={24} />
                                    ) : (
                                        <Text style={[calSt.dayNum, future && { color: '#DDDDDD' }]}>
                                            {day}
                                        </Text>
                                    )}
                                </View>
                                {info?.hasEntry && !level ? (
                                    <View style={calSt.dotWrap}><EntryDot /></View>
                                ) : null}
                                {isToday && !isSelected ? (
                                    <View style={calSt.todayDot} />
                                ) : null}
                            </TouchableOpacity>
                        );
                    })}
                </View>
            ))}
        </View>
    );
};

const calSt = StyleSheet.create({
    wrap: {
        backgroundColor: WHITE, borderRadius: 20,
        borderWidth: 2, borderColor: BLACK,
        paddingHorizontal: 12, paddingTop: 14, paddingBottom: 8,
        marginBottom: 12,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10, paddingHorizontal: 2,
    },
    arrowBtn: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center',
        backgroundColor: GRAY,
    },
    monthTitle: { fontFamily: 'Inter-SemiBold', fontSize: 17, color: BLACK, letterSpacing: 0.3 },
    sep: { height: 1, backgroundColor: BLACK + '10', marginBottom: 4 },
    weekRow: { flexDirection: 'row' },
    cell: { flex: 1, alignItems: 'center', paddingVertical: 3 },
    dowLabel: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#BBBBBB', paddingBottom: 4 },
    dayInner: {
        width: 36, height: 36, borderRadius: 18,
        alignItems: 'center', justifyContent: 'center',
        overflow: 'hidden',
    },
    selectedDay: { backgroundColor: YELLOW },
    todayRing: { backgroundColor: BLACK + '08' },
    dayNum: { fontFamily: 'Inter-SemiBold', fontSize: 14, color: BLACK },
    dotWrap: { marginTop: 1 },
    todayDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: BLACK, marginTop: 1 },
});

// ─── WeekStrip ────────────────────────────────────────────────────────────────

const WeekStrip: React.FC<{
    moodMap: MoodMap;
    selectedDate: string;
    onDayPress: (dateStr: string) => void;
}> = ({ moodMap, selectedDate, onDayPress }) => {
    const today    = new Date();
    const todayStr = toDateStr(today);
    const days     = Array.from({ length: 7 }, (_, i) => {
        const d = new Date(today);
        d.setDate(today.getDate() - (6 - i));
        return toDateStr(d);
    });
    const DOW = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    return (
        <View style={wkSt.wrap}>
            {days.map(dateStr => {
                const d          = new Date(dateStr + 'T00:00:00');
                const dow        = DOW[d.getDay()];
                const dayNum     = d.getDate();
                const info       = moodMap[dateStr];
                const level      = getMoodLevel(info?.score);
                const isSelected = dateStr === selectedDate;
                const isToday    = dateStr === todayStr;

                return (
                    <TouchableOpacity
                        key={dateStr}
                        style={wkSt.cell}
                        onPress={() => onDayPress(dateStr)}
                        activeOpacity={0.7}
                    >
                        <Text style={[wkSt.dowLabel, isToday && wkSt.todayLabel]}>{dow}</Text>
                        <View style={[
                            wkSt.circle,
                            isSelected && wkSt.selectedCircle,
                            isToday && !isSelected && wkSt.todayCircle,
                        ]}>
                            {level ? (
                                <MoodFace level={level} size={22} />
                            ) : (
                                <Text style={[wkSt.dayNum, isSelected && wkSt.selectedNum]}>
                                    {dayNum}
                                </Text>
                            )}
                        </View>
                        {info?.hasEntry && !level ? (
                            <View style={wkSt.dotWrap}><EntryDot /></View>
                        ) : null}
                    </TouchableOpacity>
                );
            })}
        </View>
    );
};

const wkSt = StyleSheet.create({
    wrap: {
        flexDirection: 'row',
        backgroundColor: WHITE,
        borderRadius: 16, borderWidth: 2, borderColor: BLACK,
        paddingVertical: 10, paddingHorizontal: 6,
        marginBottom: 4,
    },
    cell:         { flex: 1, alignItems: 'center', gap: 4 },
    dowLabel:     { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#BBBBBB' },
    todayLabel:   { color: BLACK },
    circle: {
        width: 34, height: 34, borderRadius: 17,
        alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
    },
    selectedCircle: { backgroundColor: YELLOW },
    todayCircle:    { backgroundColor: BLACK + '08' },
    dayNum:         { fontFamily: 'Inter-SemiBold', fontSize: 13, color: BLACK },
    selectedNum:    { color: BLACK },
    dotWrap:        { marginTop: -2 },
});

// ─── MoodBanner ──────────────────────────────────────────────────────────────

const MoodBanner: React.FC<{ entries: JournalEntry[]; dateLabel: string }> = ({ entries, dateLabel }) => {
    const scores   = entries.filter(e => e.moodScore).map(e => e.moodScore!);
    const avgScore = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : undefined;
    const level    = getMoodLevel(avgScore);

    return (
        <View style={banSt.wrap}>
            <Text style={banSt.dateText}>{dateLabel}</Text>
            {level ? (
                <View style={banSt.feelRow}>
                    <MoodFace level={level} size={52} />
                    <Text style={banSt.feelLabel}>Overall mood</Text>
                </View>
            ) : (
                <Text style={banSt.noDataText}>No mood data for this day</Text>
            )}
        </View>
    );
};

const banSt = StyleSheet.create({
    wrap: {
        backgroundColor: WHITE, borderRadius: 20,
        borderWidth: 2, borderColor: BLACK,
        padding: 20, marginBottom: 16,
    },
    dateText:   { fontFamily: 'Inter-SemiBold', fontSize: 25, color: BLACK, marginBottom: 14 },
    feelRow:    { flexDirection: 'row', alignItems: 'center', gap: 14 },
    feelLabel:  { fontFamily: 'Inter-Medium', fontSize: 16, color: '#4B5563' },
    noDataText: { fontFamily: 'Inter-Medium', fontSize: 16, color: '#BBBBBB' },
});

// ─── EntryCard ────────────────────────────────────────────────────────────────

const EntryCard: React.FC<{ entry: JournalEntry }> = ({ entry }) => {
    const date    = new Date(entry.createdAt);
    const dateStr = date.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' });
    const dayStr  = date.toLocaleDateString('en-US', { weekday: 'long' });
    const timeStr = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

    const images  = entry.images?.length ? entry.images : entry.imageUri ? [entry.imageUri] : [];
    const hasText = entry.response?.trim();
    const level   = getMoodLevel(entry.moodScore);

    return (
        <View style={echoSt.card}>
            <View style={echoSt.header}>
                <Text style={echoSt.dateLeft}>{dateStr}</Text>
                <Text style={echoSt.dayRight}>{dayStr}</Text>
            </View>
            <Text style={echoSt.time}>{timeStr}</Text>

            {entry.quoteText ? (
                <View style={echoSt.quoteBar}>
                    <View style={echoSt.quoteStrip} />
                    <Text style={echoSt.quoteText} numberOfLines={2}>"{entry.quoteText}"</Text>
                </View>
            ) : null}

            {hasText ? (
                <Text style={echoSt.bodyText} numberOfLines={images.length ? 4 : 8}>
                    {entry.response}
                </Text>
            ) : null}

            {images.length > 0 ? (
                <View style={echoSt.imageSection}>
                    {images.map((uri, i) => (
                        <Image key={i} source={{ uri }} style={echoSt.fullImg} resizeMode="contain" />
                    ))}
                </View>
            ) : null}

            {(level || entry.spiritReply) ? (
                <View style={echoSt.divider} />
            ) : null}

            {level ? (
                <View style={echoSt.moodRow}>
                    <MoodFace level={level} size={28} />
                </View>
            ) : null}

            {entry.spiritReply ? (
                <View style={echoSt.ulboWrap}>
                    <View style={echoSt.ulboRow}>
                        <View style={echoSt.ulboAvatarCol}>
                            <Image source={potatoAvatar} style={{ width: 44, height: 52 }} resizeMode="contain" />
                        </View>
                        <View style={echoSt.ulboBubble}>
                            <Text style={echoSt.ulboLabel}>✦  Ulbo says</Text>
                            <Text style={echoSt.ulboText} numberOfLines={6}>{entry.spiritReply}</Text>
                        </View>
                    </View>
                </View>
            ) : null}
        </View>
    );
};

const echoSt = StyleSheet.create({
    card: {
        backgroundColor: WHITE, borderRadius: 20,
        borderWidth: 2, borderColor: BLACK,
        padding: 20, marginBottom: 16, overflow: 'hidden',
    },
    header:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 },
    dateLeft:  { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#4B5563' },
    dayRight:  { fontFamily: 'Inter-SemiBold', fontSize: 14, color: '#4B5563' },
    time:      { fontFamily: 'Inter-Medium', fontSize: 13, color: '#BBBBBB', marginBottom: 14 },
    quoteBar: {
        flexDirection: 'row', backgroundColor: GRAY,
        borderRadius: 10, overflow: 'hidden', marginBottom: 14,
    },
    quoteStrip: { width: 4, backgroundColor: YELLOW },
    quoteText: {
        flex: 1, padding: 12,
        fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 24, color: BLACK,
    },
    bodyText: {
        fontFamily: 'Inter-Medium', fontSize: 16, lineHeight: 26, color: BLACK,
        marginBottom: 14,
    },
    imageSection: {
        marginHorizontal: -20, marginBottom: 14, gap: 2, backgroundColor: GRAY,
    },
    fullImg:  { width: '100%', height: 300 },
    divider:  { height: 1, backgroundColor: BLACK + '12', marginBottom: 14 },
    moodRow:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
    ulboWrap:      { backgroundColor: GRAY, borderRadius: 14, padding: 14 },
    ulboRow:       { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    ulboAvatarCol: { flexShrink: 0, marginBottom: -4 },
    ulboBubble:    { flex: 1 },
    ulboLabel: {
        fontFamily: 'Inter-SemiBold', fontSize: 11, letterSpacing: 0.8,
        textTransform: 'uppercase', color: '#999999', marginBottom: 8,
    },
    ulboText: { fontFamily: 'Inter-Medium', fontSize: 16, lineHeight: 26, color: BLACK },
});

// ─── HuntCard ─────────────────────────────────────────────────────────────────

const TargetSvg = () => (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="none">
        <SvgCircle cx="12" cy="12" r="9"   stroke={BLACK} strokeWidth={1.8} />
        <SvgCircle cx="12" cy="12" r="5"   stroke={BLACK} strokeWidth={1.5} />
        <SvgCircle cx="12" cy="12" r="1.8" fill={BLACK} />
    </Svg>
);

const HuntCard: React.FC<{ hunt: DailyHunt }> = ({ hunt }) => (
    <View style={huntSt.card}>
        <View style={huntSt.header}>
            <View style={huntSt.iconRow}>
                <View style={huntSt.iconCircle}><TargetSvg /></View>
                <Text style={huntSt.title}>Positivity Hunt</Text>
            </View>
            {hunt.completed ? (
                <View style={huntSt.badge}>
                    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" style={{ marginRight: 4 }}>
                        <SvgPath d="M20 6L9 17l-5-5" stroke={BLACK} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <Text style={huntSt.badgeText}>Done</Text>
                </View>
            ) : null}
        </View>
        {hunt.entries.map((e, i) => (
            <View key={i} style={[huntSt.row, i < hunt.entries.length - 1 && huntSt.rowBorder]}>
                <View style={huntSt.bullet} />
                <Text style={huntSt.rowText}>{e.text}</Text>
            </View>
        ))}
    </View>
);

const huntSt = StyleSheet.create({
    card: {
        backgroundColor: WHITE, borderRadius: 16,
        borderWidth: 2, borderColor: BLACK, marginBottom: 16,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderBottomWidth: 1, borderBottomColor: BLACK + '12',
    },
    iconRow:   { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: BLACK,
    },
    title:      { fontFamily: 'Inter-Bold', fontSize: 20, color: BLACK },
    badge: {
        flexDirection: 'row', alignItems: 'center',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
        backgroundColor: YELLOW, borderWidth: 1.5, borderColor: BLACK,
    },
    badgeText:  { fontFamily: 'Inter-SemiBold', fontSize: 12, color: BLACK },
    row:        { flexDirection: 'row', alignItems: 'flex-start', padding: 12, paddingHorizontal: 14, gap: 10 },
    rowBorder:  { borderBottomWidth: 1, borderBottomColor: BLACK + '08' },
    bullet:     { width: 7, height: 7, borderRadius: 3.5, marginTop: 8, flexShrink: 0, backgroundColor: YELLOW, borderWidth: 1, borderColor: BLACK },
    rowText:    { fontFamily: 'Inter-SemiBold', fontSize: 15, lineHeight: 22, color: BLACK, flex: 1 },
});

// ─── VisionCard ──────────────────────────────────────────────────────────────

const GridSvg = () => (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none">
        <SvgRect x="3"  y="3"  width="8" height="8" rx="1.5" fill={BLACK} />
        <SvgRect x="13" y="3"  width="8" height="8" rx="1.5" fill={BLACK} />
        <SvgRect x="3"  y="13" width="8" height="8" rx="1.5" fill={BLACK} />
        <SvgRect x="13" y="13" width="8" height="8" rx="1.5" fill={BLACK} />
    </Svg>
);

const VisionCard: React.FC<{ activities: VisionActivity[] }> = ({ activities }) => {
    const imageItems = activities.filter(a => a.type === 'image');
    const textItems  = activities.filter(a => a.type === 'text');

    return (
        <View style={visSt.card}>
            <View style={visSt.header}>
                <View style={visSt.iconRow}>
                    <View style={visSt.iconCircle}><GridSvg /></View>
                    <Text style={visSt.title}>Vision Board</Text>
                </View>
                <View style={visSt.badge}>
                    <Text style={visSt.badgeText}>{activities.length} item{activities.length !== 1 ? 's' : ''}</Text>
                </View>
            </View>
            {imageItems.length > 0 ? (
                <View style={visSt.imgRow}>
                    {imageItems.slice(0, 5).map((a, i) => (
                        <Image key={i} source={{ uri: a.content }} style={visSt.thumb} resizeMode="cover" />
                    ))}
                    {imageItems.length > 5 ? (
                        <View style={[visSt.thumb, visSt.moreChip]}>
                            <Text style={visSt.badgeText}>+{imageItems.length - 5}</Text>
                        </View>
                    ) : null}
                </View>
            ) : null}
            {textItems.length > 0 ? (
                <View style={{ padding: 14, paddingTop: imageItems.length ? 0 : 14 }}>
                    {textItems.slice(0, 3).map((a, i) => (
                        <Text key={i} style={visSt.textItem} numberOfLines={1}>"{a.content}"</Text>
                    ))}
                </View>
            ) : null}
        </View>
    );
};

const visSt = StyleSheet.create({
    card: {
        backgroundColor: WHITE, borderRadius: 16,
        borderWidth: 2, borderColor: BLACK, marginBottom: 16,
    },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        padding: 14, borderBottomWidth: 1, borderBottomColor: BLACK + '12',
    },
    iconRow:    { flexDirection: 'row', alignItems: 'center', gap: 10 },
    iconCircle: {
        width: 32, height: 32, borderRadius: 16,
        backgroundColor: YELLOW, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1.5, borderColor: BLACK,
    },
    title:     { fontFamily: 'Inter-Bold', fontSize: 20, color: BLACK },
    badge:     { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4, backgroundColor: YELLOW, borderWidth: 1.5, borderColor: BLACK },
    badgeText: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: BLACK },
    imgRow:    { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 14 },
    thumb:     { width: 64, height: 64, borderRadius: 10, overflow: 'hidden' },
    moreChip:  { backgroundColor: GRAY, alignItems: 'center', justifyContent: 'center' },
    textItem:  { fontFamily: 'Inter-SemiBold', fontSize: 14, color: BLACK, marginBottom: 4 },
});

// ─── SummaryCard ─────────────────────────────────────────────────────────────

const SummaryCard: React.FC<{ summary: string }> = ({ summary }) => (
    <View style={sumSt.card}>
        <View style={sumSt.labelRow}>
            <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                <SvgPath d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill={BLACK} />
            </Svg>
            <Text style={sumSt.label}>Daily Summary</Text>
        </View>
        <Text style={sumSt.text}>{summary}</Text>
    </View>
);

const sumSt = StyleSheet.create({
    card: {
        backgroundColor: YELLOW, borderRadius: 16,
        borderWidth: 2, borderColor: BLACK,
        padding: 16, marginBottom: 16,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    label: { fontFamily: 'Inter-SemiBold', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.8, color: '#4B5563' },
    text:  { fontFamily: 'Inter-SemiBold', fontSize: 16, lineHeight: 24, color: BLACK },
});

// ─── OnThisDayCard ────────────────────────────────────────────────────────────

const OnThisDayCard: React.FC<{ entries: JournalEntry[] }> = ({ entries }) => {
    const [expanded, setExpanded] = useState(false);
    if (entries.length === 0) return null;

    // Group by year, get most recent prior year
    const byYear: Record<string, JournalEntry[]> = {};
    entries.forEach(e => {
        const yr = e.date.slice(0, 4);
        if (!byYear[yr]) byYear[yr] = [];
        byYear[yr].push(e);
    });
    const years         = Object.keys(byYear).sort((a, b) => b.localeCompare(a));
    const mostRecentYr  = years[0];
    const yearEntries   = byYear[mostRecentYr];
    const currentYear   = new Date().getFullYear();
    const yearsAgo      = currentYear - parseInt(mostRecentYr, 10);
    const agoLabel      = yearsAgo === 1 ? '1 year ago' : `${yearsAgo} years ago`;

    const firstEntry = yearEntries[0];
    const level      = getMoodLevel(firstEntry.moodScore);
    const raw        = firstEntry.response?.trim() ?? '';
    const preview    = raw.length > 80 ? raw.slice(0, 80) + '…' : raw;

    return (
        <TouchableOpacity
            style={otdSt.card}
            onPress={() => setExpanded(e => !e)}
            activeOpacity={0.8}
        >
            <View style={otdSt.headerRow}>
                <View style={otdSt.labelRow}>
                    <SparkSvg />
                    <Text style={otdSt.label}>On This Day</Text>
                    <View style={otdSt.agePill}>
                        <Text style={otdSt.ageText}>{agoLabel}</Text>
                    </View>
                </View>
                <ChevronDownSvg rotated={expanded} />
            </View>

            {!expanded ? (
                <View style={otdSt.preview}>
                    {level ? <MoodFace level={level} size={30} /> : null}
                    <Text style={otdSt.previewText} numberOfLines={2}>{preview}</Text>
                </View>
            ) : (
                <View>
                    {yearEntries.map(e => {
                        const lvl = getMoodLevel(e.moodScore);
                        return (
                            <View key={e.id} style={otdSt.expandedEntry}>
                                <View style={otdSt.entryMeta}>
                                    {lvl ? <MoodFace level={lvl} size={20} /> : null}
                                    <Text style={otdSt.entryTime}>
                                        {new Date(e.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}
                                    </Text>
                                </View>
                                {e.response ? (
                                    <Text style={otdSt.entryText} numberOfLines={4}>{e.response}</Text>
                                ) : null}
                            </View>
                        );
                    })}
                    {years.length > 1 && (
                        <Text style={otdSt.moreYears}>
                            + entries from {years.slice(1).map(y => {
                                const n = currentYear - parseInt(y, 10);
                                return n === 1 ? '1 year ago' : `${n} years ago`;
                            }).join(', ')}
                        </Text>
                    )}
                </View>
            )}
        </TouchableOpacity>
    );
};

const otdSt = StyleSheet.create({
    card: {
        backgroundColor: YELLOW, borderRadius: 16,
        borderWidth: 2, borderColor: BLACK,
        padding: 14, marginBottom: 14,
    },
    headerRow: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'space-between', marginBottom: 10,
    },
    labelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    label: {
        fontFamily: 'Inter-SemiBold', fontSize: 11,
        textTransform: 'uppercase', letterSpacing: 0.8, color: BLACK,
    },
    agePill: {
        backgroundColor: BLACK + '15', borderRadius: 20,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    ageText:     { fontFamily: 'Inter-SemiBold', fontSize: 11, color: BLACK },
    preview:     { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
    previewText: { fontFamily: 'Inter-SemiBold', fontSize: 15, lineHeight: 22, color: BLACK, flex: 1 },
    expandedEntry: {
        borderTopWidth: 1, borderTopColor: BLACK + '20',
        paddingTop: 10, marginTop: 6,
    },
    entryMeta:  { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 5 },
    entryTime:  { fontFamily: 'Inter-SemiBold', fontSize: 11, color: BLACK + '70' },
    entryText:  { fontFamily: 'Inter-SemiBold', fontSize: 14, lineHeight: 21, color: BLACK },
    moreYears:  { fontFamily: 'Inter-SemiBold', fontSize: 12, color: BLACK + '60', marginTop: 8, textAlign: 'center' },
});


// ─── StickyDateHeader ─────────────────────────────────────────────────────────

const StickyDateHeader: React.FC<{ date: string }> = ({ date }) => (
    <View style={sdhSt.wrap}>
        <View style={sdhSt.line} />
        <Text style={sdhSt.text}>{formatDateLabel(date)}</Text>
        <View style={sdhSt.line} />
    </View>
);

const sdhSt = StyleSheet.create({
    wrap: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        paddingVertical: 8, paddingHorizontal: 16,
        backgroundColor: BLACK, // required for sticky to work
    },
    line: { flex: 1, height: 1, backgroundColor: '#333333' },
    text: { fontFamily: 'Inter-SemiBold', fontSize: 12, color: '#666666', textTransform: 'uppercase', letterSpacing: 1.2 },
});

// ─── CalendarLegend ──────────────────────────────────────────────────────────

const MOOD_LABELS: Record<MoodLevel, string> = {
    1: 'Rough', 2: 'Meh', 3: 'Okay', 4: 'Good', 5: 'Great',
};

const CalendarLegend: React.FC = () => (
    <View style={legSt.wrap}>
        {([1, 2, 3, 4, 5] as MoodLevel[]).map(level => (
            <View key={level} style={legSt.item}>
                <MoodFace level={level} size={22} />
                <Text style={legSt.label}>{MOOD_LABELS[level]}</Text>
            </View>
        ))}
    </View>
);

const legSt = StyleSheet.create({
    wrap: {
        flexDirection: 'row', justifyContent: 'space-evenly',
        paddingVertical: 10, paddingHorizontal: 8,
        marginBottom: 16, backgroundColor: GRAY, borderRadius: 14,
        borderWidth: 1.5, borderColor: BLACK + '18',
    },
    item:  { alignItems: 'center', gap: 4 },
    label: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#4B5563' },
});

// ─── JumpTodayChip ────────────────────────────────────────────────────────────

const JumpTodayChip: React.FC<{ onPress: () => void }> = ({ onPress }) => (
    <TouchableOpacity style={jmpSt.chip} onPress={onPress} activeOpacity={0.75}>
        <Svg width={13} height={13} viewBox="0 0 24 24" fill="none" style={{ marginRight: 5 }}>
            <SvgCircle cx="12" cy="12" r="9" stroke={BLACK} strokeWidth={2.2} />
            <SvgPath d="M12 7v5l3 3" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
        </Svg>
        <Text style={jmpSt.text}>Jump to today</Text>
    </TouchableOpacity>
);

const jmpSt = StyleSheet.create({
    chip: {
        flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-end',
        borderRadius: 20, paddingHorizontal: 14, paddingVertical: 7,
        backgroundColor: YELLOW, borderWidth: 1.5, borderColor: BLACK, marginBottom: 12,
    },
    text: { fontFamily: 'Inter-SemiBold', fontSize: 13, color: BLACK },
});

// ─── SectionLabel ─────────────────────────────────────────────────────────────

const SectionLabel: React.FC<{ label: string }> = ({ label }) => (
    <View style={secSt.row}>
        <View style={secSt.line} />
        <Text style={secSt.text}>{label}</Text>
        <View style={secSt.line} />
    </View>
);

const secSt = StyleSheet.create({
    row:  { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14, marginTop: 4 },
    line: { flex: 1, height: 1, backgroundColor: BLACK + '18' },
    text: { fontFamily: 'Inter-SemiBold', fontSize: 10, color: '#CCCCCC', textTransform: 'uppercase', letterSpacing: 1 },
});

// ─── FeedItem type ─────────────────────────────────────────────────────────────

type FeedItem =
    | { kind: 'journal'; entry: JournalEntry; time: number }
    | { kind: 'hunt';    hunt: DailyHunt;     time: number }
    | { kind: 'vision';  activities: VisionActivity[]; time: number };

// ─── Main screen ───────────────────────────────────────────────────────────────

type ViewMode = 'timeline' | 'calendar';

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
        borderRadius:   18,
        alignItems:     'center',
        justifyContent: 'center',
    },
    circleActive: {
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
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
                        <View style={threeStyles.bullet} />
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

    // ── App header (non-search mode) — now scrolls with content
    appHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'flex-end',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 8,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    viewToggle: {
        flexDirection: 'row',
        backgroundColor: GRAY,
        borderRadius: 10,
        borderWidth: 1.5,
        borderColor: BLACK + '18',
        overflow: 'hidden',
    },
    toggleBtn: {
        paddingHorizontal: 10,
        paddingVertical: 7,
        alignItems: 'center',
        justifyContent: 'center',
    },
    toggleActive: {
        backgroundColor: YELLOW,
    },

    // ── Search header — now scrolls with content
    searchHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 12,
        paddingBottom: 10,
        gap: 12,
        borderBottomWidth: 1.5,
        borderBottomColor: BLACK + '14',
    },
    searchInput: {
        flex: 1,
        fontFamily: 'Inter-SemiBold',
        fontSize: 16,
        color: BLACK,
        paddingVertical: 0,
    },
    searchResultLabel: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 12,
        color: '#4B5563',
        paddingHorizontal: 16,
        marginBottom: 8,
    },

    // ── Timeline / calendar shared
    expandCalBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        paddingVertical: 8,
        marginBottom: 10,
    },
    expandCalText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 13,
        color: '#888888',
    },

    // ── Empty states
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
    },
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
    emptyIconWrap: {
        width: 68, height: 68, borderRadius: 34,
        backgroundColor: GRAY, borderWidth: 2, borderColor: BLACK + '20',
        alignItems: 'center', justifyContent: 'center', marginBottom: 14,
    },
    emptyTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20, color: WHITE, marginBottom: 6,
    },
    emptyText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14, color: '#888888', textAlign: 'center', lineHeight: 21,
    },

    // ── FAB
    fab: {
        position: 'absolute',
        bottom: 116,
        right: 20,
        width: 56, height: 56,
        borderRadius: 28,
        backgroundColor: YELLOW,
        borderWidth: 2.5, borderColor: BLACK,
        alignItems: 'center', justifyContent: 'center',
        // Subtle shadow on iOS
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 4,
    },

    // ── Compose modal
    composeRoot: {
        flex: 1,
        backgroundColor: WHITE,
    },
    composeHandle: {
        width: 36, height: 4, borderRadius: 2,
        backgroundColor: BLACK + '20',
        alignSelf: 'center',
        marginTop: 10, marginBottom: 4,
    },
    composeHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 14,
    },
    composeTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 22, color: BLACK,
    },
    composeSep: {
        height: 1.5,
        backgroundColor: BLACK + '10',
        marginHorizontal: 0,
    },
    composeInput: {
        flex: 1,
        fontFamily: 'Inter-SemiBold',
        fontSize: 17,
        lineHeight: 28,
        color: BLACK,
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 12,
    },
    composeActions: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 16,
        borderTopWidth: 1.5,
        borderTopColor: BLACK + '10',
    },
    voiceBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: GRAY,
        borderWidth: 1.5,
        borderColor: BLACK + '18',
    },
    voiceBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 14, color: BLACK,
    },
    saveBtn: {
        paddingHorizontal: 28,
        paddingVertical: 12,
        borderRadius: 20,
        backgroundColor: YELLOW,
        borderWidth: 2, borderColor: BLACK,
        minWidth: 90,
        alignItems: 'center',
    },
    saveBtnDisabled: {
        opacity: 0.4,
    },
    saveBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15, color: BLACK,
    },
});

export default JournalScreen;
