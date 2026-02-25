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
import { useTheme } from '../context/ThemeContext';
import { getJournalEntries, JournalEntry } from '../utils/journalStorage';

import { supabase } from '../lib/supabase';
import { InsightModal } from './InsightModal';

const { width: screenWidth } = Dimensions.get('window');

interface CalendarModalProps {
    visible: boolean;
    onClose: () => void;
    onShowPaywall: () => void;
}

export const CalendarModal: React.FC<CalendarModalProps> = ({ visible, onClose, onShowPaywall }) => {
    const { theme } = useTheme();
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
            console.log("Fetching weekly insights...");
            const { data, error } = await supabase.functions.invoke('analyze-weekly');
            if (error) {
                // Parse detailed error if possible
                const msg = (error as any).message || JSON.stringify(error);
                throw new Error(msg);
            }
            console.log("Insights received:", data);
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
                dotColor: theme.colors.text,
                activeOpacity: 0.8,
            };
        });

        // Highlight selected date
        if (selectedDate) {
            marks[selectedDate] = {
                ...marks[selectedDate],
                selected: true,
                selectedColor: theme.colors.accent,
                selectedTextColor: theme.colors.background,
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
                        dotColor: theme.colors.text,
                    };
                }
            });

            // Set new selection
            if (selectedDate) {
                newMarks[selectedDate] = {
                    ...newMarks[selectedDate],
                    selected: true,
                    selectedColor: theme.colors.text,
                    selectedTextColor: theme.colors.background,
                    marked: !!entries[selectedDate],
                    dotColor: entries[selectedDate] ? theme.colors.background : undefined,
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

    // Debug logging
    if (selectedEntry) {
        console.log('[CALENDAR] selectedEntry:', JSON.stringify({
            date: selectedEntry.date,
            imageUri: selectedEntry.imageUri,
            images: selectedEntry.images,
            hasImages: !!selectedEntry.images,
        }));
        console.log('[CALENDAR] displayImages:', displayImages);
    }

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={[styles.title, { color: theme.colors.text }]}>Journal</Text>
                    <Text style={{ fontFamily: 'Carlito', color: theme.colors.text, opacity: 0.5, fontSize: 13 }}>Your reflection history</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d="M6 18L18 6M6 6l12 12" stroke={theme.colors.text} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Weekly Summary Card */}
                <TouchableOpacity
                    style={[styles.weeklySummaryCard, { backgroundColor: theme.colors.primaryContainer, borderColor: theme.colors.primary + '30' }]}
                    onPress={handleOpenInsights}
                    activeOpacity={0.7}
                >
                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                        <Path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke={theme.colors.primary} strokeWidth={1.5} fill={theme.colors.primary + '20'} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={{ fontFamily: 'Caveat-Bold', fontSize: 18, color: theme.colors.onPrimaryContainer }}>Weekly Spirit Summary ✨</Text>
                        <Text style={{ fontFamily: 'Carlito', fontSize: 12, color: theme.colors.onPrimaryContainer, opacity: 0.7 }}>Tap to see Ulbo's insights for your week</Text>
                    </View>
                    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                        <Path d="M9 18l6-6-6-6" stroke={theme.colors.primary} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                    </Svg>
                </TouchableOpacity>

                {/* Calendar */}
                <View style={styles.calendarContainer}>
                    <Calendar
                        theme={{
                            backgroundColor: theme.colors.background,
                            calendarBackground: theme.colors.background,
                            textSectionTitleColor: theme.colors.accent,
                            selectedDayBackgroundColor: theme.colors.text,
                            selectedDayTextColor: theme.colors.background,
                            todayTextColor: theme.colors.text,
                            dayTextColor: theme.colors.text,
                            textDisabledColor: '#d9e1e8',
                            dotColor: theme.colors.text,
                            selectedDotColor: theme.colors.background,
                            arrowColor: theme.colors.text,
                            monthTextColor: theme.colors.text,
                            indicatorColor: theme.colors.text,
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
                                <Text style={[styles.dateLabel, { color: theme.colors.accent }]}>
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
                                        <View style={[styles.card, { borderColor: theme.colors.accent }]}>
                                            <Text style={[styles.quoteText, { color: theme.colors.text }]}>
                                                "{selectedEntry.quoteText}"
                                            </Text>
                                            <View style={[styles.divider, { backgroundColor: theme.colors.accent }]} />
                                            <Text style={[styles.reflectionLabel, { color: theme.colors.accent }]}>
                                                YOU WROTE
                                            </Text>
                                            <Text style={[styles.reflectionText, { color: theme.colors.text }]}>
                                                {selectedEntry.response}
                                            </Text>
                                        </View>

                                        {/* Spirit Box - AI Analysis */}
                                        {(selectedEntry.spiritReply || selectedEntry.moodScore) && (
                                            <View style={[styles.spiritBox, { backgroundColor: theme.colors.paper, borderColor: theme.colors.accent }]}>
                                                <View style={styles.spiritHeader}>
                                                    <Text style={[styles.spiritTitle, { color: theme.colors.primary }]}>✨ Ulbo's Whisper</Text>
                                                    {selectedEntry.moodScore && (
                                                        <View style={[styles.moodBadge, { backgroundColor: theme.colors.background }]}>
                                                            <Text style={[styles.moodText, { color: theme.colors.text }]}>
                                                                Mood: {selectedEntry.moodScore}/10
                                                            </Text>
                                                        </View>
                                                    )}
                                                </View>

                                                {selectedEntry.spiritReply && (
                                                    <Text style={[styles.spiritText, { color: theme.colors.text }]}>
                                                        {selectedEntry.spiritReply}
                                                    </Text>
                                                )}

                                                {selectedEntry.sentimentTags && selectedEntry.sentimentTags.length > 0 && (
                                                    <View style={styles.tagContainer}>
                                                        {selectedEntry.sentimentTags.map((tag, idx) => (
                                                            <View key={idx} style={[styles.tag, { backgroundColor: theme.colors.background }]}>
                                                                <Text style={[styles.tagText, { color: theme.colors.text }]}>#{tag}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                )}
                                            </View>
                                        )}

                                        {/* Pending State Indicator */}
                                        {(!selectedEntry.spiritReply && !selectedEntry.moodScore) && (
                                            <View style={{ marginTop: 20, alignItems: 'center' }}>
                                                <Text style={{ color: theme.colors.text, opacity: 0.5, fontStyle: 'italic' }}>
                                                    Ulbo is thinking... (Pull down to refresh)
                                                </Text>
                                            </View>
                                        )}

                                    </View>
                                )}
                            </View>
                        ) : (
                            <View style={styles.emptyState}>
                                <Text style={[styles.emptyText, { color: theme.colors.accent }]}>
                                    No entry for this day.
                                </Text>
                            </View>
                        )
                    ) : (
                        <View style={styles.emptyState}>
                            <Text style={[styles.emptyText, { color: theme.colors.accent }]}>
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
        fontFamily: 'Caveat-Bold',
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
        borderWidth: 1,
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
        fontFamily: 'Carlito',
    },
    card: {
        borderWidth: 1,
        padding: 24,
        borderRadius: 16,
    },
    galleryContainer: {
        marginBottom: 20,
    },
    imageContainer: {
        aspectRatio: 0.6, // Matches screen aspect somewhat
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
        fontFamily: 'Caveat-Regular',
        marginBottom: 24,
    },
    divider: {
        height: 1,
        opacity: 0.2,
        marginBottom: 24,
    },
    reflectionLabel: {
        fontSize: 12,
        fontFamily: 'Carlito',
        letterSpacing: 2,
        marginBottom: 12,
        opacity: 0.7,
    },
    reflectionText: {
        fontSize: 18,
        lineHeight: 26,
        fontFamily: 'Carlito',
    },
    emptyState: {
        paddingTop: 40,
        alignItems: 'center',
    },
    emptyText: {
        fontSize: 18,
        fontFamily: 'Carlito',
    },
    spiritBox: {
        marginTop: 24,
        padding: 20,
        borderRadius: 16,
        borderWidth: 2,
        borderStyle: 'dashed',
    },
    spiritHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    spiritTitle: {
        fontSize: 20,
        fontFamily: 'Caveat-Bold',
    },
    spiritText: {
        fontSize: 16,
        lineHeight: 24,
        fontFamily: 'Carlito',
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
