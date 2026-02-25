import React from 'react';
import { View, Text, StyleSheet, Dimensions, Animated, PanResponder, PanResponderGestureState } from 'react-native';
import Svg, { Path as SvgPath, Defs, Pattern, Path, Rect, Circle } from 'react-native-svg';
import { Stroke, Point, Quote } from '../types';
import { TextBoxData } from './DraggableTextBox';
import { DraggableTextBox } from './DraggableTextBox';
import { Mascot } from './Mascot';
import { MascotMood } from '../hooks/useMascotState';
import { useTheme } from '../context/ThemeContext';
import { PAPER_TYPES } from '../data/progressionConfig';

interface PaperCanvasProps {
    viewRef: React.RefObject<View | null>;
    strokes: Stroke[];
    currentStroke: Point[];
    strokeColor: string;
    strokeWidth: number;
    quote: Quote;
    textBoxes: TextBoxData[];
    isDrawing: boolean;
    isAnyTextEditing: boolean;
    mascotMoodOverride: MascotMood | undefined;
    isAfk: boolean;
    onCanvasLayout: (event: any) => void;
    onTouchStart: (event: any) => void;
    onTouchMove: (event: any) => void;
    onTouchEnd: () => void;
    onBoxUpdate: (id: string, updates: Partial<TextBoxData>) => void;
    onTextChange: (id: string, text: string) => void;
    onDeleteTextBox: (id: string) => void;
    onDragStart: () => void;
    onDrag: (x: number, y: number) => void;
    onDragEnd: (id: string, x: number, y: number) => void;
    onEditing: (isEditing: boolean) => void;
    activePaper: string; // ID of the paper from PAPER_TYPES
}

const pointsToPath = (points: Point[]): string => {
    if (points.length === 0) return '';
    if (points.length === 1) {
        return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    }
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
        path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
};

// Draggable Wrapper for Mascot
const DraggableMascotWrapper: React.FC<{ style?: any; children: React.ReactNode; enabled: boolean }> = ({ style, children, enabled }) => {
    const pan = React.useRef(new Animated.ValueXY()).current;

    const panResponder = React.useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => enabled,
            // Allow child presses (speech bubble) if movement is small
            onMoveShouldSetPanResponder: (_, gestureState: PanResponderGestureState) => {
                if (!enabled) return false;
                const { dx, dy } = gestureState;
                return Math.abs(dx) > 5 || Math.abs(dy) > 5;
            },
            onPanResponderGrant: () => {
                pan.setOffset({
                    x: (pan.x as any)._value,
                    y: (pan.y as any)._value
                });
                pan.setValue({ x: 0, y: 0 });
            },
            onPanResponderMove: Animated.event(
                [null, { dx: pan.x, dy: pan.y }],
                { useNativeDriver: false }
            ),
            onPanResponderRelease: () => {
                pan.flattenOffset();
            }
        })
    ).current;

    return (
        <Animated.View
            style={[style, { transform: pan.getTranslateTransform() }]}
            {...panResponder.panHandlers}
            pointerEvents={enabled ? 'auto' : 'none'}
        >
            {children}
        </Animated.View>
    );
};

