import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    Share,
    Dimensions,
    Platform,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    TouchableOpacity,
    Text,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { MascotMood } from '../hooks/useMascotState';
import { JournalInput } from '../components/JournalInput';
import { TextBoxData, generateTextBoxId } from '../components/DraggableTextBox';
import { Stroke, Point, Quote, UserProgress, TabScreenNavigationProp } from '../types';
import { generateId } from '../utils/dateHelpers';
import { saveDrawingAsImage } from '../utils/storage';
import { addJournalImage, getTodayDateString, syncJournalWithSupabase, saveJournalEntry, generateJournalId } from '../utils/journalStorage';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useAuth } from '../context/AuthContext';
import { usePurchase } from '../context/PurchaseContext';
import { useTheme } from '../context/ThemeContext';
import { trackEvent } from '../lib/analytics';
import quotesData from '../data/quotes.json';
import { useDailyQuote } from '../hooks/useDailyQuote';

// Canvas components
import { CanvasHeader, CanvasMode } from '../components/CanvasHeader';
import { CanvasSidebar } from '../components/CanvasSidebar';
import { PaperCanvas } from '../components/PaperCanvas';
import { CanvasFooter } from '../components/CanvasFooter';
import { SpiritResponseModal } from '../components/SpiritResponseModal';
import { analyzeJournalEntry, updateEntryWithAI } from '../utils/journalStorage';
import { AudioInput } from '../components/AudioInput';

// Progression
import { XPToast } from '../components/XPToast';
import { LevelModal } from '../components/LevelModal';
import { loadProgress, awardXP } from '../utils/progressionStorage';
import { LEVEL_TIERS } from '../data/progressionConfig';
import { PaperSelector } from '../components/PaperSelector';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { SavingOverlay } from '../components/SavingOverlay';
import { loadActivePaper, saveActivePaper } from '../utils/storage';
import { useFocusEffect } from '@react-navigation/native';

const quotes = quotesData as Quote[];

const { width: screenWidth, height: screenHeight } = Dimensions['get']('window');

