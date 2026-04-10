import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Dimensions, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { captureRef } from 'react-native-view-shot';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { Stroke, Point } from '../types';
import { generateId } from '../utils/dateHelpers';
import { saveDrawingAsImage } from '../utils/storage';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { awardXP, loadProgress } from '../utils/progressionStorage';
import { XPToast } from '../components/XPToast';

const BLACK  = '#000000';
const WHITE  = '#FFFFFF';
const YELLOW = '#FFE600';

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');
const CANVAS_W = SCREEN_W - 32;

type BrushType = 'pencil' | 'crayon';

const BRUSHES: Record<BrushType, { strokeWidth: number; opacity: number }> = {
    pencil: { strokeWidth: 2,  opacity: 0.92 },
    crayon: { strokeWidth: 12, opacity: 0.52 },
};

const COLORS = ['#1C1C1C', '#2C4A6E', '#4A7C3F', '#8B3A3A', '#996600', '#6B4226', '#7B3F7A', '#E87040'];

const STAMPS_KEY = '@ulbo_stamps';

export interface StampEntry {
    id:   string;
    uri:  string;
    date: string;
}

const pointsToPath = (pts: Point[], dx = 0, dy = 0) => {
    if (!pts.length) return '';
    if (pts.length === 1) return `M ${pts[0].x + dx} ${pts[0].y + dy} L ${pts[0].x + dx} ${pts[0].y + dy}`;
    let d = `M ${pts[0].x + dx} ${pts[0].y + dy}`;
    for (let i = 1; i < pts.length; i++) d += ` L ${pts[i].x + dx} ${pts[i].y + dy}`;
    return d;
};

// Multi-layer offsets — heavy charcoal/pencil grain texture
const PENCIL_LAYERS = [
    // Core strokes (dense center)
    { dx: 0,    dy: 0,    op: 0.80, w: 3.0 },
    { dx: 0,    dy: 0,    op: 0.40, w: 5.5 },
    // Near grain
    { dx: 0.7,  dy: 0.3,  op: 0.38, w: 2.0 },
    { dx: -0.7, dy: 0.5,  op: 0.35, w: 1.8 },
    { dx: 0.5,  dy: -0.8, op: 0.30, w: 1.6 },
    { dx: -0.5, dy: -0.6, op: 0.28, w: 1.4 },
    { dx: 0.9,  dy: -0.3, op: 0.24, w: 1.2 },
    { dx: -0.9, dy: 0.8,  op: 0.22, w: 1.0 },
    // Mid scatter
    { dx: 1.8,  dy: 0.4,  op: 0.16, w: 1.0 },
    { dx: -1.6, dy: 0.9,  op: 0.15, w: 0.9 },
    { dx: 1.3,  dy: -1.5, op: 0.14, w: 0.8 },
    { dx: -1.5, dy: -1.2, op: 0.12, w: 0.7 },
    { dx: 2.1,  dy: -0.7, op: 0.10, w: 0.6 },
    { dx: -2.0, dy: 1.3,  op: 0.09, w: 0.6 },
    // Far grain scatter
    { dx: 2.8,  dy: 0.9,  op: 0.07, w: 0.5 },
    { dx: -2.7, dy: -1.6, op: 0.06, w: 0.5 },
    { dx: 1.5,  dy: 2.5,  op: 0.05, w: 0.4 },
    { dx: -1.7, dy: 2.7,  op: 0.05, w: 0.4 },
    { dx: 3.2,  dy: -1.2, op: 0.04, w: 0.4 },
    { dx: -3.0, dy: 1.8,  op: 0.04, w: 0.3 },
];

