import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View,
    StyleSheet,
    Alert,
    Share,
    Dimensions,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import * as ImagePicker from 'expo-image-picker';
import { MascotMood } from '../hooks/useMascotState';
import { TextBoxData, generateTextBoxId } from '../components/DraggableTextBox';
import { Stroke, Point, Quote, UserProgress, TabScreenNavigationProp } from '../types';
import { generateId } from '../utils/dateHelpers';
import { saveDrawingAsImage } from '../utils/storage';
import { addJournalImage, getTodayDateString, syncJournalWithSupabase } from '../utils/journalStorage';
import Svg, { Path as SvgPath } from 'react-native-svg';

import { useAuth } from '../context/AuthContext';
import { usePurchase } from '../context/PurchaseContext';
import { trackEvent } from '../lib/analytics';
import quotesData from '../data/quotes.json';
import { useDailyQuote } from '../hooks/useDailyQuote';

// Canvas components
import { CanvasHeader, CanvasMode } from '../components/CanvasHeader';
import { CanvasSidebar } from '../components/CanvasSidebar';
import { PaperCanvas } from '../components/PaperCanvas';
import { CanvasFooter } from '../components/CanvasFooter';


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
    // ── Drawing mode (draw-only now) ──────────────────────────────
    const [mode] = useState<CanvasMode>('draw');

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



    const handleShareFromModal = useCallback(async () => {
        if (!savedEntryData?.uri) return;
        try {
            await Share.share({ url: savedEntryData.uri, message: 'Created with Ulbo — my daily reflection' });
            handleAwardXP('shareReflection', 'Shared reflection');
        } catch (e) { console.log('Share cancelled'); }
    }, [savedEntryData]);



    // Text box handlers
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



    return (
        <SafeAreaView style={styles.container} edges={['top']}>

            {/* ===== HEADER with Draw | Journal segment ===== */}
            <CanvasHeader
                onDone={handleDone}
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
                        onRegenerate={handleRegenerate}
                        onAddImage={handleAddImage}
                        onPaper={() => setPaperSelectorVisible(true)}
                        onClear={handleClear}
                    />

                    <CanvasFooter
                        isDragging={isDraggingAny}
                        isDraggingOverDelete={isDraggingOverDelete}
                        deleteButtonRef={deleteButtonRef}
                        onDeleteZoneLayout={handleDeleteZoneLayout}
                    />

                </>
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
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#FFFFFF',
    },


});

export default CanvasScreen;
