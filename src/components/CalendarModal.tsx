import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
    Image,
    Platform,
    RefreshControl,
} from 'react-native';
import { Calendar, DateData } from 'react-native-calendars';
import { Svg, Path } from 'react-native-svg';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getJournalEntries, JournalEntry } from '../utils/journalStorage';

import { supabase } from '../lib/supabase';
import { InsightModal } from './InsightModal';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

const { width: screenWidth } = Dimensions.get('window');

interface CalendarModalProps {
    visible: boolean;
    onClose: () => void;
    onShowPaywall: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ visible, onClose, onShowPaywall }) => {
    const [entries, setEntries] = useState<{ [date: string]: JournalEntry }>({});
    const [selectedDate, setSelectedDate] = useState<string>('');
    const [markedDates, setMarkedDates] = useState<{ [date: string]: any }>({});
    const [refreshing, setRefreshing] = useState(false);
    const [showInsights, setShowInsights] = useState(false);

    // Insight State
    const [insightData, setInsightData] = useState<any>(null);
    const [insightLoading, setInsightLoading] = useState(false);
    const [insightError, setInsightError] = useState<string | null>(null);

    const onRefresh = React.useCallback(() => {
        setRefreshing(true);
        loadEntries().then(() => setRefreshing(false));
    }, []);

    const handleOpenInsights = async () => {
        setShowInsights(true);
        setInsightLoading(true);
        setInsightError(null);
        setInsightData(null); // Reset prev data while loading

        try {
            const { data, error } = await supabase.functions.invoke('analyze-weekly');
            if (error) {
                const msg = (error as any).message || JSON.stringify(error);
                throw new Error(msg);
            }
            setInsightData(data);
        } catch (err: any) {
            console.error("Insight Error:", err);
            setInsightError(err.message || "Failed to consult the spirits.");
        } finally {
            setInsightLoading(false);
        }
    };

    // Load entries when modal opens
    useEffect(() => {
        if (visible) {
            loadEntries();
        }
    }, [visible]);

    const loadEntries = async () => {
        const allEntries = await getJournalEntries();
        const entryMap: { [date: string]: JournalEntry } = {};
        const marks: { [date: string]: any } = {};

        allEntries.forEach(entry => {
            entryMap[entry.date] = entry;
            marks[entry.date] = {
                marked: true,
                dotColor: BLACK,
                activeOpacity: 0.8,
            };
        });

        // Highlight selected date
        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: BLACK,
                selectedTextColor: WHITE,
            };
        }

        setEntries(entryMap);
        setMarkedDates(marks);
    };

    // Update marks when selection changes
    useEffect(() => {
        if (Object.keys(entries).length > 0) {
            const newMarks = { ...markedDates };

            // Reset previous selection style (keep dot if exists)
            Object.keys(newMarks).forEach(date => {
                if (newMarks[date].selected) {
                    newMarks[date] = {
                        marked: !!entries[date],
                        dotColor: BLACK,
                    };
                }
            });

            // Set new selection
            if (selectedDate) {
                newMarks[selectedDate] = {
                    ...newMarks[selectedDate],
                    selected: true,
                    selectedColor: BLACK,
                    selectedTextColor: WHITE,
                    marked: !!entries[selectedDate],
                    dotColor: entries[selectedDate] ? WHITE : undefined,
                };
            }
            setMarkedDates(newMarks);
        }
    }, [selectedDate, entries]);

    const handleDayPress = (day: DateData) => {
        setSelectedDate(day.dateString);
    };

    const selectedEntry = entries[selectedDate];
    const displayImages = selectedEntry ? (selectedEntry.images || (selectedEntry.imageUri ? [selectedEntry.imageUri] : [])) : [];

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: WHITE }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: BLACK }]}>Journal</Text>
                    <Text style={{ fontFamily: 'MontserratAlternates-ExtraBoldItalic', color: BLACK, opacity: 0.5, fontSize: 13 }}>Your reflection history</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d="M6 18L18 6M6 6l12 12" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Weekly Summary Card */}
                <TouchableOpacity
                    style={[styles.weeklySummaryCard, { backgroundColor: YELLOW, borderColor: BLACK }]}
                    onPress={handleOpenInsights}
                    activeOpacity={0.7}
                >
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={BLACK} strokeWidth={1.5} fill={YELLOW} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontFamily: 'MontserratAlternates-ExtraBoldItalic', fontSize: 18, color: BLACK }}>Weekly Spirit Summary</Text>
                        <Text style={{ fontFamily: 'MontserratAlternates-ExtraBoldItalic', fontSize: 12, color: BLACK, opacity: 0.7 }}>Tap to see Ulbo's insights for your week</Text>
                    </View>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 18l6-6-6-6" stroke={BLACK} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>

                {/* Calendar */}
                <View style={styles.calendarContainer}>
                    <Calendar
                        theme={{
                            backgroundColor: WHITE,
                            calendarBackground: WHITE,
                            textSectionTitleColor: BLACK,
                            selectedDayBackgroundColor: BLACK,
                            selectedDayTextColor: WHITE,
                            todayTextColor: BLACK,
                            dayTextColor: BLACK,
                            textDisabledColor: '#d9e1e8',
                            dotColor: BLACK,
                            selectedDotColor: WHITE,
                            arrowColor: BLACK,
                            monthTextColor: BLACK,
                            indicatorColor: BLACK,
                            textDayFontWeight: '300',
                            textMonthFontWeight: 'bold',
                            textDayHeaderFontWeight: '300',
                            textDayFontSize: 16,
                            textMonthFontSize: 16,
                            textDayHeaderFontSize: 13
                        }}
                        onDayPress={handleDayPress}
                        markedDates={markedDates}
                        enableSwipeMonths={true}
                    />
                </View>

                {/* Selected Entry Detail */}
                <ScrollView
                    style={styles.detailContainer}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                    }
                >
                    {selectedDate ? (
                        selectedEntry ? (
                            <View style={styles.entryContent}>
                                <Text style={[styles.dateLabel, { color: BLACK }]}>
                                    {new Date(selectedDate).toLocaleDateString(undefined, {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric',
                                    })}
                                </Text>

                                {displayImages.length > 0 ? (
                                    <ScrollView
                                        horizontal
                                        pagingEnabled
                                        showsHorizontalScrollIndicator={false}
                                        style={styles.galleryContainer}
                                    >
                                        {displayImages.map((uri, index) => (
                                            <View key={index} style={[styles.imageContainer, { width: screenWidth - 48 }]}>
                                                <Image
                                                    source={{ uri }}
                                                    style={styles.journalImage}
                                                    resizeMode="contain"
                                                />
                                            </View>
                                        ))}
                                    </ScrollView>
                                ) : (
                                    <View>
                                        <View style={[styles.card, { borderColor: BLACK }]}>
                                            <Text style={[styles.quoteText, { color: BLACK }]}>
                                                "{selectedEntry.quoteText}"
                                            </Text>
                                            <View style={[styles.divider, { backgroundColor: BLACK }]} />
                                            <Text style={[styles.reflectionLabel, { color: BLACK }]}>
                                                YOU WROTE
                                            </Text>
                                            <Text style={[styles.reflectionText, { color: BLACK }]}>
                                                {selectedEntry.response}
                                            </Text>
                                        </View>

                                        {/* Spirit Box - AI Analysis */}
                                        {(selectedEntry.spiritReply || selectedEntry.moodScore) && (
                                            <View style={[styles.spiritBox, { backgroundColor: WHITE, borderColor: BLACK }]}>
                                                <View style={styles.spiritHeader}>
                                                    <Text style={[styles.spiritTitle, { color: BLACK }]}>Ulbo's Whisper</Text>
                                                    {selectedEntry.moodScore && (
                                                        <View style={[styles.moodBadge, { backgroundColor: YELLOW }]}>
                                                            <Text style={[styles.moodText, { color: BLACK }]}>
                                                                Mood: {selectedEntry.moodScore}/10
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {selectedEntry.spiritReply && (
                                                    <Text style={[styles.spiritText, { color: BLACK }]}>
                                                        {selectedEntry.spiritReply}
                                                    </Text>
                                                )}

                                                {selectedEntry.sentimentTags && selectedEntry.sentimentTags.length > 0 && (
                                                    <View style={styles.tagContainer}>
                                                        {selectedEntry.sentimentTags.map((tag, idx) => (
                                                            <View key={idx} style={[styles.tag, { backgroundColor: '#F0F0F0' }]}>
                                                                <Text style={[styles.tagText, { color: BLACK }]}>#{tag}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {/* Pending State Indicator */}
                                        {(!selectedEntry.spiritReply && !selectedEntry.moodScore) && (
                                            <View style={{ marginTop: 20, alignItems: 'center' }}>
                                                <Text style={{ color: BLACK, opacity: 0.5, fontStyle: 'italic' }}>
                                                    Ulbo is thinking... (Pull down to refresh)
                                                </Text>
                                            </View>
                                        )}

                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: BLACK }]}>
                                    No entry for this day.
                                </Text>
                            </View>
                        )
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: BLACK }]}>
                                Select a date to view your history.
                            </Text>
                        </View>
                    )}

                </ScrollView>
            </SafeAreaView >

            <InsightModal
                visible={showInsights}
                onClose={() => setShowInsights(false)}
                loading={insightLoading}
                data={insightData}
                error={insightError}
            />
        </Modal >
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        paddingTop: 20,
    },
    header: {
        flexDirection: 'column',
        paddingHorizontal: 24,
        paddingVertical: 12,
        position: 'relative',
    },
    title: {
        fontSize: 28,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    closeButton: {
        padding: 8,
        position: 'absolute',
        right: 16,
        top: 12,
    },
    weeklySummaryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginBottom: 12,
        padding: 14,
        borderRadius: 14,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    calendarContainer: {
        marginBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    detailContainer: {
        flex: 1,
        paddingHorizontal: 24,
    },
    entryContent: {
        paddingBottom: 40,
    },
    dateLabel: {
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 16,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    card: {
        padding: 24,
        borderRadius: 16,
        backgroundColor: '#FFF',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
    },
    galleryContainer: {
        marginBottom: 20,
    },
    imageContainer: {
        aspectRatio: 0.6,
        backgroundColor: 'rgba(0,0,0,0.02)',
        borderRadius: 12,
        overflow: 'hidden',
        marginRight: 10,
    },
    journalImage: {
        width: '100%',
        height: '100%',
    },
    quoteText: {
        fontSize: 20,
        lineHeight: 28,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        marginBottom: 24,
    },
    divider: {
        height: 1,
        opacity: 0.1,
        marginBottom: 24,
    },
    reflectionLabel: {
        fontSize: 12,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        letterSpacing: 2,
        marginBottom: 12,
        opacity: 0.7,
    },
    reflectionText: {
        fontSize: 18,
        lineHeight: 26,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    emptyState: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    spiritBox: {
        marginTop: 24,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        backgroundColor: '#FAFAFA',
    },
    spiritHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    spiritTitle: {
        fontSize: 20,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    spiritText: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        marginBottom: 12,
    },
    moodBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    moodText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    tag: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    tagText: {
        fontSize: 12,
        opacity: 0.8,
    },

});