export const CanvasScreen: React.FC = () => {
    const headerHeight = useHeaderHeight();
    const insets = useSafeAreaInsets();
    // Canvas fills the gap between toolbar and tab bar exactly
    const CANVAS_H = SCREEN_H - headerHeight - (62 + insets.bottom) - 58 - 6 - 14 - 14;

    const [strokes,       setStrokes]       = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [history,       setHistory]       = useState<Stroke[][]>([]);
    const [redoStack,     setRedoStack]     = useState<Stroke[][]>([]);
    const [isDrawing,     setIsDrawing]     = useState(false);

    const [brushType,   setBrushType]   = useState<BrushType>('pencil');
    const [color,       setColor]       = useState(COLORS[0]);
    const [showColors,  setShowColors]  = useState(false);

    const [stamps,  setStamps]  = useState<StampEntry[]>([]);
    const [saving,  setSaving]  = useState(false);
    const [xpToast, setXpToast] = useState<{ amount: number; label?: string } | null>(null);

    const canvasRef = useRef<View>(null);
    // Screen-absolute origin of the canvas view — used to convert pageX/pageY to canvas coords
    const canvasOrigin = useRef({ x: 0, y: 0 });

    useEffect(() => {
        AsyncStorage.getItem(STAMPS_KEY).then(v => {
            if (v) setStamps(JSON.parse(v));
        });
    }, []);

    const handleTouchStart = useCallback((e: any) => {
        setIsDrawing(true);
        const { locationX, locationY, pageX, pageY } = e.nativeEvent;
        // Canvas is always the responder on grant — locationX/Y are accurate here.
        // Derive canvas screen origin so subsequent moves stay in the same coord space.
        canvasOrigin.current = { x: pageX - locationX, y: pageY - locationY };
        setCurrentStroke([{ x: locationX, y: locationY }]);
    }, []);

    const handleTouchMove = useCallback((e: any) => {
        if (!isDrawing) return;
        const { pageX, pageY } = e.nativeEvent;
        // Use screen-absolute coords minus the origin captured on touch start
        const x = Math.max(0, Math.min(CANVAS_W, pageX - canvasOrigin.current.x));
        const y = Math.max(0, Math.min(CANVAS_H, pageY - canvasOrigin.current.y));
        setCurrentStroke(prev => [...prev, { x, y }]);
    }, [isDrawing, CANVAS_H]);

    const handleTouchEnd = useCallback(() => {
        if (currentStroke.length > 0) {
            const { strokeWidth, opacity } = BRUSHES[brushType];
            const stroke: Stroke = {
                id:      generateId(),
                points:  currentStroke,
                color,
                width:   strokeWidth,
                opacity,
            };
            setHistory(prev => [...prev, strokes]);
            setStrokes(prev => [...prev, stroke]);
            setRedoStack([]);
        }
        setCurrentStroke([]);
        setIsDrawing(false);
    }, [currentStroke, strokes, color, brushType]);

    const handleUndo = () => {
        if (!history.length) return;
        setRedoStack(prev => [...prev, strokes]);
        setStrokes(history[history.length - 1]);
        setHistory(prev => prev.slice(0, -1));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleRedo = () => {
        if (!redoStack.length) return;
        setHistory(prev => [...prev, strokes]);
        setStrokes(redoStack[redoStack.length - 1]);
        setRedoStack(prev => prev.slice(0, -1));
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    };

    const handleClear = () => {
        if (!strokes.length) return;
        setHistory(prev => [...prev, strokes]);
        setStrokes([]);
        setRedoStack([]);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    };

    const handleStamp = async () => {
        if (!strokes.length) {
            Alert.alert('Draw something first!');
            return;
        }
        setSaving(true);
        try {
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            let tmpUri = await captureRef(canvasRef, { format: 'png', quality: 1 });
            if (!tmpUri.startsWith('file://')) tmpUri = 'file://' + tmpUri;
            const uri = await saveDrawingAsImage(tmpUri, `stamp-${Date.now()}`);
            if (!uri) throw new Error('save failed');

            const date  = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            const entry = { id: generateId(), uri, date };
            const updated = [entry, ...stamps];
            setStamps(updated);
            await AsyncStorage.setItem(STAMPS_KEY, JSON.stringify(updated));

            const progress = await loadProgress();
            const result   = await awardXP('saveCanvas', progress);
            if (result.xpGained > 0) setXpToast({ amount: result.xpGained, label: 'Stamp saved!' });

            setStrokes([]);
            setHistory([]);
            setRedoStack([]);
        } catch {
            Alert.alert('Could not save stamp');
        } finally {
            setSaving(false);
        }
    };

    const { strokeWidth, opacity: brushOpacity } = BRUSHES[brushType];
    const muted = (active: boolean) => active ? BLACK : BLACK + '28';

    return (
        <View style={[st.screen, { paddingTop: headerHeight }]}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={[st.scroll, { paddingBottom: 62 + insets.bottom + 24 }]}
                scrollEnabled={!isDrawing}
            >

                {/* ── Tool card ─────────────────────────────────── */}
                <View style={st.toolCard}>
                    {/* Single toolbar row */}
                    <View style={st.toolRow}>

                        {/* Brush: pencil */}
                        <TouchableOpacity
                            style={[st.brushBtn, brushType === 'pencil' && st.brushActive]}
                            onPress={() => setBrushType('pencil')}
                            activeOpacity={0.7}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <SvgPath d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z"
                                    stroke={brushType === 'pencil' ? BLACK : BLACK + '55'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>

                        {/* Brush: crayon */}
                        <TouchableOpacity
                            style={[st.brushBtn, brushType === 'crayon' && st.brushActive]}
                            onPress={() => setBrushType('crayon')}
                            activeOpacity={0.7}
                        >
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <SvgPath d="M5 16l-1 4 4-1L20 7l-3-3L5 16zM14 5l3 3"
                                    stroke={brushType === 'crayon' ? BLACK : BLACK + '55'} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>

                        <View style={st.sep} />

                        {/* Color dot — tap to toggle palette */}
                        <TouchableOpacity
                            style={[st.activeDot, { backgroundColor: color }]}
                            onPress={() => setShowColors(v => !v)}
                            activeOpacity={0.7}
                        />

                        <View style={st.sep} />

                        {/* Undo */}
                        <TouchableOpacity style={st.iconBtn} onPress={handleUndo} disabled={!history.length} activeOpacity={0.7}>
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <SvgPath d="M3 10H14C16.21 10 18 11.79 18 14s-1.79 4-4 4h-1"
                                    stroke={muted(!!history.length)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                <SvgPath d="M7 6L3 10l4 4"
                                    stroke={muted(!!history.length)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>

                        {/* Redo */}
                        <TouchableOpacity style={st.iconBtn} onPress={handleRedo} disabled={!redoStack.length} activeOpacity={0.7}>
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <SvgPath d="M21 10H10C7.79 10 6 11.79 6 14s1.79 4 4 4h1"
                                    stroke={muted(!!redoStack.length)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                <SvgPath d="M17 6l4 4-4 4"
                                    stroke={muted(!!redoStack.length)} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>

                        {/* Clear */}
                        <TouchableOpacity style={st.iconBtn} onPress={handleClear} activeOpacity={0.7}>
                            <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
                                <SvgPath
                                    d="M21 5.98C17.67 5.65 14.32 5.48 10.98 5.48 9 5.48 7.02 5.58 5.04 5.78L3 5.98M8.5 4.97l.22-1.31C8.88 2.71 9 2 10.69 2h2.62C15 2 15.13 2.75 15.28 3.67l.22 1.3M18.85 9.14l-.65 10.07C18.09 20.78 18 22 15.21 22H8.79C6 22 5.91 20.78 5.8 19.21L5.15 9.14"
                                    stroke="#D32F2F" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round"
                                />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    {/* Expanded color palette */}
                    {showColors && (
                        <View style={st.palette}>
                            {COLORS.map(c => (
                                <TouchableOpacity
                                    key={c}
                                    style={[st.paletteDot, { backgroundColor: c }, color === c && st.paletteDotActive]}
                                    onPress={() => { setColor(c); setShowColors(false); Haptics.selectionAsync(); }}
                                    activeOpacity={0.7}
                                />
                            ))}
                        </View>
                    )}
                </View>

                {/* ── Drawing canvas ─────────────────────────────── */}
                <View
                    ref={canvasRef}
                    style={[st.canvas, { height: CANVAS_H }]}
                    onStartShouldSetResponder={() => true}
                    onMoveShouldSetResponder={() => true}
                    onResponderGrant={handleTouchStart}
                    onResponderMove={handleTouchMove}
                    onResponderRelease={handleTouchEnd}
                    onResponderTerminationRequest={() => false}
                >
                    <Svg style={StyleSheet.absoluteFill}>
                        {strokes.map(s => {
                            const isPencil = s.width <= 3;
                            if (isPencil) {
                                // Multi-layer offset rendering for pencil grain texture
                                return PENCIL_LAYERS.map((layer, li) => (
                                    <SvgPath
                                        key={`${s.id}-${li}`}
                                        d={pointsToPath(s.points, layer.dx, layer.dy)}
                                        stroke={s.color}
                                        strokeWidth={layer.w}
                                        strokeOpacity={layer.op}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        fill="none"
                                    />
                                ));
                            }
                            return (
                                <SvgPath
                                    key={s.id}
                                    d={pointsToPath(s.points)}
                                    stroke={s.color}
                                    strokeWidth={s.width}
                                    strokeOpacity={s.opacity ?? 1}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            );
                        })}
                        {/* Live stroke while drawing */}
                        {currentStroke.length > 0 && (brushType === 'pencil' ? (
                            PENCIL_LAYERS.map((layer, li) => (
                                <SvgPath
                                    key={`live-${li}`}
                                    d={pointsToPath(currentStroke, layer.dx, layer.dy)}
                                    stroke={color}
                                    strokeWidth={layer.w}
                                    strokeOpacity={layer.op}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            ))
                        ) : (
                            <SvgPath
                                key="live"
                                d={pointsToPath(currentStroke)}
                                stroke={color}
                                strokeWidth={strokeWidth}
                                strokeOpacity={brushOpacity}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                fill="none"
                            />
                        ))}
                    </Svg>
                </View>

                {/* ── Stamp it + collection (below the fold) ────── */}
                <View style={st.belowFold}>
                    <TouchableOpacity
                        style={[st.stampBtn, saving && st.stampBtnDisabled]}
                        onPress={handleStamp}
                        disabled={saving}
                        activeOpacity={0.85}
                    >
                        <Text style={st.stampBtnTxt}>{saving ? 'stamping...' : 'stamp it'}</Text>
                    </TouchableOpacity>

                    {stamps.length > 0 && (
                        <View style={st.collection}>
                            <Text style={st.collectionTitle}>my stamps</Text>
                            <ScrollView
                                horizontal
                                showsHorizontalScrollIndicator={false}
                                contentContainerStyle={st.collectionRow}
                            >
                                {stamps.map(s => (
                                    <View key={s.id} style={st.thumbWrap}>
                                        <Image source={{ uri: s.uri }} style={st.thumbImg} resizeMode="cover" />
                                        <Text style={st.thumbDate}>{s.date}</Text>
                                    </View>
                                ))}
                            </ScrollView>
                        </View>
                    )}
                </View>

            </ScrollView>

            <XPToast
                xpAmount={xpToast?.amount ?? 0}
                label={xpToast?.label}
                visible={!!xpToast}
                onDismiss={() => setXpToast(null)}
            />
        </View>
    );
};

const st = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: BLACK,
    },
    scroll: {
        paddingHorizontal: 16,
        paddingTop: 6,
        alignItems: 'center',
        gap: 14,
    },

    // ── Toolbar card ────────────────────────────────
    toolCard: {
        width:             '100%',
        backgroundColor:   WHITE,
        borderRadius:      20,
        borderWidth:       2,
        borderColor:       BLACK,
        paddingHorizontal: 14,
        paddingVertical:   10,
        gap:               8,
    },
    toolRow: {
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'space-between',
    },

    // Brush icon buttons
    brushBtn: {
        width:          38,
        height:         38,
        alignItems:     'center',
        justifyContent: 'center',
        borderRadius:   10,
    },
    brushActive: {
        backgroundColor: YELLOW,
    },

    sep: {
        width:  1,
        height: 20,
        backgroundColor: BLACK + '15',
        marginHorizontal: 2,
    },

    // Active color dot
    activeDot: {
        width:        30,
        height:       30,
        borderRadius: 15,
        borderWidth:  2,
        borderColor:  BLACK,
    },

    // Icon buttons (undo/redo/clear)
    iconBtn: {
        width:          38,
        height:         38,
        alignItems:     'center',
        justifyContent: 'center',
        borderRadius:   8,
    },

    // Expanded palette
    palette: {
        flexDirection:  'row',
        gap:            10,
        paddingTop:     4,
        paddingBottom:  2,
        paddingHorizontal: 2,
        flexWrap:       'wrap',
    },
    paletteDot: {
        width:        30,
        height:       30,
        borderRadius: 15,
    },
    paletteDotActive: {
        borderWidth: 3,
        borderColor: BLACK,
    },

    // ── Canvas ──────────────────────────────────────
    canvas: {
        width:           CANVAS_W,
        backgroundColor: WHITE,
        borderRadius:    20,
        borderWidth:     2.5,
        borderColor:     BLACK,
        overflow:        'hidden',
    },

    // ── Below fold ──────────────────────────────────
    belowFold: {
        width:     '100%',
        marginTop: 24,
        gap:       20,
    },
    stampBtn: {
        width:           '100%',
        backgroundColor: YELLOW,
        borderRadius:    16,
        paddingVertical: 18,
        alignItems:      'center',
        borderWidth:     2,
        borderColor:     BLACK,
    },
    stampBtnDisabled: { opacity: 0.5 },
    stampBtnTxt: {
        fontFamily: 'MontserratAlternates-Bold',
        fontSize:   17,
        color:      BLACK,
    },

    // ── Collection ────────────────────────────────
    collection: {
        gap: 10,
    },
    collectionTitle: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize:   18,
        color:      WHITE,
    },
    collectionRow: {
        gap:          12,
        paddingRight: 8,
    },
    thumbWrap: {
        gap:        5,
        alignItems: 'center',
    },
    thumbImg: {
        width:        90,
        height:       66,
        borderRadius: 8,
        borderWidth:  1.5,
        borderColor:  WHITE + '30',
    },
    thumbDate: {
        fontFamily: 'OpenSans-SemiBold',
        fontSize:   10,
        color:      WHITE + '70',
    },
});

export default CanvasScreen;
