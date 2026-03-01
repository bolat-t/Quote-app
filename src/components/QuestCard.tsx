import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    LayoutAnimation,
    Platform,
    UIManager,
} from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import Svg, { Path, Circle } from 'react-native-svg';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';
const GREY   = '#F0F0F0';

export type QuestStatus = 'todo' | 'in-progress' | 'done';

interface QuestCardProps {
    title: string;
    subtitle?: string;
    /** Custom SVG icon render prop */
    renderIcon: (color: string, size: number) => React.ReactNode;
    status: QuestStatus;
    index: number;
    children: React.ReactNode;
    /** Cards are expanded by default */
    defaultExpanded?: boolean;
}

// ─── Custom SVG Icons ───

/** Magnifying glass / search icon */
export const SearchIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="11" cy="11" r="7" stroke={color} strokeWidth={2} />
        <Path d="M16.5 16.5L21 21" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
);

/** Pen / writing icon */
export const PenIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M17 3a2.83 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/** Thought bubble icon */
export const ThoughtIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10z" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/** Checkmark icon */
export const CheckIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M20 6L9 17l-5-5" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/** Chevron down icon */
export const ChevronDownIcon = ({ color, size = 18 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M6 9l6 6 6-6" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

/** Plus circle icon */
export const PlusCircleIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Circle cx="12" cy="12" r="10" stroke={color} strokeWidth={2} />
        <Path d="M12 8v8M8 12h8" stroke={color} strokeWidth={2} strokeLinecap="round" />
    </Svg>
);

/** Sparkle / star icon */
export const SparkleIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <Path d="M12 2l2.09 6.26L21 9.27l-5 4.87L17.18 21 12 17.77 6.82 21 8 14.14l-5-4.87 6.91-1.01L12 2z" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" fill={color + '20'} />
    </Svg>
);

// ─── Main Component ───

export const QuestCard: React.FC<QuestCardProps> = ({
    title,
    subtitle,
    renderIcon,
    status,
    index,
    children,
    defaultExpanded = true,
}) => {
    const [expanded, setExpanded] = useState(defaultExpanded);
    const isDone = status === 'done';

    const toggleExpand = useCallback(() => {
        LayoutAnimation.configureNext(
            LayoutAnimation.create(
                250,
                LayoutAnimation.Types.easeInEaseOut,
                LayoutAnimation.Properties.opacity,
            )
        );
        setExpanded(prev => !prev);
    }, []);

    return (
        <Animated.View
            entering={FadeInDown.delay(index * 120 + 300).duration(500).springify().damping(18)}
        >
            <View style={[styles.card, isDone && styles.cardDone]}>
                {/* ── Tappable Header ── */}
                <TouchableOpacity
                    activeOpacity={0.6}
                    onPress={toggleExpand}
                    style={styles.header}
                >
                    {/* Icon */}
                    <View style={[styles.iconWrap, isDone && styles.iconWrapDone]}>
                        {isDone
                            ? <CheckIcon color={BLACK} size={20} />
                            : renderIcon(BLACK + '88', 20)
                        }
                    </View>

                    {/* Title */}
                    <View style={styles.titleBlock}>
                        <Text style={styles.title}>{title}</Text>
                        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
                    </View>

                    {/* Chevron */}
                    <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
                        <ChevronDownIcon color={BLACK + '55'} size={18} />
                    </View>
                </TouchableOpacity>

                {/* ── Content ── */}
                {expanded && (
                    <Animated.View entering={FadeIn.duration(200)} style={styles.body}>
                        {children}
                    </Animated.View>
                )}
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    card: {
        borderRadius: 20,
        marginHorizontal: 20,
        marginBottom: 16,
        backgroundColor: WHITE,
        borderWidth: 2.5,
        borderColor: BLACK,
        overflow: 'hidden',
    },
    cardDone: {
        backgroundColor: YELLOW,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 18,
        paddingVertical: 16,
    },
    iconWrap: {
        width: 42,
        height: 42,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 14,
        backgroundColor: GREY,
    },
    iconWrapDone: {
        backgroundColor: WHITE,
    },
    titleBlock: {
        flex: 1,
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 23,
        lineHeight: 27,
        color: BLACK,
    },
    subtitle: {
        fontFamily: 'Carlito',
        fontSize: 13,
        marginTop: 1,
        lineHeight: 18,
        color: BLACK + '77',
    },
    body: {
        paddingHorizontal: 18,
        paddingBottom: 20,
        paddingTop: 4,
    },
});
