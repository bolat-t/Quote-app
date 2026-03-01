import React, { useRef, useState, useCallback } from 'react';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Text,
    Alert,
    Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path as SvgPath } from 'react-native-svg';
import { Stroke, Point } from '../types';
import { generateId } from '../utils/dateHelpers';
import { saveDrawings, getDrawings } from '../utils/storage';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const BLACK = '#000000';
const WHITE = '#FFFFFF';

export const DrawScreen: React.FC = () => {
    const [strokes, setStrokes] = useState<Stroke[]>([]);
    const [currentStroke, setCurrentStroke] = useState<Point[]>([]);
    const [undoStack, setUndoStack] = useState<Stroke[][]>([]);
    const [redoStack, setRedoStack] = useState<Stroke[][]>([]);

    const strokeColor = BLACK;
    const strokeWidth = 2.5;

    const handleTouchStart = useCallback((event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentStroke([{ x: locationX, y: locationY }]);
    }, []);

    const handleTouchMove = useCallback((event: any) => {
        const { locationX, locationY } = event.nativeEvent;
        setCurrentStroke(prev => [...prev, { x: locationX, y: locationY }]);
    }, []);

    const handleTouchEnd = useCallback(() => {
        if (currentStroke.length > 0) {
            const newStroke: Stroke = {
                id: generateId(),
                points: currentStroke,
                color: strokeColor,
                width: strokeWidth,
            };

            setUndoStack(prev => [...prev, strokes]);
            setRedoStack([]);
            setStrokes(prev => [...prev, newStroke]);
        }
        setCurrentStroke([]);
    }, [currentStroke, strokes, strokeColor]);

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

    const handleUndo = useCallback(() => {
        if (undoStack.length > 0) {
            const previousStrokes = undoStack[undoStack.length - 1];
            setRedoStack(prev => [...prev, strokes]);
            setStrokes(previousStrokes);
            setUndoStack(prev => prev.slice(0, -1));
        }
    }, [undoStack, strokes]);

    const handleRedo = useCallback(() => {
        if (redoStack.length > 0) {
            const nextStrokes = redoStack[redoStack.length - 1];
            setUndoStack(prev => [...prev, strokes]);
            setStrokes(nextStrokes);
            setRedoStack(prev => prev.slice(0, -1));
        }
    }, [redoStack, strokes]);

    const handleClear = useCallback(() => {
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
                        },
                    },
                ]
            );
        }
    }, [strokes]);

    const handleSave = useCallback(async () => {
        if (strokes.length === 0) {
            Alert.alert('Nothing to Save', 'Draw something first!');
            return;
        }

        try {
            const existingDrawings = await getDrawings();
            await saveDrawings([...existingDrawings, {
                id: generateId(),
                strokes: strokes,
                createdAt: Date.now(),
            }]);
            Alert.alert('Saved!', 'Your drawing has been saved.');
        } catch (error) {
            Alert.alert('Error', 'Failed to save drawing.');
        }
    }, [strokes]);

    return (
        <SafeAreaView
            style={styles.container}
            edges={['top']}
        >
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>ulbo.</Text>
                <View style={styles.headerRight}>
                    <TouchableOpacity
                        style={styles.iconButton}
                        onPress={handleUndo}
                        disabled={undoStack.length === 0}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.iconText, { opacity: undoStack.length === 0 ? 0.3 : 1 }]}>
                            ↩
                        </Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Canvas */}
            <View
                style={styles.canvas}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                <Svg width={screenWidth} height={screenHeight * 0.7} style={styles.svg}>
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
            </View>

            {/* Toolbar */}
            <View style={styles.toolbar}>
                <TouchableOpacity
                    style={styles.toolButton}
                    onPress={handleClear}
                    disabled={strokes.length === 0}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.toolButtonText, { opacity: strokes.length === 0 ? 0.3 : 1 }]}>
                        Clear
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.toolButton}
                    onPress={handleRedo}
                    disabled={redoStack.length === 0}
                    activeOpacity={0.7}
                >
                    <Text style={[styles.toolButtonText, { opacity: redoStack.length === 0 ? 0.3 : 1 }]}>
                        Redo
                    </Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.toolButton, styles.saveButton]}
                    onPress={handleSave}
                    activeOpacity={0.7}
                >
                    <Text style={styles.saveButtonText}>Save</Text>
                </TouchableOpacity>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: WHITE,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '400',
        letterSpacing: 1,
        color: BLACK,
        fontFamily: 'GasoekOne',
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconButton: {
        padding: 8,
    },
    iconText: {
        fontSize: 20,
        color: BLACK,
    },
    canvas: {
        flex: 1,
        backgroundColor: WHITE,
    },
    svg: {
        flex: 1,
    },
    toolbar: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        paddingBottom: 32,
        backgroundColor: '#F0F0F0',
        borderTopWidth: 2,
        borderTopColor: BLACK,
    },
    toolButton: {
        paddingHorizontal: 20,
        paddingVertical: 12,
    },
    toolButtonText: {
        fontSize: 14,
        fontWeight: '500',
        color: BLACK,
    },
    saveButton: {
        borderRadius: 20,
        backgroundColor: '#FFE600',
        borderWidth: 2,
        borderColor: BLACK,
    },
    saveButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: BLACK,
    },
});