export const PaperCanvas: React.FC<PaperCanvasProps> = ({
    viewRef,
    strokes,
    currentStroke,
    strokeColor,
    strokeWidth,
    quote,
    textBoxes,
    isDrawing,
    isAnyTextEditing,
    mascotMoodOverride,
    isAfk,
    onCanvasLayout,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onBoxUpdate,
    onTextChange,
    onDeleteTextBox,
    onDragStart,
    onDrag,
    onDragEnd,
    onEditing,
    activePaper,
}) => {
    const { theme, isDark } = useTheme();
    const colors = theme.colors;

    // Determine paper style
    const paperConfig = (PAPER_TYPES[activePaper as keyof typeof PAPER_TYPES] || PAPER_TYPES.plain) as any;
    const canvasBg = paperConfig.color || (isDark ? '#1A1D23' : '#F8FAFC');
    const textColor = paperConfig.textColor || colors.text;

    const renderPattern = () => {
        if (paperConfig.type !== 'pattern') return null;

        const patternColor = paperConfig.id === 'starry' ? '#FFF' : (isDark ? '#FFFFFF10' : '#00000008');

        switch (paperConfig.pattern) {
            case 'grid':
                return (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            <Pattern id="grid" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
                                <Path d="M 40 0 L 0 0 0 40" fill="none" stroke={patternColor} strokeWidth="1" />
                            </Pattern>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#grid)" />
                    </Svg>
                );
            case 'dots':
                return (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            <Pattern id="dots" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                                <Circle cx="2" cy="2" r="1.5" fill={patternColor} />
                            </Pattern>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#dots)" />
                    </Svg>
                );
            case 'lines':
                return (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        <Defs>
                            <Pattern id="lines" x="0" y="0" width="10" height="40" patternUnits="userSpaceOnUse">
                                <Path d="M 0 40 L 100 40" fill="none" stroke={patternColor} strokeWidth="1" />
                            </Pattern>
                        </Defs>
                        <Rect width="100%" height="100%" fill="url(#lines)" />
                    </Svg>
                );
            case 'stars':
                // Simple static star field for now
                const stars = Array.from({ length: 50 }).map((_, i) => ({
                    cx: Math.random() * 100 + '%',
                    cy: Math.random() * 100 + '%',
                    r: Math.random() * 1.5 + 0.5,
                    opacity: Math.random() * 0.8 + 0.2
                }));
                return (
                    <Svg style={StyleSheet.absoluteFill} pointerEvents="none">
                        {stars.map((star, i) => (
                            <Circle key={i} cx={star.cx} cy={star.cy} r={star.r} fill="#FFF" fillOpacity={star.opacity} />
                        ))}
                    </Svg>
                );
            default:
                return null;
        }
    };

    return (
        <View style={styles.mainContainer}>
            <View
                ref={viewRef}
                onLayout={onCanvasLayout}
                style={[styles.paperSheet, { backgroundColor: canvasBg, borderColor: colors.primary + '10' }]}
                pointerEvents={isAnyTextEditing ? 'box-none' : 'auto'}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
            >
                {/* Background Pattern */}
                {renderPattern()}

                {/* Canvas Container */}
                <View style={styles.canvasContainer}>
                    <View style={styles.canvasArea}>
                        <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
                            {strokes.map(stroke => (
                                <SvgPath
                                    key={stroke.id}
                                    d={pointsToPath(stroke.points)}
                                    stroke={stroke.color}
                                    strokeWidth={stroke.width}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            ))}
                            {currentStroke.length > 0 && (
                                <SvgPath
                                    d={pointsToPath(currentStroke)}
                                    stroke={strokeColor}
                                    strokeWidth={strokeWidth}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    fill="none"
                                />
                            )}
                        </Svg>

                        {/* Empty State */}
                        {strokes.length === 0 && textBoxes.length === 0 && !isDrawing && (
                            <View style={styles.emptyState}>
                                <Svg width={32} height={32} viewBox="0 0 24 24" fill="none">
                                    <SvgPath
                                        d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"
                                        stroke={textColor + '15'}
                                        strokeWidth={1.5}
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                </Svg>
                                <Text style={[styles.emptyStateText, { color: textColor + '40' }]}>
                                    express yourself
                                </Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Quote Section */}
                <View style={styles.quoteSection} pointerEvents="none">
                    {/* Quote icon */}
                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" style={{ marginBottom: 12, opacity: 0.25 }}>
                        <SvgPath
                            d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"
                            fill={colors.primary + '40'}
                        />
                        <SvgPath
                            d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 5.25"
                            fill={colors.primary + '40'}
                        />
                    </Svg>
                    <Text style={[styles.quoteText, { color: textColor }]}>
                        {quote.text}
                    </Text>
                    {/* Decorative line */}
                    <View style={[styles.quoteLine, { backgroundColor: colors.primary + '20' }]} />
                </View>

                {/* Mascot */}
                <DraggableMascotWrapper
                    style={{ position: 'absolute', bottom: 120, right: 8, zIndex: 15 }}
                    enabled={!isDrawing}
                >
                    <Mascot
                        size={130}
                        isDrawing={isDrawing}
                        moodOverride={mascotMoodOverride || (isAfk ? 'sad' : undefined)}
                    />
                </DraggableMascotWrapper>

                {/* Draggable Text Boxes */}
                <View style={StyleSheet.absoluteFill} pointerEvents={isDrawing ? 'none' : 'box-none'}>
                    {textBoxes.map(box => (
                        <DraggableTextBox
                            key={box.id}
                            data={box}
                            onUpdate={onBoxUpdate}
                            onTextChange={onTextChange}
                            onDelete={onDeleteTextBox}
                            onDragStart={onDragStart}
                            onDrag={onDrag}
                            onDragEnd={onDragEnd}
                            onEditing={onEditing}
                        />
                    ))}
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    mainContainer: {
        flex: 1,
        paddingHorizontal: 8,
        paddingBottom: 8,
        zIndex: 1,
    },
    paperSheet: {
        flex: 1,
        borderRadius: 28,
        borderWidth: 1,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.06,
        shadowRadius: 24,
        elevation: 4,
    },
    quoteSection: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        paddingVertical: 40,
        paddingHorizontal: 48,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
    },
    quoteText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 22,
        lineHeight: 30,
        textAlign: 'center',
        opacity: 0.7,
    },
    quoteLine: {
        width: 40,
        height: 2,
        borderRadius: 1,
        marginTop: 16,
    },
    canvasContainer: {
        ...StyleSheet.absoluteFillObject,
        zIndex: 10,
    },
    canvasArea: {
        flex: 1,
    },
    emptyState: {
        ...StyleSheet.absoluteFillObject,
        alignItems: 'center',
        justifyContent: 'center',
        pointerEvents: 'none',
    },
    emptyStateText: {
        fontFamily: 'Caveat',
        fontSize: 14,
        marginTop: 8,
    },
});