export const CanvasScreen: React.FC = () => {
    const { user } = useAuth();
    const navigation = useNavigation<TabScreenNavigationProp<'Canvas'>>();
    const { quoteIndex: dailyQuoteIndex } = useDailyQuote();
    const { theme } = useTheme();
    const { colors } = theme;

    // ── Mode: 'draw' | 'journal' ──────────────────────────────
    const [mode, setMode] = useState<CanvasMode>('draw');
    const [journalText, setJournalText] = useState('');
    const [journalSaved, setJournalSaved] = useState(false);

    // Quote selection
    const [selectedCategory] = useState('All');
    const filteredQuotes = React.useMemo(() => {
        if (selectedCategory === 'All') return quotes;
        return quotes.filter(q => q.category === selectedCategory);
    }, [selectedCategory]);

    const [quoteIndex, setQuoteIndex] = useState(dailyQuoteIndex);
    React.useEffect(() => {
        setQuoteIndex(selectedCategory === 'All' ? dailyQuoteIndex : 0);
    }, [selectedCategory, dailyQuoteIndex]);

    // Drawing state
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [history, setHistory] = useState<{ strokes: Stroke[], textBoxes: TextBoxData[] }[]>([]);
    const [redoStack, setRedoStack] = useState<{ strokes: Stroke[], textBoxes: TextBoxData[] }[]>([]);
    const [textBoxes, setTextBoxes] = useState<TextBoxData[]>([]);
    const [isAnyTextEditing, setIsAnyTextEditing] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);

    const [deleteZone, setDeleteZone] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
    const [isDraggingOverDelete, setIsDraggingOverDelete] = useState(false);
    const [isDraggingAny, setIsDraggingAny] = useState(false);
    const deleteButtonRef = useRef<View>(null);
    const [isReflectionOpen, setIsReflectionOpen] = useState(false);

    // Paint/color state
    const [selectedColor, setSelectedColor] = useState('#5E4B3C');

    // Progression state
    const [userProgress, setUserProgress] = useState<UserProgress | null>(null);
    const [isLevelModalVisible, setIsLevelModalVisible] = useState(false);
    const [xpToast, setXpToast] = useState<{ amount: number; label?: string; leveledUp?: boolean; newLevelTitle?: string } | null>(null);

    // Paper state
    const [activePaper, setActivePaper] = useState('plain');
    const [paperSelectorVisible, setPaperSelectorVisible] = useState(false);

    // Custom Alerts State
    const [showClearModal, setShowClearModal] = useState(false);
    const [savingStatus, setSavingStatus] = useState<'saving' | 'success' | 'error' | null>(null);
    const [savedEntryData, setSavedEntryData] = useState<{ uri: string, reflectionText?: string, entryId?: string } | null>(null);

    useFocusEffect(
        React.useCallback(() => {
            const loadData = async () => {
                const paper = await loadActivePaper();
                setActivePaper(paper);
                const progress = await loadProgress();
                if (progress) {
                    setUserProgress(progress);
                }
            };
            loadData();
        }, [])
    );

    const handleSelectPaper = async (paperId: string) => {
        setActivePaper(paperId);
        await saveActivePaper(paperId);
        setPaperSelectorVisible(false);
    };

    // Spirit Modal
    const [isSpiritModalVisible, setIsSpiritModalVisible] = useState(false);
    const [spiritLoading, setSpiritLoading] = useState(false);
    const [spiritData, setSpiritData] = useState<{ reply: string; mood: number; tags: string[] } | null>(null);
    const lastSavedUriRef = useRef<string | null>(null);

    const [mascotMoodOverride, setMascotMoodOverride] = useState<MascotMood | undefined>(undefined);
    const { isPremium } = usePurchase();

    // AFK timer
    const [isAfk, setIsAfk] = useState(false);
    const afkTimerRef = useRef<NodeJS.Timeout | null>(null);
    const resetAfkTimer = useCallback(() => {
        setIsAfk(false);
        if (afkTimerRef.current) clearTimeout(afkTimerRef.current);
        afkTimerRef.current = setTimeout(() => setIsAfk(true), 30000);
    }, []);

    useEffect(() => {
        resetAfkTimer();
        return () => { if (afkTimerRef.current) clearTimeout(afkTimerRef.current); };
    }, [resetAfkTimer]);

    // Init
    React.useEffect(() => {
        initProgression();
    }, []);

    React.useEffect(() => {
        if (user) syncJournalWithSupabase();
    }, [user]);

    const initProgression = useCallback(async () => {
        const progress = await loadProgress();
        setUserProgress(progress);
    }, []);

    const handleAwardXP = useCallback(async (action: Parameters<typeof awardXP>[0], label: string) => {
        if (!userProgress) return;
        const result = await awardXP(action, userProgress);
        setUserProgress(result.progress);
        if (result.xpGained > 0) {
            setXpToast({
                amount: result.xpGained,
                label,
                leveledUp: result.leveledUp,
                newLevelTitle: result.leveledUp ? LEVEL_TIERS.find(t => t.level === result.progress.level)?.title : undefined,
            });
        }
    }, [userProgress]);

    // Refs
    const viewRef = useRef<View>(null);
    const dragStartSnapshot = useRef<{ strokes: Stroke[], textBoxes: TextBoxData[] } | null>(null);
    const quote = filteredQuotes[quoteIndex] || filteredQuotes[0] || quotes[0];
    const reflectionBox = React.useMemo(() => textBoxes.find(b => b.isReflection), [textBoxes]);
    const strokeColor = selectedColor;
    const strokeWidth = 2.5;
    const canvasOffset = useRef({ x: 0, y: 0, width: 0, height: 0 });

    // Canvas coordinate helpers
    const handleCanvasLayout = useCallback(() => {
        if (viewRef.current) {
            (viewRef.current as any).measure(
                (_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
                    canvasOffset.current = { x: pageX, y: pageY, width, height };
                }
            );
        }
    }, []);

    const getCanvasPoint = useCallback((locationX: number, locationY: number): Point | null => {
        const x = locationX;
        const y = locationY;
        const { width, height } = canvasOffset.current;
        if (x < 0 || y < 0 || (width > 0 && x > width) || (height > 0 && y > height)) return null;
        return { x, y };
    }, []);

    // Touch handlers
    const handleTouchStart = useCallback((event: any) => {
        resetAfkTimer();
        if (isAnyTextEditing) return;
        const { locationX, locationY } = event.nativeEvent;
        const point = getCanvasPoint(locationX, locationY);
        if (point) {
            setIsDrawing(true);
            setCurrentStroke([point]);
        }
    }, [isAnyTextEditing, resetAfkTimer, getCanvasPoint]);

    const handleTouchMove = useCallback((event: any) => {
        if (!isDrawing) return;
        const { locationX, locationY } = event.nativeEvent;
        const point = getCanvasPoint(locationX, locationY);
        if (point) setCurrentStroke(prev => [...prev, point]);
    }, [isDrawing, getCanvasPoint]);

    const handleTouchEnd = useCallback(() => {
        if (currentStroke.length > 0) {
            const newStroke: Stroke = {
                id: generateId(),
                points: currentStroke,
                color: strokeColor,
                width: strokeWidth,
            };
            setHistory(prev => [...prev, { strokes, textBoxes }]);
            setStrokes(prev => [...prev, newStroke]);
            setRedoStack([]);
        }
        setCurrentStroke([]);
        setIsDrawing(false);
    }, [currentStroke, strokes, textBoxes, strokeColor]);

    // Actions
    const handleUndo = useCallback(() => {
        if (history.length === 0) return;
        const prev = history[history.length - 1];
        if (!prev?.strokes || !prev?.textBoxes) { setHistory(p => p.slice(0, -1)); return; }
        setRedoStack(p => [...p, { strokes, textBoxes }]);
        setStrokes(prev.strokes);
        setTextBoxes(prev.textBoxes);
        setHistory(p => p.slice(0, -1));
    }, [history, strokes, textBoxes]);

    const handleRedo = useCallback(() => {
        if (redoStack.length === 0) return;
        const next = redoStack[redoStack.length - 1];
        if (!next?.strokes || !next?.textBoxes) { setRedoStack(p => p.slice(0, -1)); return; }
        setHistory(p => [...p, { strokes, textBoxes }]);
        setStrokes(next.strokes);
        setTextBoxes(next.textBoxes);
        setRedoStack(p => p.slice(0, -1));
    }, [redoStack, strokes, textBoxes]);

    const handleClear = useCallback(() => {
        setShowClearModal(true);
    }, []);

    const confirmClear = useCallback(() => {
        setHistory(prev => [...prev, { strokes, textBoxes }]);
        setStrokes([]);
        setRedoStack([]);
        setShowClearModal(false);
    }, [strokes, textBoxes]);

    const handleRegenerate = useCallback(() => {
        if (!isPremium) {
            Alert.alert('Unlock Unlimited Quotes', 'Regenerate quotes endlessly with Ulbo Premium.', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Upgrade', onPress: () => navigation.navigate('Paywall') },
            ]);
            return;
        }
        Haptics.selectionAsync();
        if (filteredQuotes.length <= 1) return;
        let newIndex;
        do { newIndex = Math.floor(Math.random() * filteredQuotes.length); } while (newIndex === quoteIndex);
        setQuoteIndex(newIndex);
        handleAwardXP('readQuote', 'New quote');
        trackEvent('quote_viewed', { category: selectedCategory, quote_id: filteredQuotes[newIndex]?.id });
    }, [quoteIndex, filteredQuotes, handleAwardXP]);

    // "Done" = Save canvas, then show overlay
    const handleDone = useCallback(async () => {
        if (mode === 'journal') {
            navigation.navigate('Home');
            return;
        }
        setMascotMoodOverride('excited');
        setSavingStatus('saving');

        try {
            await new Promise(resolve => setTimeout(resolve, 500));

            if (viewRef.current) {
                let tmpFilePath = await captureRef(viewRef, { format: 'png', quality: 1 });
                if (!tmpFilePath.startsWith('file://')) tmpFilePath = 'file://' + tmpFilePath;
                const filename = `ulbo-${Date.now()}`;
                const savedUri = await saveDrawingAsImage(tmpFilePath, filename);

                if (savedUri) {
                    lastSavedUriRef.current = savedUri;
                    const todayDate = getTodayDateString();
                    const reflectionText = textBoxes.find(b => b.isReflection)?.text;
                    const savedEntry = await addJournalImage(todayDate, savedUri, { id: quote.id, text: quote.text }, reflectionText);

                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    handleAwardXP('saveCanvas', 'Saved canvas');
                    trackEvent('canvas_saved', { has_drawing: strokes.length > 0, has_reflection: !!reflectionBox });

                    setSavedEntryData({
                        uri: savedUri,
                        reflectionText,
                        entryId: savedEntry?.id
                    });
                    setSavingStatus('success');
                } else {
                    throw new Error("Failed to save image");
                }
            }
        } catch (error) {
            console.error('Error saving:', error);
            setMascotMoodOverride(undefined);
            setSavingStatus('error');
        }
    }, [mode, quote, textBoxes, reflectionBox, strokes]);

    // ── Journal mode: save entry ──────────────────────────────
    const handleSaveJournalEntry = useCallback(async () => {
        const text = journalText.trim();
        if (text.length < 3) return;

        try {
            const entryId = generateJournalId();
            const entry = {
                id: entryId,
                quoteId: quote.id,
                quoteText: quote.text,
                response: text,
                createdAt: Date.now(),
                date: getTodayDateString(),
            };
            await saveJournalEntry(entry);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            handleAwardXP('writeReflection', 'Journal entry saved');
            trackEvent('reflection_written', { source: 'canvas_journal_tab', word_count: text.split(/\s+/).filter(Boolean).length });

            setJournalText('');
            setJournalSaved(true);
            setTimeout(() => setJournalSaved(false), 2500);

            // Offer AI analysis for substantial entries
            if (text.length > 30) {
                setSavedEntryData({ uri: '', reflectionText: text, entryId });
                setTimeout(() => {
                    setIsSpiritModalVisible(true);
                    setSpiritLoading(true);
                    analyzeJournalEntry(text, 'Friend')
                        .then(async (analysis) => {
                            if (analysis) {
                                setSpiritData(analysis);
                                await updateEntryWithAI(entryId, analysis);
                            }
                        })
                        .catch(err => console.error('Analysis failed:', err))
                        .finally(() => setSpiritLoading(false));
                }, 600);
            }
        } catch (err) {
            console.error('Journal save error:', err);
        }
    }, [journalText, quote, handleAwardXP]);

    const handleShareFromModal = useCallback(async () => {
        if (!savedEntryData?.uri) return;
        try {
            await Share.share({ url: savedEntryData.uri, message: 'Created with Ulbo — my daily reflection' });
            handleAwardXP('shareReflection', 'Shared reflection');
        } catch (e) { console.log('Share cancelled'); }
    }, [savedEntryData]);

    const handleAnalyzeFromModal = useCallback(() => {
        if (!savedEntryData?.reflectionText) return;
        setSavingStatus(null);

        setIsSpiritModalVisible(true);
        setSpiritLoading(true);
        setSpiritData(null);

        analyzeJournalEntry(savedEntryData.reflectionText, 'Friend').then(async (analysis) => {
            if (analysis) {
                setSpiritData(analysis);
                if (savedEntryData.entryId) await updateEntryWithAI(savedEntryData.entryId, analysis);
            }
        }).catch(err => console.error("Analysis failed:", err))
            .finally(() => setSpiritLoading(false));
    }, [savedEntryData]);

    const showSharePrompt = (savedUri: string) => {
        Alert.alert('Saved to calendar!', 'Share your creation?', [
            { text: 'Not now', style: 'cancel', onPress: () => setTimeout(() => setMascotMoodOverride(undefined), 3000) },
            {
                text: 'Share', onPress: async () => {
                    try {
                        await Share.share({ url: savedUri, message: `Created with Ulbo — my daily reflection` });
                        handleAwardXP('shareReflection', 'Shared reflection');
                    } catch (e) { console.log('Share cancelled or failed'); }
                    finally { setTimeout(() => setMascotMoodOverride(undefined), 3000); }
                }
            },
        ]);
    };

    // Text box handlers
    const handleAddMoreText = useCallback(() => {
        const nonReflectionBoxes = textBoxes.filter(b => !b.isReflection);
        if (nonReflectionBoxes.length >= 5) {
            Alert.alert("Limit Reached", "Max 5 text notes.");
            return;
        }
        setHistory(prev => [...prev, { strokes, textBoxes }]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const newBox: TextBoxData = {
            id: generateTextBoxId(),
            text: "",
            x: screenWidth * 0.25,
            y: screenHeight * 0.35,
            rotation: 0,
            scale: 1,
            isReflection: false,
            autoEdit: true,
        };
        setTextBoxes(prev => [...prev, newBox]);
        setRedoStack([]);
    }, [strokes, textBoxes]);

    const handleBoxUpdate = useCallback((id: string, updates: Partial<TextBoxData>) => {
        setTextBoxes(prev => prev.map(box => box.id === id ? { ...box, ...updates } : box));
    }, []);

    const handleDragStart = useCallback(() => {
        dragStartSnapshot.current = { strokes, textBoxes };
        setIsDraggingAny(true);
    }, [strokes, textBoxes]);

    const handleDrag = useCallback((x: number, y: number) => {
        if (deleteZone) {
            const isOver = x >= deleteZone.x && x <= deleteZone.x + deleteZone.width &&
                y >= deleteZone.y && y <= deleteZone.y + deleteZone.height;
            setIsDraggingOverDelete(isOver);
        }
    }, [deleteZone]);

    const handleDeleteTextBox = useCallback((id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        setHistory(prev => [...prev, { strokes, textBoxes }]);
        setTextBoxes(prev => prev.filter(box => box.id !== id));
        setRedoStack([]);
    }, [strokes, textBoxes]);

    const handleDragEnd = useCallback((id: string, x: number, y: number) => {
        if (isDraggingOverDelete) {
            handleDeleteTextBox(id);
            setIsDraggingOverDelete(false);
        }
        if (dragStartSnapshot.current) {
            setHistory(prev => [...prev, dragStartSnapshot.current!]);
            setRedoStack([]);
            dragStartSnapshot.current = null;
        }
        setIsDraggingAny(false);
    }, [isDraggingOverDelete, handleDeleteTextBox]);

    const handleTextChange = useCallback((id: string, text: string) => {
        setHistory(prev => [...prev, { strokes, textBoxes }]);
        setTextBoxes(prev => prev.map(box => box.id === id ? { ...box, text } : box));
        setRedoStack([]);
    }, [strokes, textBoxes]);

    const handleSaveToCanvas = useCallback((text: string) => {
        setHistory(prev => [...prev, { strokes, textBoxes }]);
        if (reflectionBox) {
            setTextBoxes(prev => prev.map(box => box.id === reflectionBox.id ? { ...box, text } : box));
        } else {
            const newBox: TextBoxData = {
                id: generateTextBoxId(),
                text,
                x: screenWidth * 0.1,
                y: screenHeight * 0.3,
                rotation: 0,
                scale: 1,
                isReflection: true,
            };
            setTextBoxes(prev => [...prev, newBox]);
        }
        setRedoStack([]);
    }, [strokes, textBoxes, reflectionBox]);

    const handleDeleteZoneLayout = useCallback(() => {
        deleteButtonRef.current?.measure((_x: number, _y: number, width: number, height: number, pageX: number, pageY: number) => {
            setDeleteZone({ x: pageX, y: pageY, width, height });
        });
    }, []);

    const handleColorChange = useCallback((color: string) => {
        setSelectedColor(color);
    }, []);

    const handleAddImage = useCallback(async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'] as any,
            allowsEditing: true,
            quality: 0.8,
        });
        if (!result.canceled) {
            const uri = result.assets[0].uri;
            const newBox: TextBoxData = {
                id: Date.now().toString(),
                text: `__IMAGE__${uri}`,
                x: screenWidth * 0.15,
                y: screenHeight * 0.2,
                isReflection: false,
                autoEdit: false,
            };
            setTextBoxes(prev => [...prev, newBox]);
        }
    }, []);

    const wordCount = journalText.trim().split(/\s+/).filter(Boolean).length;
    const canSaveJournal = journalText.trim().length >= 3;

    return (
        <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]} edges={['top']}>

            {/* ===== HEADER with Draw | Journal segment ===== */}
            <CanvasHeader
                onDone={handleDone}
                mode={mode}
                onModeChange={setMode}
            />

            {/* ===== DRAW MODE ===== */}
            {mode === 'draw' && (
                <>
                    <PaperCanvas
                        viewRef={viewRef}
                        strokes={strokes}
                        currentStroke={currentStroke}
                        strokeColor={strokeColor}
                        strokeWidth={strokeWidth}
                        quote={quote}
                        textBoxes={textBoxes}
                        isDrawing={isDrawing}
                        isAnyTextEditing={isAnyTextEditing}
                        mascotMoodOverride={mascotMoodOverride}
                        isAfk={isAfk}
                        onCanvasLayout={handleCanvasLayout}
                        onTouchStart={handleTouchStart}
                        onTouchMove={handleTouchMove}
                        onTouchEnd={handleTouchEnd}
                        onBoxUpdate={handleBoxUpdate}
                        onTextChange={handleTextChange}
                        onDeleteTextBox={handleDeleteTextBox}
                        onDragStart={handleDragStart}
                        onDrag={handleDrag}
                        onDragEnd={handleDragEnd}
                        onEditing={setIsAnyTextEditing}
                        activePaper={activePaper}
                    />

                    <CanvasSidebar
                        isDrawing={isDrawing}
                        onDrawToggle={() => setIsDrawing(!isDrawing)}
                        onUndo={handleUndo}
                        onRedo={handleRedo}
                        historyLength={history.length}
                        redoLength={redoStack.length}
                        selectedColor={selectedColor}
                        onColorChange={handleColorChange}
                        isPremium={isPremium}
                        onShowPaywall={() => navigation.navigate('Paywall')}
                    />

                    <CanvasFooter
                        onReflection={() => setMode('journal')}
                        onSave={handleDone}
                        onClear={handleClear}
                        onAddText={handleAddMoreText}
                        onAddImage={handleAddImage}
                        onRegenerate={handleRegenerate}
                        isDragging={isDraggingAny}
                        isDraggingOverDelete={isDraggingOverDelete}
                        deleteButtonRef={deleteButtonRef}
                        onDeleteZoneLayout={handleDeleteZoneLayout}
                        onVoiceInput={(text) => {
                            const newBox: TextBoxData = {
                                id: Date.now().toString(),
                                text,
                                x: screenWidth * 0.1,
                                y: screenHeight * 0.2,
                                isReflection: true,
                                autoEdit: false,
                            };
                            setTextBoxes(prev => [...prev, newBox]);
                            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

                            const currentQuote = filteredQuotes[quoteIndex % filteredQuotes.length];
                            const entry = {
                                id: generateJournalId(),
                                quoteId: currentQuote?.id || 0,
                                quoteText: currentQuote?.text || '',
                                response: text,
                                createdAt: Date.now(),
                                date: getTodayDateString(),
                            };
                            saveJournalEntry(entry).catch(err => console.error('Voice save failed:', err));
                        }}
                        onVoiceError={(err) => Alert.alert('Voice Error', err)}
                        onPaper={() => setPaperSelectorVisible(true)}
                    />

                    {isReflectionOpen && (
                        <JournalInput
                            quoteId={quote.id}
                            quoteText={quote.text}
                            onSaveToCanvas={(text: string) => {
                                handleSaveToCanvas(text);
                                setIsReflectionOpen(false);
                                handleAwardXP('writeReflection', 'Wrote reflection');
                            }}
                            onClose={() => setIsReflectionOpen(false)}
                            hasReflection={!!reflectionBox}
                            autoFocus={true}
                        />
                    )}
                </>
            )}

            {/* ===== JOURNAL MODE ===== */}
            {mode === 'journal' && (
                <KeyboardAvoidingView
                    style={styles.journalOuter}
                    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                    keyboardVerticalOffset={90}
                >
                    <ScrollView
                        style={styles.journalScroll}
                        contentContainerStyle={styles.journalContent}
                        keyboardShouldPersistTaps="handled"
                        showsVerticalScrollIndicator={false}
                    >
                        {/* Quote card */}
                        <View style={[styles.quoteCard, { backgroundColor: colors.surface ?? colors.paper, borderColor: colors.primary + '25' }]}>
                            <Text style={[styles.quoteLabel, { color: colors.primary + 'AA' }]}>today's quote</Text>
                            <Text style={[styles.quoteText, { color: colors.text }]}>"{quote.text}"</Text>
                            {quote.author ? (
                                <Text style={[styles.quoteAuthor, { color: colors.text + '60' }]}>— {quote.author}</Text>
                            ) : null}
                        </View>

                        {/* Writing area */}
                        <View style={[styles.writeCard, { backgroundColor: colors.surface ?? colors.paper, borderColor: colors.primary + '12' }]}>
                            <TextInput
                                style={[styles.journalInput, { color: colors.text }]}
                                placeholder="What's on your mind? What does this quote stir up for you?"
                                placeholderTextColor={colors.text + '35'}
                                multiline
                                value={journalText}
                                onChangeText={setJournalText}
                                textAlignVertical="top"
                                scrollEnabled={false}
                            />
                            {journalText.length > 0 && (
                                <Text style={[styles.wordCount, { color: colors.text + '40' }]}>
                                    {wordCount} {wordCount === 1 ? 'word' : 'words'}
                                </Text>
                            )}
                        </View>

                        {/* Saved confirmation */}
                        {journalSaved && (
                            <View style={[styles.savedBanner, { backgroundColor: colors.primary + '15' }]}>
                                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" style={{ marginRight: 6 }}>
                                    <SvgPath
                                        d="M9 12l2 2 4-4"
                                        stroke={colors.primary}
                                        strokeWidth={2}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <SvgPath
                                        d="M12 22C6.48 22 2 17.52 2 12S6.48 2 12 2s10 4.48 10 10-4.48 10-10 10z"
                                        stroke={colors.primary}
                                        strokeWidth={1.5}
                                    />
                                </Svg>
                                <Text style={[styles.savedBannerText, { color: colors.primary }]}>Entry saved!</Text>
                            </View>
                        )}

                        <View style={{ height: 120 }} />
                    </ScrollView>

                    {/* Bottom action bar */}
                    <View style={[styles.journalActions, { backgroundColor: colors.background, borderTopColor: colors.border + '20' }]}>
                        <AudioInput
                            onTranscriptionComplete={(text) =>
                                setJournalText(prev => (prev.trim() ? prev.trimEnd() + ' ' : '') + text)
                            }
                            onError={() => {}}
                        />

                        <TouchableOpacity
                            style={[
                                styles.saveEntryBtn,
                                {
                                    backgroundColor: canSaveJournal ? colors.primary : colors.text + '12',
                                },
                            ]}
                            onPress={handleSaveJournalEntry}
                            disabled={!canSaveJournal}
                            activeOpacity={0.8}
                        >
                            <Text style={[styles.saveEntryText, { color: canSaveJournal ? '#FFFFFF' : colors.text + '35' }]}>
                                Save Entry
                            </Text>
                        </TouchableOpacity>
                    </View>
                </KeyboardAvoidingView>
            )}

            {/* ===== SHARED MODALS ===== */}
            {userProgress && (
                <LevelModal
                    visible={isLevelModalVisible}
                    onClose={() => setIsLevelModalVisible(false)}
                    progress={userProgress}
                />
            )}

            <XPToast
                xpAmount={xpToast?.amount ?? 0}
                label={xpToast?.label}
                leveledUp={xpToast?.leveledUp}
                newLevelTitle={xpToast?.newLevelTitle}
                visible={!!xpToast}
                onDismiss={() => setXpToast(null)}
            />

            <SpiritResponseModal
                visible={isSpiritModalVisible}
                onClose={() => setIsSpiritModalVisible(false)}
                onShare={() => {
                    setIsSpiritModalVisible(false);
                    if (lastSavedUriRef.current) {
                        showSharePrompt(lastSavedUriRef.current);
                    }
                }}
                loading={spiritLoading}
                data={spiritData}
            />

            <PaperSelector
                visible={paperSelectorVisible}
                onDismiss={() => setPaperSelectorVisible(false)}
                currentPaper={activePaper}
                onSelectPaper={handleSelectPaper}
                userXP={userProgress?.totalXP || 0}
            />

            <ConfirmationModal
                visible={showClearModal}
                title="Clear Canvas"
                message="Are you sure you want to start over? This cannot be undone."
                confirmLabel="Clear"
                cancelLabel="Cancel"
                isDestructive
                onConfirm={confirmClear}
                onCancel={() => setShowClearModal(false)}
            />

            {mode === 'draw' && (
                <SavingOverlay
                    visible={!!savingStatus}
                    status={savingStatus || 'saving'}
                    onClose={() => {
                        setSavingStatus(null);
                        setMascotMoodOverride(undefined);
                        navigation.navigate('Home');
                    }}
                    onShare={handleShareFromModal}
                    onAnalyze={
                        (savedEntryData?.reflectionText && savedEntryData.reflectionText.length > 5)
                            ? handleAnalyzeFromModal
                            : undefined
                    }
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ── Journal mode ──────────────────────────────────────────
    journalOuter: {
        flex: 1,
    },
    journalScroll: {
        flex: 1,
    },
    journalContent: {
        paddingHorizontal: 20,
        paddingTop: 8,
        paddingBottom: 20,
        gap: 14,
    },
    quoteCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 20,
        gap: 8,
    },
    quoteLabel: {
        fontFamily: 'Caveat-Bold',
        fontSize: 13,
        letterSpacing: 1.2,
        textTransform: 'uppercase',
    },
    quoteText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 22,
        lineHeight: 30,
    },
    quoteAuthor: {
        fontFamily: 'Carlito',
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 2,
    },
    writeCard: {
        borderRadius: 18,
        borderWidth: 1,
        padding: 18,
        minHeight: 200,
    },
    journalInput: {
        fontFamily: 'Carlito',
        fontSize: 17,
        lineHeight: 26,
        minHeight: 160,
    },
    wordCount: {
        fontFamily: 'Carlito',
        fontSize: 12,
        textAlign: 'right',
        marginTop: 8,
    },
    savedBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        paddingHorizontal: 18,
        borderRadius: 14,
        alignSelf: 'center',
    },
    savedBannerText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 16,
    },

    // Bottom action bar
    journalActions: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 12,
        paddingBottom: Platform.OS === 'ios' ? 28 : 16,
        borderTopWidth: 1,
        gap: 12,
    },
    saveEntryBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },
    saveEntryText: {
        fontFamily: 'Caveat-Bold',
        fontSize: 18,
        letterSpacing: 0.3,
    },
});

export default CanvasScreen;
