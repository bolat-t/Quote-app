import React, { useRef, useState, useEffect } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    Text,
    TextInput,
    Image,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Keyboard,
} from 'react-native';
const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export interface TextBoxData {
    id: string;
    text: string;
    x: number;
    y: number;
    rotation?: number;
    scale?: number;
    isReflection?: boolean;
    autoEdit?: boolean; // Auto-open edit mode when created
}

interface DraggableTextBoxProps {
    data: TextBoxData;
    onUpdate: (id: string, updates: Partial<TextBoxData>) => void;
    onTextChange: (id: string, text: string) => void;
    onDelete: (id: string) => void;
    onDragStart?: () => void;
    onDrag?: (x: number, y: number) => void;
    onDragEnd?: (id: string, x: number, y: number) => void; // Update dragEnd to pass final pos
    onEditing?: (isEditing: boolean) => void;
}

const getDistance = (p1: { pageX: number; pageY: number }, p2: { pageX: number; pageY: number }) => {
    return Math.sqrt(Math.pow(p2.pageX - p1.pageX, 2) + Math.pow(p2.pageY - p1.pageY, 2));
};

const getAngle = (p1: { pageX: number; pageY: number }, p2: { pageX: number; pageY: number }) => {
    return Math.atan2(p2.pageY - p1.pageY, p2.pageX - p1.pageX) * 180 / Math.PI;
};

export const DraggableTextBox: React.FC<DraggableTextBoxProps> = ({
    data,
    onUpdate,
    onTextChange,
    onDelete,
    onDragStart,
    onDrag,
    onDragEnd,
    onEditing,
}) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editText, setEditText] = useState(data.text);
    const [isDragging, setIsDragging] = useState(false);
    const [isTransforming, setIsTransforming] = useState(false); // Renamed from isRotating

    const inputRef = useRef<TextInput>(null);

    const startPos = useRef({ x: 0, y: 0 });
    const startTouch = useRef({ x: 0, y: 0 });
    const startAngle = useRef(0);
    const startRotation = useRef(0);
    const startDistance = useRef(0);
    const startScale = useRef(1);

    useEffect(() => {
        if (!isEditing) {
            setEditText(data.text);
        }
    }, [data.text, isEditing]);

    useEffect(() => {
        onEditing?.(isEditing);
    }, [isEditing, onEditing]);

    // Auto-open edit mode for new text boxes
    useEffect(() => {
        if (data.autoEdit && !isEditing) {
            setIsEditing(true);
            setEditText('');
            onEditing?.(true);
        }
    }, [data.autoEdit]);

    const handleTouchStart = (e: any) => {
        e.stopPropagation();
        const { touches } = e.nativeEvent;

        if (touches.length === 2) {
            // Start Transformation (Rotate + Scale)
            setIsTransforming(true);
            setIsDragging(false);

            startAngle.current = getAngle(touches[0], touches[1]);
            startRotation.current = data.rotation || 0;

            startDistance.current = getDistance(touches[0], touches[1]);
            startScale.current = data.scale || 1;

            onDragStart?.();
        } else {
            // Start Drag
            const touch = touches[0];
            startTouch.current = { x: touch.pageX, y: touch.pageY };
            startPos.current = { x: data.x, y: data.y };
            setIsDragging(false); // Pending move
            onDragStart?.();
        }
    };

    const handleTouchMove = (e: any) => {
        e.stopPropagation();
        const { touches } = e.nativeEvent;

        if (touches.length === 2) {
            // Transformation Logic (Rotate + Scale)
            const currentAngle = getAngle(touches[0], touches[1]);
            const angleDelta = currentAngle - startAngle.current;
            const newRotation = (startRotation.current + angleDelta);

            const currentDistance = getDistance(touches[0], touches[1]);
            const scaleFactor = currentDistance / (startDistance.current || 1); // Avoid div by 0
            const newScale = Math.max(0.5, Math.min((startScale.current * scaleFactor), 5)); // Clamp scale

            onUpdate(data.id, {
                rotation: newRotation,
                scale: newScale
            });
        } else if (touches.length === 1 && !isTransforming) {
            // Drag Logic
            const touch = touches[0];
            const dx = touch.pageX - startTouch.current.x;
            const dy = touch.pageY - startTouch.current.y;

            if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
                if (!isDragging) {
                    setIsDragging(true);
                }

                const newX = startPos.current.x + dx;
                const newY = startPos.current.y + dy;

                // Relaxed clamping - allow movement across full screen
                // Prevent going too far left (min 0) or right (leave 80px margin for box)
                // Top starts at 80 (below header), bottom leaves 100px margin for footer
                const clampedX = Math.max(0, Math.min(newX, screenWidth - 80));
                const clampedY = Math.max(80, Math.min(newY, screenHeight - 100));

                onUpdate(data.id, { x: clampedX, y: clampedY });
                onDrag?.(touch.pageX, touch.pageY); // Pass global touch coords for bin detection
            }
        }
    };

    const handleTouchEnd = (e: any) => {
        e.stopPropagation();

        if (isDragging || isTransforming) {
            onDragEnd?.(data.id, data.x, data.y);
        }

        // Tap to edit (only if not dragging/transforming, and not an image)
        const isImageBox = data.text.startsWith('__IMAGE__');
        if (!isDragging && !isTransforming && !isEditing && !isImageBox) {
            setIsEditing(true);
            if (data.text === 'Tap to edit') {
                setEditText('');
            } else {
                setEditText(data.text);
            }
            setTimeout(() => inputRef.current?.focus(), 50);
        }

        setIsDragging(false);
        setIsTransforming(false);
    };

    const handleEndEditing = () => {
        setIsEditing(false);
        Keyboard.dismiss();
        onTextChange(data.id, editText.trim());
    };

    if (!data.text.trim() && !isEditing) return null;

    const isImage = data.text.startsWith('__IMAGE__');
    const imageUri = isImage ? data.text.replace('__IMAGE__', '') : null;

    const isReflection = data.isReflection;
    const rotation = data.rotation || 0;
    const scale = data.scale || 1;

    if (isEditing) {
        return (
            <View
                onTouchStart={(e) => e.stopPropagation()}
                hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
                style={[
                    styles.container,
                    isReflection && styles.reflectionContainer,
                    {
                        left: data.x,
                        top: data.y,
                        transform: [
                            { rotate: `${rotation}deg` },
                            { scale: scale }
                        ],
                        backgroundColor: isReflection ? WHITE : 'transparent',
                        borderColor: isReflection ? BLACK : 'transparent',
                        borderWidth: isReflection ? 2 : 0,
                        padding: 12,
                        alignItems: 'flex-start',
                        minWidth: 50,
                    },
                ]}
            >
                <TouchableOpacity
                    style={styles.deleteButton}
                    onPress={() => onDelete(data.id)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <Text style={[styles.deleteText, { color: BLACK }]}>✕</Text>
                </TouchableOpacity>

                {isReflection && (
                    <Text style={[styles.label, { color: BLACK + '70' }]}>
                        My reflection
                    </Text>
                )}

                <TextInput
                    ref={inputRef}
                    style={[
                        styles.editInput,
                        { color: BLACK },
                        !isReflection && styles.plainInput
                    ]}
                    value={editText}
                    onChangeText={setEditText}
                    onBlur={handleEndEditing}
                    multiline
                    autoFocus
                    returnKeyType="done"
                    blurOnSubmit
                    placeholder="Type here..."
                    placeholderTextColor={BLACK + '40'}
                />

                <View style={styles.actionRow}>
                    <TouchableOpacity
                        style={styles.doneButton}
                        onPress={handleEndEditing}
                    >
                        <Text style={styles.doneText}>Done</Text>
                    </TouchableOpacity>
                </View>
            </View>
        );
    }

    return (
        <View
            style={[
                styles.container,
                isReflection && styles.reflectionContainer,
                {
                    left: data.x,
                    top: data.y,
                    transform: [
                        { rotate: `${rotation}deg` },
                        { scale: scale }
                    ],
                    backgroundColor: isReflection ? WHITE : 'transparent',
                    borderColor: isReflection ? BLACK : 'transparent',
                    borderWidth: isReflection ? 1 : 0,
                },
            ]}
            hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
            {isImage && imageUri ? (
                <Image
                    source={{ uri: imageUri }}
                    style={styles.canvasImage}
                    resizeMode="cover"
                />
            ) : (
                <>
                    {isReflection && (
                        <Text style={[styles.label, { color: BLACK + '70' }]}>
                            My reflection
                        </Text>
                    )}
                    <Text
                        style={[
                            isReflection ? styles.reflectionText : styles.plainText,
                            { color: BLACK }
                        ]}
                    >
                        {data.text}
                    </Text>
                    {!isReflection && data.text === 'Tap to edit' && (
                        <Text style={[styles.hint, { color: BLACK + '70' }]}>
                            tap to edit
                        </Text>
                    )}
                </>
            )}
        </View>
    );
};

