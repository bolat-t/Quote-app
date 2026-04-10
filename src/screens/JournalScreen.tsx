import React, { useState, useCallback, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView, SectionList, Image,
    ActivityIndicator, TouchableOpacity,
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
    getDailySummary,
} from '../utils/journalStorage';
import { loadDailyHunt } from '../utils/progressionStorage';
import { getVisionActivity, VisionActivity } from '../utils/visionBoardStorage';
import { trackEvent } from '../lib/analytics';
import { useHeaderHeight } from '../context/HeaderHeightContext';

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

export const JournalScreen: React.FC = () => {
    const navigation   = useNavigation<TabScreenNavigationProp<'History'>>();
    const headerHeight = useHeaderHeight();

    // ── View state ────────────────────────────────────────────────────────────
    const [viewMode, setViewMode] = useState<ViewMode>('timeline');


    // ── Calendar expand state ─────────────────────────────────────────────────
    const [calendarExpanded, setCalendarExpanded] = useState(false);

    // ── Base data ─────────────────────────────────────────────────────────────
    const [moodMap,          setMoodMap]          = useState<MoodMap>({});
    const [allEntries,       setAllEntries]        = useState<JournalEntry[]>([]);
    const [onThisDayEntries, setOnThisDayEntries] = useState<JournalEntry[]>([]);

    // ── Calendar day state ────────────────────────────────────────────────────
    const todayStr = toDateStr(new Date());
    const [selectedDate,     setSelectedDate]     = useState(todayStr);
    const [dayEntries,       setDayEntries]       = useState<JournalEntry[]>([]);
    const [hunt,             setHunt]             = useState<DailyHunt | null>(null);
    const [visionActivities, setVisionActivities] = useState<VisionActivity[]>([]);
    const [dailySummary,     setDailySummary]     = useState<string | null>(null);
    const [loading,          setLoading]          = useState(false);

    // ── Data loading ──────────────────────────────────────────────────────────

    const loadBaseData = useCallback(async () => {
        const entries = await getJournalEntries();

        const map: MoodMap = {};
        entries.forEach(e => {
            if (!map[e.date]) map[e.date] = { hasEntry: true };
            if (e.moodScore) map[e.date].score = e.moodScore;
        });
        setMoodMap(map);
        setAllEntries(entries);

        // On This Day — same month-day, prior years
        const todayMonthDay = toDateStr(new Date()).slice(5, 10);
        const currentYear   = new Date().getFullYear().toString();
        setOnThisDayEntries(
            entries.filter(e =>
                e.date.slice(5, 10) === todayMonthDay &&
                e.date.slice(0, 4) < currentYear
            )
        );
    }, []);

    const loadDayData = useCallback(async (date: string) => {
        setLoading(true);
        try {
            const [allJournal, huntData, summary, visionLog] = await Promise.all([
                getJournalEntries(),
                loadDailyHunt(date),
                getDailySummary(date),
                getVisionActivity(date),
            ]);
            setDayEntries(allJournal.filter(e => e.date === date));
            setHunt(huntData.entries.length > 0 ? huntData : null);
            setVisionActivities(visionLog);
            setDailySummary(summary);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadBaseData();
        loadDayData(todayStr);
    }, [loadBaseData, loadDayData]); // todayStr is stable within a session

    useEffect(() => {
        const unsub = navigation.addListener('focus', () => {
            loadBaseData();
            loadDayData(selectedDate);
        });
        return unsub;
    }, [navigation, loadBaseData, loadDayData, selectedDate]);

    // ── Handlers ──────────────────────────────────────────────────────────────

    const handleDayPress = useCallback((dateStr: string) => {
        setSelectedDate(dateStr);
        loadDayData(dateStr);
        // In timeline mode, switch to calendar to show the day detail
        setViewMode('calendar');
        trackEvent('journal_entry_viewed', { date: dateStr });
    }, [loadDayData]);

    // ── Timeline derived data ─────────────────────────────────────────────────

    const filteredEntries = [...allEntries].sort((a, b) => b.createdAt - a.createdAt);

    const timelineSections = (() => {
        const grouped: Record<string, JournalEntry[]> = {};
        filteredEntries.forEach(e => {
            if (!grouped[e.date]) grouped[e.date] = [];
            grouped[e.date].push(e);
        });
        return Object.keys(grouped)
            .sort((a, b) => b.localeCompare(a))
            .map(date => ({ title: date, data: grouped[date] }));
    })();

    // ── Calendar feed items ───────────────────────────────────────────────────

    const calFeedItems: FeedItem[] = [
        ...dayEntries.map(e => ({ kind: 'journal' as const, entry: e, time: e.createdAt })),
        ...(hunt ? [{
            kind: 'hunt' as const, hunt,
            time: hunt.entries[0]?.completedAt
                ? new Date(hunt.entries[0].completedAt).getTime() : 0,
        }] : []),
        ...(visionActivities.length > 0 ? [{
            kind: 'vision' as const, activities: visionActivities,
            time: new Date(visionActivities[0].addedAt).getTime(),
        }] : []),
    ].sort((a, b) => a.time - b.time);

    const calDateLabel = new Date(selectedDate + 'T00:00:00').toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric',
    });

    // ── Timeline list header ──────────────────────────────────────────────────

    const renderTimelineHeader = () => (
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
            {onThisDayEntries.length > 0 && (
                <OnThisDayCard entries={onThisDayEntries} />
            )}
            <WeekStrip moodMap={moodMap} selectedDate={selectedDate} onDayPress={handleDayPress} />
            <TouchableOpacity
                style={styles.expandCalBtn}
                onPress={() => { setCalendarExpanded(e => !e); setViewMode('calendar'); }}
                activeOpacity={0.7}
            >
                <Text style={styles.expandCalText}>View full calendar</Text>
                <ChevronDownSvg />
            </TouchableOpacity>
        </View>
    );

    // ── Render ────────────────────────────────────────────────────────────────

    return (
        <View style={styles.container}>


            {/* ── Timeline view ── */}
            {viewMode === 'timeline' ? (
                <SectionList
                    sections={timelineSections}
                    keyExtractor={item => item.id}
                    renderItem={({ item }) => (
                        <View style={{ paddingHorizontal: 16 }}>
                            <EntryCard entry={item} />
                        </View>
                    )}
                    renderSectionHeader={({ section }) => (
                        <StickyDateHeader date={section.title} />
                    )}
                    stickySectionHeadersEnabled={true}
                    ListHeaderComponent={renderTimelineHeader}
                    ListEmptyComponent={() => (
                        <View style={[styles.emptyState, { paddingHorizontal: 16 }]}>
                            <Text style={styles.emptyTitle}>Start journaling</Text>
                            <Text style={styles.emptyText}>Your entries will appear here</Text>
                        </View>
                    )}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 130, paddingTop: headerHeight }}
                />
            ) : (
                /* ── Calendar view ── */
                <ScrollView
                    style={styles.scroll}
                    showsVerticalScrollIndicator={false}
                    contentContainerStyle={{ paddingBottom: 120, paddingHorizontal: 16, paddingTop: headerHeight }}
                >
                    <View style={{ paddingTop: 8 }}>
                        <WeekStrip moodMap={moodMap} selectedDate={selectedDate} onDayPress={handleDayPress} />

                        <TouchableOpacity
                            style={styles.expandCalBtn}
                            onPress={() => setCalendarExpanded(e => !e)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.expandCalText}>
                                {calendarExpanded ? 'Hide full calendar' : 'View full calendar'}
                            </Text>
                            <ChevronDownSvg rotated={calendarExpanded} />
                        </TouchableOpacity>

                        {calendarExpanded && (
                            <>
                                <MoodCalendar
                                    moodMap={moodMap}
                                    selectedDate={selectedDate}
                                    onDayPress={handleDayPress}
                                />
                                <CalendarLegend />
                            </>
                        )}

                        {loading ? (
                            <ActivityIndicator color={YELLOW} style={{ paddingVertical: 40 }} />
                        ) : (
                            <>
                                {selectedDate !== todayStr && (
                                    <JumpTodayChip onPress={() => {
                                        setSelectedDate(todayStr);
                                        loadDayData(todayStr);
                                    }} />
                                )}

                                <MoodBanner entries={dayEntries} dateLabel={calDateLabel} />
                                {dailySummary ? <SummaryCard summary={dailySummary} /> : null}

                                {calFeedItems.length > 0 ? (
                                    <>
                                        <SectionLabel label="Timeline" />
                                        {calFeedItems.map((item, i) =>
                                            item.kind === 'journal'
                                                ? <EntryCard key={item.entry.id} entry={item.entry} />
                                                : item.kind === 'hunt'
                                                    ? <HuntCard key={`hunt-${i}`} hunt={item.hunt} />
                                                    : <VisionCard key={`vision-${i}`} activities={item.activities} />
                                        )}
                                    </>
                                ) : (
                                    <View style={styles.emptyState}>
                                        <View style={styles.emptyIconWrap}>
                                            <Svg width={36} height={36} viewBox="0 0 24 24" fill="none">
                                                <SvgPath d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                                                    stroke={WHITE} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
                                                <SvgPath d="M14 2v6h6M8 13h8M8 17h5"
                                                    stroke={WHITE + '80'} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </View>
                                        <Text style={styles.emptyTitle}>Nothing here yet</Text>
                                        <Text style={styles.emptyText}>This day has no recorded entries</Text>
                                    </View>
                                )}
                            </>
                        )}
                    </View>
                </ScrollView>
            )}


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
