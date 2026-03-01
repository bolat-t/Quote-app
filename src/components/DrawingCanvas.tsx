import React, { useState, useCallback, useRef } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    PanResponder,
    Alert,
} from 'react-native';
import Svg, { Path, G } from 'react-native-svg';
import { Stroke, Point } from '../types';

const BLACK = '#000000';
const WHITE = '#FFFFFF';
import { generateId } from '../utils/dateHelpers';

interface DrawingCanvasProps {
    onStrokesChange?: (strokes: Stroke[]) => void;
}

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CANVAS_HEIGHT = screenHeight * 0.75;

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onStrokesChange }) => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
    const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

    const strokeColor = BLACK;
    const strokeWidth = 2.5;

    const canvasRef = useRef<View>(null);
    const canvasOffset = useRef({ x: 0, y: 0 });

    // Measure canvas position on layout
    const onLayout = useCallback(() => {
        canvasRef.current?.measure((x, y, width, height, pageX, pageY) => {
            canvasOffset.current = { x: pageX, y: pageY };
        });
    }, []);

    const getPoint = (gestureState: { moveX: number; moveY: number }): Point => {
        return {
            x: gestureState.moveX - canvasOffset.current.x,
            y: gestureState.moveY - canvasOffset.current.y,
        };
    };

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,

            onPanResponderGrant: (evt, gestureState) => {
                const point = getPoint({ moveX: evt.nativeEvent.pageX, moveY: evt.nativeEvent.pageY });
                setCurrentStroke([point]);
            },

            onPanResponderMove: (evt, gestureState) => {
                const point = getPoint(gestureState);
                setCurrentStroke(prev => [...prev, point]);
            },

            onPanResponderRelease: () => {
                if (currentStroke.length > 0) {
                    const newStroke: Stroke = {
                        id: generateId(),
                        points: currentStroke,
                        color: strokeColor,
                        width: strokeWidth,
                    };

                    setUndoStack(prev => [...prev, strokes]);
                    setRedoStack([]);

                    const newStrokes = [...strokes, newStroke];
                    setStrokes(newStrokes);
                    onStrokesChange?.(newStrokes);
                }
                setCurrentStroke([]);
            },
        })
    ).current;

    const pointsToPath = (points: Point[]): string => {
        if (points.length === 0) return '';
        if (points.length === 1) {
            return `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
        }

        let path = `M ${points[0].x} ${points[0].y}`;

        for (let i = 1; i < points.length; i++) {
            const p0 = points[i - 1];
            const p1 = points[i];

            // Simple line to for now - can be enhanced with bezier curves
            path += ` L ${p1.x} ${p1.y}`;
        }

        return path;
    };

    const undo = useCallback(() => {
        if (undoStack.length > 0) {
            const previousStrokes = undoStack[undoStack.length - 1];
            setRedoStack(prev => [...prev, strokes]);
            setStrokes(previousStrokes);
            setUndoStack(prev => prev.slice(0, -1));
            onStrokesChange?.(previousStrokes);
        }
    }, [undoStack, strokes, onStrokesChange]);

    const redo = useCallback(() => {
        if (redoStack.length > 0) {
            const nextStrokes = redoStack[redoStack.length - 1];
            setUndoStack(prev => [...prev, strokes]);
            setStrokes(nextStrokes);
            setRedoStack(prev => prev.slice(0, -1));
            onStrokesChange?.(nextStrokes);
        }
    }, [redoStack, strokes, onStrokesChange]);

    const clear = useCallback(() => {
        if (strokes.length > 0) {
            Alert.alert(
                'Clear Canvas',
                'Are you sure you want to clear your drawing?',
                [
                    { text: 'Cancel', style: 'cancel' },
                    {
                        text: 'Clear',
                        style: 'destructive',
                        onPress: () => {
                            setUndoStack(prev => [...prev, strokes]);
                            setRedoStack([]);
                            setStrokes([]);
                            onStrokesChange?.([]);
                        },
                    },
                ]
            );
        }
    }, [strokes, onStrokesChange]);

    const getStrokes = useCallback(() => strokes, [strokes]);

    // Expose methods via ref-like pattern
    React.useEffect(() => {
        (DrawingCanvas as any).undo = undo;
        (DrawingCanvas as any).redo = redo;
        (DrawingCanvas as any).clear = clear;
        (DrawingCanvas as any).getStrokes = getStrokes;
        (DrawingCanvas as any).canUndo = undoStack.length > 0;
        (DrawingCanvas as any).canRedo = redoStack.length > 0;
    }, [undo, redo, clear, getStrokes, undoStack.length, redoStack.length]);

    return (
        <View
            ref={canvasRef}
            style={[styles.canvas, { backgroundColor: WHITE }]}
            onLayout={onLayout}
            {...panResponder.panHandlers}
        >
            <Svg width={screenWidth} height={CANVAS_HEIGHT} style={styles.svg}>
                <G>
                    {/* Render completed strokes */}
                    {strokes.map((stroke) => (
                        <Path
                            key={stroke.id}
                            d={pointsToPath(stroke.points)}
                            stroke={stroke.color}
                            strokeWidth={stroke.width}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    ))}

                    {/* Render current stroke being drawn */}
                    {currentStroke.length > 0 && (
                        <Path
                            d={pointsToPath(currentStroke)}
                            stroke={strokeColor}
                            strokeWidth={strokeWidth}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            fill="none"
                        />
                    )}
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    canvas: {
        flex: 1,
        width: screenWidth,
    },
    svg: {
        flex: 1,
    },
});