export const generateTextBoxId = (): string => {
    return `textbox_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        maxWidth: screenWidth * 0.8,
        zIndex: 100,
        padding: 8,
    },
    reflectionContainer: {
        borderRadius: 2, // Less rounded, more like a scrap of paper
        padding: 12,
        // No shadow/background for reflection, just text on paper? 
        // Or subtle highlight.
        // Let's keep it simple for now, maybe just underline or something.
        // Actually, user design says "Paper Sheet".
        // Reflections are just text written ON the paper.
        // So maybe transparency is better.
        backgroundColor: 'rgba(255,255,255,0.0)',
    },
    label: {
        fontSize: 10,
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
        marginBottom: 6,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        opacity: 0.6,
    },
    reflectionText: {
        fontSize: 20,
        lineHeight: 26,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic', // Handwriting
    },
    plainText: {
        fontSize: 18,
        lineHeight: 24,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic', // "Typed" look
        textShadowColor: 'rgba(0, 0, 0, 0.1)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    editInput: {
        fontSize: 20,
        lineHeight: 26,
        padding: 0,
        minHeight: 30,
        borderWidth: 0,
        minWidth: 40,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        textAlignVertical: 'top',
    },
    plainInput: {
        fontSize: 18,
        lineHeight: 24,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    doneButton: {
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
        marginTop: 4,
        backgroundColor: YELLOW,
        elevation: 2,
        shadowColor: BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    actionRow: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        alignItems: 'center',
        width: 'auto',
        alignSelf: 'flex-end',
    },
    deleteButton: {
        position: 'absolute',
        top: -8,
        right: -8,
        width: 24,
        height: 24,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
        backgroundColor: 'rgba(200,0,0,0.1)',
        borderRadius: 12,
    },
    deleteText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: 'red',
    },
    doneText: {
        fontSize: 12,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontWeight: 'bold',
        color: BLACK,
    },
    hint: {
        fontSize: 12,
        marginTop: 4,
        opacity: 0.6,
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
    },
    canvasImage: {
        width: 140,
        height: 140,
        borderRadius: 12,
    },
});
