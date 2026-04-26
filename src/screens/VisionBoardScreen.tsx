import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { BLACK, WHITE, YELLOW } from '../constants/colors';
import {
    View,
    StyleSheet,
    TouchableOpacity,
    Image,
    Dimensions,
    Platform,
    Alert,
    ActivityIndicator,
    ScrollView,
    TextInput as RNTextInput,
    FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useSharedValue, useAnimatedStyle, useAnimatedProps, runOnJS,
    FadeIn, FadeInDown, SlideInDown, SlideOutDown,
    withTiming, withSpring, Easing,
} from 'react-native-reanimated';
import type { SharedValue } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { captureRef } from 'react-native-view-shot';
import Svg, { Path as SvgPath, Circle as SvgCircle, Rect as SvgRect } from 'react-native-svg';
import {
    Text,
    Portal,
} from 'react-native-paper';
import { addVisionItem, deleteVisionItem, fetchVisionItems, updateVisionItemPosition, updateVisionItemStyle, VisionItem } from '../utils/visionBoardStorage';
import { useHeaderHeight } from '../context/HeaderHeightContext';
import { searchPhotos, UnsplashPhoto } from '../utils/unsplashApi';
import { getThemeForDate } from '../data/visionThemes';
import {
    getInspirationCategories,
    createInspirationCategory,
    updateInspirationCategory,
    deleteInspirationCategory,
    makeInspirationImage,
    InspirationCategory,
    InspirationImage,
} from '../utils/inspirationStorage';

const AnimatedPath = Animated.createAnimatedComponent(SvgPath);

type SyncStatus = 'synced' | 'uploading' | 'error';
type LocalVisionItem = VisionItem & { syncStatus?: SyncStatus };

const { width, height } = Dimensions.get('window');

// ═══════════════════════════════════════════════════════════
// Custom SVG Icons — Clean, rounded, theme-matching
// ═══════════════════════════════════════════════════════════

const ChevronLeftIcon = ({ color, size = 24 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <SvgPath d="M15 18l-6-6 6-6" />
    </Svg>
);

const ImagePlusIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgRect x="3" y="3" width="18" height="18" rx="4" />
        <SvgCircle cx="8.5" cy="8.5" r="1.5" />
        <SvgPath d="M21 15l-5-5L5 21" />
        <SvgPath d="M14 3v4M12 5h4" />
    </Svg>
);

const TextPlusIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgPath d="M4 7V4h16v3" />
        <SvgPath d="M12 4v16" />
        <SvgPath d="M8 20h8" />
        <SvgPath d="M19 14v6M16 17h6" />
    </Svg>
);

const TrashIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgPath d="M3 6h18" />
        <SvgPath d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
        <SvgPath d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
        <SvgPath d="M10 11v6M14 11v6" />
    </Svg>
);

const SparklesIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgPath d="M12 3l1.912 5.813a2 2 0 001.275 1.275L21 12l-5.813 1.912a2 2 0 00-1.275 1.275L12 21l-1.912-5.813a2 2 0 00-1.275-1.275L3 12l5.813-1.912a2 2 0 001.275-1.275L12 3z" />
    </Svg>
);

const CompassIcon = ({ color, size = 56 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.2} strokeLinecap="round" strokeLinejoin="round">
        <SvgCircle cx="12" cy="12" r="10" />
        <SvgPath d="M16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" />
    </Svg>
);

const HeartIcon = ({ color, size = 16 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <SvgPath d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
    </Svg>
);

const XIcon = ({ color, size = 20 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <SvgPath d="M18 6L6 18M6 6l12 12" />
    </Svg>
);

const ShareIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgCircle cx="18" cy="5" r="3" />
        <SvgCircle cx="6" cy="12" r="3" />
        <SvgCircle cx="18" cy="19" r="3" />
        <SvgPath d="M8.59 13.51l6.83 3.98M15.41 6.51l-6.82 3.98" />
    </Svg>
);

const LayoutIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgRect x="3" y="3" width="7" height="7" rx="1" />
        <SvgRect x="14" y="3" width="7" height="7" rx="1" />
        <SvgRect x="3" y="14" width="7" height="7" rx="1" />
        <SvgRect x="14" y="14" width="7" height="7" rx="1" />
    </Svg>
);

const SearchImageIcon = ({ color, size = 22 }: { color: string; size?: number }) => (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
        <SvgCircle cx="11" cy="11" r="8" />
        <SvgPath d="M21 21l-4.35-4.35" />
        <SvgPath d="M11 8v6M8 11h6" />
    </Svg>
);

// ═══════════════════════════════════════════════════════════
// Affirmation Templates
// ═══════════════════════════════════════════════════════════

const AFFIRMATION_TEMPLATES = [
    "I am worthy of love and joy",
    "I attract abundance effortlessly",
    "I am becoming my best self",
    "My dreams are within reach",
    "I choose peace over worry",
    "I am grateful for this moment",
    "I radiate confidence and grace",
    "Every day I grow stronger",
    "I deserve all good things",
    "I trust the journey ahead",
];

// ═══════════════════════════════════════════════════════════
// Text Styling Options
// ═══════════════════════════════════════════════════════════

const FONT_OPTIONS = [
    { label: 'Impact', value: 'GasoekOne' },
    { label: 'Script', value: 'Caveat-Bold' },
    { label: 'Playful', value: 'IndieFlower-Regular' },
    { label: 'Clean', value: 'Carlito' },
];

const TEXT_COLORS = [
    '#FFFFFF', '#F5ECD7', '#1C1C1E',
    '#C9748A', '#7BA05B', '#8B7CB8', '#E8A87C', '#5B8FB9',
];

const BG_STYLES = [
    { label: 'None', value: 'none', preview: 'transparent' },
    { label: 'Light', value: 'white', preview: '#FFFFFF' },
    { label: 'Warm', value: 'cream', preview: '#F5ECD7' },
    { label: 'Dark', value: 'dark', preview: '#1C1C1E' },
    { label: 'Glass', value: 'glass', preview: 'rgba(255,255,255,0.18)' },
];

const getTextBg = (bgStyle?: string) => {
    switch (bgStyle) {
        case 'none':
            return { backgroundColor: 'transparent', borderColor: 'transparent', borderWidth: 0, shadowOpacity: 0, elevation: 0 };
        case 'cream':
            return { backgroundColor: 'rgba(245,236,215,0.97)', borderColor: 'rgba(200,169,126,0.3)', borderWidth: 1 };
        case 'dark':
            return { backgroundColor: 'rgba(28,28,30,0.94)', borderColor: 'rgba(255,255,255,0.08)', borderWidth: 1 };
        case 'glass':
            return { backgroundColor: 'rgba(255,255,255,0.15)', borderColor: 'rgba(255,255,255,0.35)', borderWidth: 1 };
        default: // 'white' or undefined
            return {
                backgroundColor: WHITE + 'EC',
                borderColor: BLACK + '12',
                borderWidth: 1,
            };
    }
};

// ═══════════════════════════════════════════════════════════
// Board Background Presets
// ═══════════════════════════════════════════════════════════

type BoardBgPreset = {
    id: string;
    label: string;
    type: 'solid' | 'gradient' | 'default';
    color?: string;
    colors?: readonly [string, string, ...string[]];
    start?: { x: number; y: number };
    end?: { x: number; y: number };
    preview: string; // single colour used for the chip preview swatch
};

const BOARD_BG_PRESETS: BoardBgPreset[] = [
    { id: 'default', label: 'Auto', type: 'default', preview: 'transparent' },
    { id: 'cream', label: 'Cream', type: 'solid', color: '#FDF6EC', preview: '#FDF6EC' },
    { id: 'blush', label: 'Blush', type: 'solid', color: '#FAE4E4', preview: '#FAE4E4' },
    { id: 'sage', label: 'Sage', type: 'solid', color: '#E5EFE5', preview: '#E5EFE5' },
    { id: 'sky', label: 'Sky', type: 'solid', color: '#E3EDF7', preview: '#E3EDF7' },
    { id: 'night', label: 'Night', type: 'solid', color: '#0F0F1E', preview: '#0F0F1E' },
    { id: 'sunrise', label: 'Sunrise', type: 'gradient', colors: ['#FFE4B5', '#FFB6C1'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, preview: '#FFCDA0' },
    { id: 'cosmos', label: 'Cosmos', type: 'gradient', colors: ['#667eea', '#764ba2'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, preview: '#7166D0' },
    { id: 'forest', label: 'Forest', type: 'gradient', colors: ['#d4fc79', '#96e6a1'], start: { x: 0, y: 0 }, end: { x: 1, y: 1 }, preview: '#B5F18D' },
];

// ═══════════════════════════════════════════════════════════
// Layout Presets
// ═══════════════════════════════════════════════════════════

type LayoutPreset = {
    name: string;
    icon: string;
    arrange: (count: number, boardW: number, boardH: number) => { x: number; y: number; rotation: number; scale: number }[];
};

const ITEM_SIZE = 160;
const PAD = 12; // padding from board edges

const LAYOUT_PRESETS: LayoutPreset[] = [
    {
        name: 'Grid',
        icon: '▦',
        arrange: (count, boardW, boardH) => {
            // Limit cols so items are never wider than the board
            const maxCols = Math.max(1, Math.floor((boardW - PAD * 2 + PAD) / (ITEM_SIZE + PAD)));
            const cols = Math.min(Math.ceil(Math.sqrt(count)), maxCols);
            const rows = Math.ceil(count / cols);
            const cellW = (boardW - PAD * 2) / cols;
            const cellH = Math.min((boardH - PAD * 2) / rows, ITEM_SIZE + PAD);
            return Array.from({ length: count }, (_, i) => ({
                x: Math.min((i % cols) * cellW + PAD, boardW - ITEM_SIZE - PAD),
                y: Math.min(Math.floor(i / cols) * cellH + PAD, boardH - ITEM_SIZE - PAD),
                rotation: 0,
                scale: 1,
            }));
        },
    },
    {
        name: 'Scattered',
        icon: '✦',
        arrange: (count, boardW, boardH) =>
            Array.from({ length: count }, () => ({
                x: Math.random() * (boardW - ITEM_SIZE - PAD * 2) + PAD,
                y: Math.random() * (boardH - ITEM_SIZE - PAD * 2) + PAD,
                rotation: (Math.random() - 0.5) * 20,
                scale: 0.85 + Math.random() * 0.3,
            })),
    },
    {
        name: 'Column',
        icon: '☰',
        arrange: (count, boardW, boardH) => {
            const spacing = Math.min((boardH - PAD * 2) / count, ITEM_SIZE + PAD);
            const startX = Math.round((boardW - ITEM_SIZE) / 2);
            return Array.from({ length: count }, (_, i) => ({
                x: startX,
                y: Math.min(i * spacing + PAD, boardH - ITEM_SIZE - PAD),
                rotation: 0,
                scale: 1,
            }));
        },
    },
    {
        name: 'Mosaic',
        icon: '◆',
        arrange: (count, boardW, boardH) => {
            const cols = 2;
            const colW = (boardW - PAD * 3) / cols;
            const jitter = 8;
            return Array.from({ length: count }, (_, i) => {
                const col = i % cols;
                const row = Math.floor(i / cols);
                const isWide = i % 3 === 0;
                const rawX = col * (colW + PAD) + PAD + (Math.random() - 0.5) * jitter;
                const rawY = row * (ITEM_SIZE + PAD) + PAD + (Math.random() - 0.5) * jitter;
                return {
                    x: Math.max(PAD, Math.min(rawX, boardW - ITEM_SIZE - PAD)),
                    y: Math.max(PAD, Math.min(rawY, boardH - ITEM_SIZE - PAD)),
                    rotation: (Math.random() - 0.5) * 8,
                    scale: isWide ? 1.0 : 0.9,
                };
            });
        },
    },
];

// ═══════════════════════════════════════════════════════════
// Image Browser — Categories & tile size
// ═══════════════════════════════════════════════════════════

type Subcategory = { label: string; query: string; thumb: string };
type BrowseCategory = { label: string; thumb: string; subcategories: Subcategory[] };

const BROWSE_CATEGORIES: BrowseCategory[] = [
    {
        label: 'Nature',
        thumb: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=600&q=80',
        subcategories: [
            { label: 'Mountains', query: 'mountains', thumb: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=400&q=80' },
            { label: 'Forests', query: 'forest', thumb: 'https://images.unsplash.com/photo-1448375240586-882707db888b?w=400&q=80' },
            { label: 'Ocean', query: 'ocean', thumb: 'https://images.unsplash.com/photo-1505118380757-91f5f5632de0?w=400&q=80' },
            { label: 'Rivers', query: 'river', thumb: 'https://images.unsplash.com/photo-1470770903676-69b98201ea1c?w=400&q=80' },
            { label: 'Desert', query: 'desert', thumb: 'https://images.unsplash.com/photo-1509316785289-025f5b846b35?w=400&q=80' },
            { label: 'Wildflowers', query: 'wildflowers', thumb: 'https://images.unsplash.com/photo-1490750967868-88df5691cc9b?w=400&q=80' },
        ],
    },
    {
        label: 'Travel',
        thumb: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80',
        subcategories: [
            { label: 'Cities', query: 'city skyline', thumb: 'https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?w=400&q=80' },
            { label: 'Architecture', query: 'modern architecture', thumb: 'https://images.unsplash.com/photo-1487958449943-2429e8be8625?w=400&q=80' },
            { label: 'Beaches', query: 'tropical beach', thumb: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=400&q=80' },
            { label: 'Asia', query: 'asia', thumb: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&q=80' },
            { label: 'Europe', query: 'europe', thumb: 'https://images.unsplash.com/photo-1499856871958-5b9627545d1a?w=400&q=80' },
            { label: 'Landscapes', query: 'travel landscape', thumb: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=400&q=80' },
        ],
    },
    {
        label: 'Wellness',
        thumb: 'https://images.unsplash.com/photo-1545205597-3d9d02c29597?w=600&q=80',
        subcategories: [
            { label: 'Yoga', query: 'yoga pose', thumb: 'https://images.unsplash.com/photo-1544367567-0f2fcb009e0b?w=400&q=80' },
            { label: 'Meditation', query: 'meditation', thumb: 'https://images.unsplash.com/photo-1506126613408-eca07ce68773?w=400&q=80' },
            { label: 'Spa', query: 'spa relaxation', thumb: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=400&q=80' },
            { label: 'Nutrition', query: 'healthy food', thumb: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=400&q=80' },
            { label: 'Fitness', query: 'fitness training', thumb: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=400&q=80' },
            { label: 'Relationships', query: 'happy couple', thumb: 'https://images.unsplash.com/photo-1516589178581-6cd7833ae3b2?w=400&q=80' },
        ],
    },
    {
        label: 'Goals',
        thumb: 'https://images.unsplash.com/photo-1484480974693-6ca0a78fb36b?w=600&q=80',
        subcategories: [
            { label: 'Career', query: 'office work', thumb: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80' },
            { label: 'Finance', query: 'money wealth', thumb: 'https://images.unsplash.com/photo-1559526324-4b87b5e36e44?w=400&q=80' },
            { label: 'Education', query: 'study books', thumb: 'https://images.unsplash.com/photo-1481627834876-b7833e8f5570?w=400&q=80' },
            { label: 'Creativity', query: 'art studio', thumb: 'https://images.unsplash.com/photo-1541701494587-cb58502866ab?w=400&q=80' },
            { label: 'Entrepreneur', query: 'startup team', thumb: 'https://images.unsplash.com/photo-1519389950473-47ba0277781c?w=400&q=80' },
            { label: 'Mindset', query: 'motivation success', thumb: 'https://images.unsplash.com/photo-1532012197267-da84d127e765?w=400&q=80' },
        ],
    },
    {
        label: 'Luxury',
        thumb: 'https://images.unsplash.com/photo-1540202404-a2f29016b523?w=600&q=80',
        subcategories: [
            { label: 'Villas', query: 'luxury villa', thumb: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=400&q=80' },
            { label: 'Yachts', query: 'luxury yacht', thumb: 'https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=400&q=80' },
            { label: 'Hotels', query: 'luxury hotel', thumb: 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?w=400&q=80' },
            { label: 'Cars', query: 'sports car', thumb: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=400&q=80' },
            { label: 'Jewelry', query: 'diamond jewelry', thumb: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=400&q=80' },
            { label: 'Fine Dining', query: 'fine dining', thumb: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&q=80' },
        ],
    },
    {
        label: 'Home',
        thumb: 'https://images.unsplash.com/photo-1600210492493-0946911123ea?w=600&q=80',
        subcategories: [
            { label: 'House', query: 'modern house', thumb: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80' },
            { label: 'Living Room', query: 'living room', thumb: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=400&q=80' },
            { label: 'Bedroom', query: 'cozy bedroom', thumb: 'https://images.unsplash.com/photo-1540518614846-7eded433c457?w=400&q=80' },
            { label: 'Kitchen', query: 'modern kitchen', thumb: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&q=80' },
            { label: 'Garden', query: 'garden plants', thumb: 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=400&q=80' },
            { label: 'Home Office', query: 'home office', thumb: 'https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&q=80' },
        ],
    },
    {
        label: 'Fashion',
        thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=600&q=80',
        subcategories: [
            { label: 'Editorial', query: 'fashion editorial', thumb: 'https://images.unsplash.com/photo-1509631179647-0177331693ae?w=400&q=80' },
            { label: 'Street Style', query: 'street fashion', thumb: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?w=400&q=80' },
            { label: 'Accessories', query: 'fashion accessories', thumb: 'https://images.unsplash.com/photo-1548036328-c9fa89d128fa?w=400&q=80' },
            { label: 'Minimalist', query: 'minimal fashion', thumb: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=400&q=80' },
            { label: 'Beauty', query: 'beauty portrait', thumb: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=400&q=80' },
            { label: 'Couture', query: 'haute couture', thumb: 'https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=400&q=80' },
        ],
    },
    {
        label: 'Aesthetic',
        thumb: 'https://images.unsplash.com/photo-1519681393784-d120267933ba?w=600&q=80',
        subcategories: [
            { label: 'Minimal', query: 'minimal aesthetic', thumb: 'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=400&q=80' },
            { label: 'Pastel', query: 'pastel aesthetic', thumb: 'https://images.unsplash.com/photo-1492724441997-5dc865305da7?w=400&q=80' },
            { label: 'Vintage', query: 'vintage aesthetic', thumb: 'https://images.unsplash.com/photo-1481277542470-605612bd2d61?w=400&q=80' },
            { label: 'Dark', query: 'dark aesthetic', thumb: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?w=400&q=80' },
            { label: 'Soft Light', query: 'soft light', thumb: 'https://images.unsplash.com/photo-1504198453319-5ce911bafcde?w=400&q=80' },
            { label: 'Desk Setup', query: 'desk setup', thumb: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?w=400&q=80' },
        ],
    }
];

// Tile width for 3-column grid with 3px gutters
const TILE_SIZE = Math.floor((width - 3 * 4) / 3);

// ═══════════════════════════════════════════════════════════
// Draggable Item Component
// ═══════════════════════════════════════════════════════════

const DraggableItem = ({
    item,
    onUpdate,
    onDelete,
    onRetry,
    onEditStyle,
    onDragStart,
    onDragEnd,
    isOverDeleteZone,
    layoutVersion,
    boardSize,
}: {
    item: LocalVisionItem;
    onUpdate: (id: string, x: number, y: number, s: number, r: number) => void;
    onDelete: (id: string, instant?: boolean) => void;
    onRetry?: (item: LocalVisionItem) => void;
    onEditStyle?: (id: string) => void;
    onDragStart: () => void;
    onDragEnd: () => void;
    isOverDeleteZone: SharedValue<boolean>;
    layoutVersion: number;
    boardSize: SharedValue<{ width: number; height: number }>;
}) => {
    const x = useSharedValue(item.position_x);
    const y = useSharedValue(item.position_y);
    const scale = useSharedValue(item.scale);
    const rotation = useSharedValue(item.rotation);

    // Animate to new positions when a layout preset is applied
    React.useEffect(() => {
        if (layoutVersion === 0) return;
        x.value = withSpring(item.position_x, { damping: 18, stiffness: 120 });
        y.value = withSpring(item.position_y, { damping: 18, stiffness: 120 });
        scale.value = withSpring(item.scale, { damping: 18, stiffness: 120 });
        rotation.value = withSpring(item.rotation, { damping: 18, stiffness: 120 });
    }, [layoutVersion]);
    const isDragging = useSharedValue(false);
    const context = useSharedValue({ x: 0, y: 0 });

    const pan = Gesture.Pan()
        .onStart(() => {
            isDragging.value = true;
            context.value = { x: x.value, y: y.value };
            runOnJS(onDragStart)();
        })
        .onUpdate((e) => {
            x.value = context.value.x + e.translationX;
            y.value = context.value.y + e.translationY;

            // Hit-test in BOARD-LOCAL coords using AABB overlap so the item's
            // ACTUAL visible footprint (after scale) is what matters — not just
            // its center. The delete zone is rendered inside the board at
            // `bottom: 40` and centered horizontally.
            const boardW = boardSize.value.width;
            const boardH = boardSize.value.height;
            if (boardW > 0 && boardH > 0) {
                const itemCX = x.value + ITEM_SIZE / 2;
                const itemCY = y.value + ITEM_SIZE / 2;
                const itemHalfW = (ITEM_SIZE * scale.value) / 2;
                const itemHalfH = (ITEM_SIZE * scale.value) / 2;

                const binCX     = boardW / 2;
                const binCY     = boardH - 65;
                const binHalfW  = 90;  // bin half-width  (with a small margin)
                const binHalfH  = 45;  // bin half-height (with a small margin)

                const isOver =
                    Math.abs(itemCX - binCX) < (itemHalfW + binHalfW) &&
                    Math.abs(itemCY - binCY) < (itemHalfH + binHalfH);

                if (isOver !== isOverDeleteZone.value) {
                    isOverDeleteZone.value = isOver;
                    if (isOver) {
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                    }
                }
            }
        })
        .onFinalize(() => {
            isDragging.value = false;
            runOnJS(onDragEnd)();

            if (isOverDeleteZone.value) {
                runOnJS(onDelete)(item.id, true);
                isOverDeleteZone.value = false;
            } else {
                runOnJS(onUpdate)(item.id, x.value, y.value, scale.value, rotation.value);
            }
        });

    const pinch = Gesture.Pinch()
        .onChange((e) => { scale.value *= e.scaleChange; })
        .onFinalize(() => {
            runOnJS(onUpdate)(item.id, x.value, y.value, scale.value, rotation.value);
        });

    const rotateGesture = Gesture.Rotation()
        .onChange((e) => { rotation.value += e.rotationChange * (180 / Math.PI); })
        .onFinalize(() => {
            runOnJS(onUpdate)(item.id, x.value, y.value, scale.value, rotation.value);
        });

    const composed = Gesture.Simultaneous(pan, pinch, rotateGesture);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        position: 'absolute' as const,
        zIndex: isDragging.value ? 100 : 1,
        shadowOpacity: withTiming(isDragging.value ? 0.14 : 0.06, { duration: 180 }),
    }));

    const [imgError, setImgError] = React.useState(false);
    const [signedUrl, setSignedUrl] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (imgError && item.type === 'image' && item.content?.includes('journal-images')) {
            const path = item.content.split('/object/public/journal-images/')[1];
            if (path) {
                import('../lib/supabase').then(({ supabase }) => {
                    supabase.storage.from('journal-images').createSignedUrl(path, 3600).then(({ data }) => {
                        if (data?.signedUrl) setSignedUrl(data.signedUrl);
                    });
                });
            }
        }
    }, [imgError, item.content]);

    const imageUri = signedUrl || item.content;

    return (
        <GestureDetector gesture={composed}>
            <Animated.View
                style={[styles.itemContainer, animatedStyle]}
            >
                <TouchableOpacity
                    onLongPress={() => onDelete(item.id)}
                    onPress={() => {
                        if (item.syncStatus === 'error' && onRetry) {
                            onRetry(item);
                        } else if (item.type === 'text' && onEditStyle) {
                            onEditStyle(item.id);
                        }
                    }}
                    delayLongPress={500}
                    activeOpacity={0.9}
                >
                    {item.type === 'image' ? (
                        <View style={[
                            styles.imageWrapper,
                            {
                                borderColor: item.syncStatus === 'error'
                                    ? '#D32F2F'
                                    : BLACK + '18',
                                shadowColor: BLACK,
                            }
                        ]}>
                            <Image
                                source={{ uri: imageUri }}
                                style={[styles.imageItem, { opacity: item.syncStatus === 'uploading' ? 0.6 : 1 }]}
                                resizeMode="cover"
                                onError={() => { if (!imgError) setImgError(true); }}
                            />
                            {item.syncStatus === 'error' && (
                                <View style={[styles.imageItem, styles.imageOverlay]}>
                                    <Text style={styles.overlayText}>Tap to Retry</Text>
                                </View>
                            )}
                            {item.syncStatus === 'uploading' && (
                                <View style={[styles.imageItem, styles.imageOverlay, { backgroundColor: 'rgba(0,0,0,0.2)' }]}>
                                    <ActivityIndicator size="small" color="#FFF" />
                                </View>
                            )}
                            {imgError && !signedUrl && item.syncStatus !== 'uploading' && (
                                <View style={[styles.imageItem, styles.imageOverlay, { backgroundColor: '#F0F0F0' + 'CC' }]}>
                                    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                                        <SvgRect x="3" y="3" width="18" height="18" rx="4" />
                                        <SvgPath d="M3 9l4 4 4-4 6 6" />
                                        <SvgCircle cx="8.5" cy="7.5" r="1" />
                                    </Svg>
                                    <Text style={{ fontSize: 11, color: BLACK, fontFamily: 'Inter-Bold', marginTop: 4 }}>Image unavailable</Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <View style={[
                            styles.textItem,
                            getTextBg(item.bg_style),
                        ]}>
                            <Text style={[
                                styles.textItemContent,
                                {
                                    color: item.text_color ?? BLACK,
                                    fontFamily: item.font_family ?? 'GasoekOne',
                                },
                            ]}>
                                {item.content}
                            </Text>
                        </View>
                    )}
                </TouchableOpacity>
            </Animated.View>
        </GestureDetector>
    );
};

// ═══════════════════════════════════════════════════════════
// Empty State — Compass illustration + suggestions
// ═══════════════════════════════════════════════════════════

const DailyEmptyState = ({
    dateStr,
    onAddImage,
    onAddText,
    onBrowseStock,
}: {
    dateStr: string;
    onAddImage: () => void;
    onAddText: () => void;
    onBrowseStock: () => void;
}) => {
    const theme = getThemeForDate(dateStr);
    return (
        <Animated.View style={styles.emptyContainer} entering={FadeIn.duration(600)}>
            {/* Decorative orbs */}
            <View style={[styles.emptyOrb, styles.emptyOrb1, { backgroundColor: YELLOW + '15' }]} />
            <View style={[styles.emptyOrb, styles.emptyOrb2, { backgroundColor: YELLOW + '25' }]} />

            <Animated.View entering={FadeInDown.delay(200).springify().damping(14)}>
                <SparklesIcon color={BLACK + '40'} size={64} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).springify()} style={{ alignItems: 'center', paddingHorizontal: 24 }}>
                <Text style={[styles.emptyTitle, { color: BLACK + 'AA', fontSize: 16 }]}>
                    This Week's Theme
                </Text>
                <Text style={[styles.emptySubtitle, { color: BLACK, fontFamily: 'Inter-Bold', fontSize: 24, marginTop: 8, textAlign: 'center' }]}>
                    {theme.title}
                </Text>
                <Text style={[styles.emptySubtitle, { color: BLACK + '80', marginTop: 12, textAlign: 'center', lineHeight: 22 }]}>
                    {theme.description}
                </Text>
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(480).springify()} style={{ width: '100%', paddingHorizontal: 36, marginTop: 32 }}>
                <TouchableOpacity
                    style={[styles.emptyBrowseBtn, { backgroundColor: BLACK, shadowColor: BLACK }]}
                    onPress={onBrowseStock}
                    activeOpacity={0.8}
                >
                    <SearchImageIcon color={YELLOW} size={20} />
                    <Text style={[styles.emptyBrowseBtnText, { color: YELLOW, marginLeft: 8 }]}>Browse Photos</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Secondary actions */}
            <Animated.View entering={FadeInDown.delay(560).springify()} style={styles.emptyActions}>
                <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: BLACK + '0A', borderWidth: 0 }]}
                    onPress={onAddImage}
                    activeOpacity={0.7}
                >
                    <ImagePlusIcon color={BLACK} size={17} />
                    <Text style={[styles.emptyActionText, { color: BLACK, marginLeft: 6 }]}>From Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: BLACK + '0A', borderWidth: 0 }]}
                    onPress={onAddText}
                    activeOpacity={0.7}
                >
                    <TextPlusIcon color={BLACK} size={17} />
                    <Text style={[styles.emptyActionText, { color: BLACK, marginLeft: 6 }]}>Add Text</Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

const EmptyState = ({
    onAddImage,
    onAddText,
    onBrowseStock,
}: {
    onAddImage: () => void;
    onAddText: () => void;
    onBrowseStock: () => void;
}) => {
    return (
        <Animated.View style={styles.emptyContainer} entering={FadeIn.duration(600)}>
            {/* Decorative orbs — subtle, not competing */}
            <View style={[styles.emptyOrb, styles.emptyOrb1, { backgroundColor: YELLOW + '22' }]} />
            <View style={[styles.emptyOrb, styles.emptyOrb2, { backgroundColor: YELLOW + '18' }]} />

            {/* Icon — clearly visible on white */}
            <Animated.View
                entering={FadeInDown.delay(200).springify().damping(14)}
                style={styles.emptyIconWrap}
            >
                <CompassIcon color={BLACK} size={36} />
            </Animated.View>

            <Animated.View entering={FadeInDown.delay(350).springify()} style={{ alignItems: 'center', paddingHorizontal: 32 }}>
                <Text style={[styles.emptyTitle, { color: BLACK }]}>
                    This space is yours
                </Text>
                <Text style={[styles.emptySubtitle, { color: BLACK + 'AA', fontFamily: 'Inter-SemiBold', fontSize: 15, lineHeight: 22 }]}>
                    Pin images & affirmations that light up your future
                </Text>
            </Animated.View>

            {/* Primary CTA */}
            <Animated.View entering={FadeInDown.delay(480).springify()} style={{ width: '100%', paddingHorizontal: 36 }}>
                <TouchableOpacity
                    style={[styles.emptyBrowseBtn, { backgroundColor: YELLOW, shadowColor: BLACK }]}
                    onPress={onBrowseStock}
                    activeOpacity={0.8}
                >
                    <SearchImageIcon color={BLACK} size={20} />
                    {/* BLACK text on YELLOW — high contrast */}
                    <Text style={[styles.emptyBrowseBtnText, { color: BLACK }]}>Browse Photos</Text>
                </TouchableOpacity>
            </Animated.View>

            {/* Secondary actions — BLACK text on subtle gray, clearly readable */}
            <Animated.View entering={FadeInDown.delay(560).springify()} style={styles.emptyActions}>
                <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: BLACK + '08', borderColor: BLACK + '20' }]}
                    onPress={onAddImage}
                    activeOpacity={0.7}
                >
                    <ImagePlusIcon color={BLACK} size={17} />
                    <Text style={[styles.emptyActionText, { color: BLACK }]}>From Gallery</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.emptyActionBtn, { backgroundColor: BLACK + '08', borderColor: BLACK + '20' }]}
                    onPress={onAddText}
                    activeOpacity={0.7}
                >
                    <TextPlusIcon color={BLACK} size={17} />
                    <Text style={[styles.emptyActionText, { color: BLACK }]}>Add Affirmation</Text>
                </TouchableOpacity>
            </Animated.View>
        </Animated.View>
    );
};

// ═══════════════════════════════════════════════════════════
// Affirmation Bottom Sheet
// ═══════════════════════════════════════════════════════════

const AffirmationSheet = ({
    visible,
    onDismiss,
    onSubmit,
}: {
    visible: boolean;
    onDismiss: () => void;
    onSubmit: (text: string) => void;
}) => {
    const [textInput, setTextInput] = useState('');

    if (!visible) return null;

    const handleSubmit = () => {
        if (!textInput.trim()) return;
        onSubmit(textInput.trim());
        setTextInput('');
    };

    const handleTemplate = (t: string) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onSubmit(t);
        setTextInput('');
    };

    return (
        <Animated.View
            entering={SlideInDown.duration(350)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.sheetContainer, { backgroundColor: WHITE }]}
        >
            {/* Handle */}
            <View style={styles.sheetHandle}>
                <View style={[styles.sheetHandleBar, { backgroundColor: BLACK + '30' }]} />
            </View>

            {/* Header */}
            <View style={styles.sheetHeader}>
                <View>
                    <Text style={[styles.sheetTitle, { color: BLACK }]}>
                        Add Affirmation
                    </Text>
                    <Text style={[styles.sheetSubtitle, { color: BLACK }]}>
                        Choose one or write your own
                    </Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.sheetClose} activeOpacity={0.6}>
                    <XIcon color={BLACK} size={20} />
                </TouchableOpacity>
            </View>

            {/* Templates */}
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.templateScroll}
            >
                {AFFIRMATION_TEMPLATES.map((t, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.templateChip, { backgroundColor: YELLOW + '30', borderColor: BLACK + '15' }]}
                        onPress={() => handleTemplate(t)}
                        activeOpacity={0.7}
                    >
                        <SparklesIcon color={YELLOW} size={14} />
                        <Text style={[styles.templateText, { color: BLACK }]}>{t}</Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>

            {/* Custom input */}
            <View style={[styles.sheetInputRow, { borderColor: BLACK + '18' }]}>
                <RNTextInput
                    style={[styles.sheetInput, { color: BLACK }]}
                    placeholder="Write your own..."
                    placeholderTextColor={BLACK + '50'}
                    value={textInput}
                    onChangeText={setTextInput}
                    autoFocus={false}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                />
                <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={!textInput.trim()}
                    style={[
                        styles.sheetSendBtn,
                        { backgroundColor: textInput.trim() ? YELLOW : BLACK + '15' }
                    ]}
                    activeOpacity={0.7}
                >
                    <HeartIcon color={textInput.trim() ? '#FFF' : BLACK + '40'} size={16} />
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

// ═══════════════════════════════════════════════════════════
// Layout Sheet
// ═══════════════════════════════════════════════════════════

const LayoutSheet = ({
    visible,
    onDismiss,
    onSelect,
    onClearBoard,
    itemCount,
    activeBgId,
    onSetBg,
}: {
    visible: boolean;
    onDismiss: () => void;
    onSelect: (preset: LayoutPreset) => void;
    onClearBoard: () => void;
    itemCount: number;
    activeBgId: string;
    onSetBg: (preset: BoardBgPreset) => void;
}) => {
    if (!visible) return null;

    return (
        <Animated.View
            entering={SlideInDown.duration(350)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.sheetContainer, { backgroundColor: WHITE }]}
        >
            <View style={styles.sheetHandle}>
                <View style={[styles.sheetHandleBar, { backgroundColor: BLACK + '30' }]} />
            </View>

            <View style={styles.sheetHeader}>
                <View>
                    <Text style={[styles.sheetTitle, { color: BLACK }]}>
                        Auto-Layout
                    </Text>
                    <Text style={[styles.sheetSubtitle, { color: BLACK }]}>
                        Rearrange your vision board instantly
                    </Text>
                </View>
                <TouchableOpacity onPress={onDismiss} style={styles.sheetClose} activeOpacity={0.6}>
                    <XIcon color={BLACK} size={20} />
                </TouchableOpacity>
            </View>

            {/* ── Canvas Background ── */}
            <View style={styles.bgPickerRow}>
                <Text style={[styles.bgPickerLabel, { color: BLACK }]}>CANVAS BACKGROUND</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.bgPickerScroll}>
                    {BOARD_BG_PRESETS.map((bg) => {
                        const isActive = activeBgId === bg.id;
                        const isDefault = bg.id === 'default';
                        return (
                            <TouchableOpacity
                                key={bg.id}
                                style={[
                                    styles.boardBgChip,
                                    {
                                        backgroundColor: isDefault ? 'transparent' : bg.preview,
                                        borderColor: isActive ? YELLOW : BLACK + '28',
                                        borderWidth: isActive ? 2 : 1,
                                    },
                                ]}
                                onPress={() => {
                                    Haptics.selectionAsync();
                                    onSetBg(bg);
                                }}
                                activeOpacity={0.8}
                            >
                                {isDefault && (
                                    <Text style={{ fontSize: 16 }}>✦</Text>
                                )}
                                <Text style={[
                                    styles.boardBgChipLabel,
                                    { color: bg.id === 'night' ? 'rgba(255,255,255,0.7)' : BLACK },
                                ]}>
                                    {bg.label}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>
            </View>

            <View style={styles.layoutGrid}>
                {LAYOUT_PRESETS.map((p, i) => (
                    <TouchableOpacity
                        key={i}
                        style={[styles.layoutCard, { backgroundColor: YELLOW + '20', borderColor: BLACK + '15' }]}
                        onPress={() => {
                            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                            onSelect(p);
                        }}
                        activeOpacity={0.7}
                    >
                        <Text style={{ fontSize: 28 }}>{p.icon}</Text>
                        <Text style={[styles.layoutName, { color: BLACK }]}>{p.name}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <TouchableOpacity
                onPress={() => {
                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    onClearBoard();
                }}
                style={[styles.clearBoardBtn, {
                    backgroundColor: '#D32F2F' + '10',
                    borderColor: '#D32F2F' + '30',
                }]}
                activeOpacity={0.75}
            >
                <View style={[styles.clearBoardIconWrap, { backgroundColor: '#D32F2F' + '18' }]}>
                    <TrashIcon color='#D32F2F' size={17} />
                </View>
                <View style={{ flex: 1 }}>
                    <Text style={[styles.clearBoardText, { color: '#D32F2F' }]}>Clear Board</Text>
                    {itemCount > 0 && (
                        <Text style={[styles.clearBoardSub, { color: '#D32F2F' + '80' }]}>
                            Remove all {itemCount} item{itemCount !== 1 ? 's' : ''}
                        </Text>
                    )}
                </View>
                <Svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke={'#D32F2F' + '50'} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <SvgPath d="M9 18l6-6-6-6" />
                </Svg>
            </TouchableOpacity>
        </Animated.View>
    );
};

// ═══════════════════════════════════════════════════════════
// Text Style Sheet
// ═══════════════════════════════════════════════════════════

const TextStyleSheet = ({
    item,
    onDismiss,
    onStyleChange,
}: {
    item: LocalVisionItem;
    onDismiss: () => void;
    onStyleChange: (style: { text_color?: string; font_family?: string; bg_style?: string }) => void;
}) => {
    const activeFont = item.font_family ?? 'GasoekOne';
    const activeColor = item.text_color ?? BLACK;
    const activeBg = item.bg_style ?? 'white';

    return (
        <>
            {/* Backdrop */}
            <TouchableOpacity
                style={[styles.dialogOverlay, { backgroundColor: 'rgba(0,0,0,0.18)' }]}
                onPress={onDismiss}
                activeOpacity={1}
            />

            <Animated.View
                entering={SlideInDown.duration(260).easing(Easing.out(Easing.cubic))}
                exiting={SlideOutDown.duration(200).easing(Easing.in(Easing.cubic))}
                style={[styles.textStyleSheet, { backgroundColor: WHITE }]}
            >
                {/* Handle */}
                <View style={styles.sheetHandle}>
                    <View style={[styles.sheetHandleBar, { backgroundColor: BLACK + '30' }]} />
                </View>

                {/* Header */}
                <View style={styles.sheetHeader}>
                    <View>
                        <Text style={[styles.sheetTitle, { color: BLACK }]}>Style Text</Text>
                        <Text style={[styles.sheetSubtitle, { color: BLACK }]}>Font · Colour · Background</Text>
                    </View>
                    <TouchableOpacity onPress={onDismiss} style={styles.sheetClose} activeOpacity={0.6}>
                        <XIcon color={BLACK} size={20} />
                    </TouchableOpacity>
                </View>

                {/* ── Font row ── */}
                <View style={styles.textStyleSection}>
                    <View style={styles.textStyleRow}>
                        {FONT_OPTIONS.map((f) => {
                            const isActive = activeFont === f.value;
                            return (
                                <TouchableOpacity
                                    key={f.label}   // label is unique; value was shared before
                                    style={[
                                        styles.fontPill,
                                        {
                                            backgroundColor: isActive ? YELLOW : '#F0F0F0',
                                            borderColor: isActive ? BLACK : 'transparent',
                                            borderWidth: isActive ? 1.5 : 0,
                                        },
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onStyleChange({ font_family: f.value });
                                    }}
                                    activeOpacity={0.75}
                                >
                                    <Text style={{
                                        fontFamily: f.value,
                                        fontSize: 14,
                                        color: BLACK,   // always black for readability
                                    }}>
                                        {f.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>

                {/* ── Colour row ── */}
                <View style={styles.textStyleSection}>
                    <View style={[styles.textStyleRow, { justifyContent: 'space-between' }]}>
                        {TEXT_COLORS.map((c) => {
                            const isActive = activeColor === c || (!item.text_color && c === BLACK);
                            const isWhite = c === '#FFFFFF';
                            return (
                                <TouchableOpacity
                                    key={c}
                                    style={[
                                        styles.colorSwatch,
                                        { backgroundColor: c },
                                        isWhite && { borderWidth: 1, borderColor: BLACK + '40' },
                                        isActive && {
                                            borderWidth: 2.5,
                                            borderColor: YELLOW,
                                            transform: [{ scale: 1.15 }],
                                        },
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onStyleChange({ text_color: c });
                                    }}
                                    activeOpacity={0.8}
                                />
                            );
                        })}
                    </View>
                </View>

                {/* ── Background row ── */}
                <View style={[styles.textStyleSection, { marginBottom: 8 }]}>
                    <View style={[styles.textStyleRow, { justifyContent: 'space-between' }]}>
                        {BG_STYLES.map((bg) => {
                            const isActive = activeBg === bg.value;
                            const isNone = bg.value === 'none';
                            return (
                                <TouchableOpacity
                                    key={bg.value}
                                    style={[
                                        styles.bgChip,
                                        {
                                            backgroundColor: isNone ? 'transparent' : bg.preview,
                                            borderColor: isActive
                                                ? YELLOW
                                                : bg.value === 'glass'
                                                    ? 'rgba(180,180,180,0.4)'
                                                    : BLACK + '28',
                                            borderWidth: isActive ? 2 : 1.5,
                                        },
                                    ]}
                                    onPress={() => {
                                        Haptics.selectionAsync();
                                        onStyleChange({ bg_style: bg.value });
                                    }}
                                    activeOpacity={0.8}
                                >
                                    {isNone && (
                                        <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={BLACK} strokeWidth={1.5} strokeLinecap="round">
                                            <SvgPath d="M3 3l18 18" />
                                        </Svg>
                                    )}
                                    <Text style={[styles.bgChipLabel, {
                                        color: bg.value === 'dark'
                                            ? 'rgba(255,255,255,0.7)'
                                            : bg.value === 'glass' || bg.value === 'none'
                                                ? BLACK
                                                : 'rgba(0,0,0,0.45)',
                                    }]}>
                                        {bg.label}
                                    </Text>
                                </TouchableOpacity>
                            );
                        })}
                    </View>
                </View>
            </Animated.View>
        </>
    );
};

// ═══════════════════════════════════════════════════════════
// Stock Image Sheet
// ═══════════════════════════════════════════════════════════

// Tile width for 2-column category card grid
const CAT_CARD_W = Math.floor((width - 3 * 8) / 2);
const CAT_CARD_H = Math.round(CAT_CARD_W * 0.72);

export const StockImageSheet = ({
    visible,
    onDismiss,
    onSelect,
    themeCategory,
}: {
    visible: boolean;
    onDismiss: () => void;
    onSelect: (url: string) => void;
    /** If set, replaces all categories with theme-specific keyword cards */
    themeCategory?: { label: string; subcategories: { label: string; query: string }[] };
}) => {
    // ── 4 views: categories → subcategories → photos | search ──
    const [view, setView] = useState<'categories' | 'subcategories' | 'photos' | 'search'>('categories');
    const [selectedCatIdx, setSelectedCatIdx] = useState<number>(0);
    const [selectedSubIdx, setSelectedSubIdx] = useState<number>(0);
    const [activeSubLabel, setActiveSubLabel] = useState('');
    const [searchText, setSearchText] = useState('');
    const [photos, setPhotos] = useState<UnsplashPhoto[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadingMore, setLoadingMore] = useState(false);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [currentQuery, setCurrentQuery] = useState('');

    // Dynamically fetched thumbnails for theme keyword cards (null = still loading)
    const [themeThumbs, setThemeThumbs] = useState<(string | null)[]>([]);

    const searchTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
    const isLoadingRef = useRef(false);

    // ── Fetch one thumbnail per theme keyword when sheet opens in theme mode ──
    useEffect(() => {
        if (!visible || !themeCategory) { setThemeThumbs([]); return; }
        const kws = themeCategory.subcategories;
        setThemeThumbs(new Array(kws.length).fill(null));
        kws.forEach((kw, i) => {
            searchPhotos(kw.query, 1, 1).then(results => {
                if (results.length > 0) {
                    setThemeThumbs(prev => {
                        const next = [...prev];
                        next[i] = results[0].urls.small;
                        return next;
                    });
                }
            });
        });
    }, [visible, themeCategory]);

    // ── Load photos ──
    const loadPhotos = useCallback(async (
        query: string, pg: number, reset: boolean, prependPhoto?: UnsplashPhoto
    ) => {
        if (isLoadingRef.current && !reset) return;
        isLoadingRef.current = true;
        if (reset) { setLoading(true); setPage(1); setHasMore(true); }
        else { setLoadingMore(true); }

        const results = await searchPhotos(query, pg, 21);

        if (reset) {
            const deduped = prependPhoto
                ? results.filter(p => p.id !== prependPhoto.id)
                : results;
            setPhotos(prependPhoto ? [prependPhoto, ...deduped] : deduped);
            setLoading(false);
        } else {
            setPhotos(prev => [...prev, ...results]);
            setLoadingMore(false);
        }

        setHasMore(results.length === 21);
        isLoadingRef.current = false;
    }, []);

    // ── Reset on open ──
    useEffect(() => {
        if (!visible) return;
        setView('categories');
        setSearchText('');
        setPhotos([]);
        setActiveSubLabel('');
    }, [visible]);

    // ── Theme keyword tapped → load photos directly (no subcategory step) ──
    const handleThemeKeywordSelect = (idx: number) => {
        Haptics.selectionAsync();
        const kw = themeCategory!.subcategories[idx];
        setActiveSubLabel(kw.label);
        setCurrentQuery(kw.query);
        setView('photos');
        loadPhotos(kw.query, 1, true);
    };

    // ── Regular category tapped → show its subcategories ──
    const handleCategorySelect = (idx: number) => {
        Haptics.selectionAsync();
        setSelectedCatIdx(idx);
        setView('subcategories');
    };

    // ── Regular subcategory tapped → load photos ──
    const handleSubcategorySelect = (subIdx: number) => {
        Haptics.selectionAsync();
        setSelectedSubIdx(subIdx);
        const sub = BROWSE_CATEGORIES[selectedCatIdx].subcategories[subIdx];
        setActiveSubLabel(sub.label);
        setCurrentQuery(sub.query);
        setView('photos');
        const thumbPhoto: UnsplashPhoto = {
            id: `sub-thumb-${selectedCatIdx}-${subIdx}`,
            alt_description: sub.label,
            description: null,
            urls: { thumb: sub.thumb, small: sub.thumb, regular: sub.thumb },
        };
        loadPhotos(sub.query, 1, true, thumbPhoto);
    };

    // ── Search (debounced) ──
    const handleSearchChange = (text: string) => {
        setSearchText(text);
        clearTimeout(searchTimer.current);
        if (!text.trim()) {
            setView('categories');
            setPhotos([]);
            return;
        }
        setView('search');
        searchTimer.current = setTimeout(() => {
            setCurrentQuery(text.trim());
            loadPhotos(text.trim(), 1, true);
        }, 400);
    };

    // ── Tap photo → add to board, stay open so user can add more ──
    const [lastAdded, setLastAdded] = useState<string | null>(null);

    const handlePhotoTap = (photo: UnsplashPhoto) => {
        const url = (photo.id.startsWith('sub-thumb-') || photo.id.startsWith('cat-thumb-'))
            ? photo.urls.small
            : photo.urls.regular;
        onSelect(url);
        setLastAdded(photo.id);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        // Don't dismiss — let user keep browsing and add more images
        // They close with the X button when done
        setTimeout(() => setLastAdded(null), 1200);
    };

    const handleLoadMore = () => {
        if (!hasMore || isLoadingRef.current) return;
        const nextPage = page + 1;
        setPage(nextPage);
        loadPhotos(currentQuery, nextPage, false);
    };

    const handleBack = () => {
        if (view === 'photos') {
            // In theme mode photos go straight back to categories (no subcategory step)
            setView(themeCategory ? 'categories' : 'subcategories');
            setPhotos([]);
        } else {
            setView('categories');
            setSearchText('');
            setPhotos([]);
        }
    };

    if (!visible) return null;

    const cat = BROWSE_CATEGORIES[selectedCatIdx];
    const showBackBtn = view !== 'categories';

    return (
        <Animated.View
            entering={SlideInDown.duration(350)}
            exiting={SlideOutDown.duration(200)}
            style={[styles.imageBrowserSheet, { backgroundColor: WHITE }]}
        >
            {/* Handle */}
            <View style={styles.sheetHandle}>
                <View style={[styles.sheetHandleBar, { backgroundColor: BLACK + '30' }]} />
            </View>

            {/* Header */}
            <View style={styles.browserHeader}>
                {showBackBtn ? (
                    <TouchableOpacity onPress={handleBack} style={styles.browserBackBtn} activeOpacity={0.7}>
                        <ChevronLeftIcon color={BLACK} size={22} />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.browserBackBtn} />
                )}

                {view === 'photos' ? (
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.browserDrillTitle, { color: BLACK }]}>
                            {activeSubLabel}
                        </Text>
                        <Text style={[styles.browserDrillHint, { color: BLACK }]}>
                            Tap to add to your board
                        </Text>
                    </View>
                ) : view === 'subcategories' ? (
                    <View style={{ flex: 1 }}>
                        <Text style={[styles.browserDrillTitle, { color: BLACK }]}>
                            {cat.label}
                        </Text>
                        <Text style={[styles.browserDrillHint, { color: BLACK }]}>
                            Choose a style
                        </Text>
                    </View>
                ) : (
                    <View style={[styles.browserSearchWrap, { backgroundColor: '#F0F0F0', borderColor: BLACK + '20' }]}>
                        <SearchImageIcon color={BLACK} size={16} />
                        <RNTextInput
                            style={[styles.browserSearchInput, { color: BLACK }]}
                            placeholder="Search images…"
                            placeholderTextColor={BLACK + '60'}
                            value={searchText}
                            onChangeText={handleSearchChange}
                            returnKeyType="search"
                            autoCorrect={false}
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => handleSearchChange('')}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                            >
                                <XIcon color={BLACK} size={14} />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                <TouchableOpacity onPress={onDismiss} style={styles.sheetClose} activeOpacity={0.6}>
                    <XIcon color={BLACK} size={20} />
                </TouchableOpacity>
            </View>

            {/* ── View: Category cards ── */}
            {view === 'categories' && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catCardsGrid}>
                    <View style={styles.catCardsRow}>
                        {themeCategory ? (
                            // Theme mode: show only theme keywords as categories with live-fetched images
                            themeCategory.subcategories.map((kw, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.catCard, { backgroundColor: '#F0F0F0' }]}
                                    onPress={() => handleThemeKeywordSelect(i)}
                                    activeOpacity={0.85}
                                >
                                    {themeThumbs[i] ? (
                                        <Image
                                            source={{ uri: themeThumbs[i]! }}
                                            style={styles.catCardImg}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View style={[styles.catCardImg, { alignItems: 'center', justifyContent: 'center' }]}>
                                            <ActivityIndicator size="small" color={BLACK + '40'} />
                                        </View>
                                    )}
                                    <View style={styles.catCardOverlay}>
                                        <Text style={styles.catCardLabel}>{kw.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        ) : (
                            // Regular mode: show all browse categories
                            BROWSE_CATEGORIES.map((c, i) => (
                                <TouchableOpacity
                                    key={i}
                                    style={[styles.catCard, { backgroundColor: '#F0F0F0' }]}
                                    onPress={() => handleCategorySelect(i)}
                                    activeOpacity={0.85}
                                >
                                    <Image
                                        source={{ uri: c.thumb }}
                                        style={styles.catCardImg}
                                        resizeMode="cover"
                                    />
                                    <View style={styles.catCardOverlay}>
                                        <Text style={styles.catCardLabel}>{c.label}</Text>
                                    </View>
                                </TouchableOpacity>
                            ))
                        )}
                    </View>
                </ScrollView>
            )}

            {/* ── View: Subcategory cards (regular categories only) ── */}
            {view === 'subcategories' && (
                <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.catCardsGrid}>
                    <View style={styles.catCardsRow}>
                        {cat.subcategories.map((s, i) => (
                            <TouchableOpacity
                                key={i}
                                style={[styles.catCard, { backgroundColor: '#F0F0F0' }]}
                                onPress={() => handleSubcategorySelect(i)}
                                activeOpacity={0.85}
                            >
                                <Image
                                    source={{ uri: s.thumb }}
                                    style={styles.catCardImg}
                                    resizeMode="cover"
                                />
                                <View style={styles.catCardOverlay}>
                                    <Text style={styles.catCardLabel}>{s.label}</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </View>
                </ScrollView>
            )}

            {/* ── View: Photo grid (subcategory or search results) ── */}
            {(view === 'photos' || view === 'search') && (
                loading ? (
                    <View style={styles.browserCenterMsg}>
                        <ActivityIndicator size="large" color={YELLOW} />
                    </View>
                ) : photos.length === 0 ? (
                    <View style={styles.browserCenterMsg}>
                        <Text style={{ color: BLACK, fontFamily: 'Inter-Bold', fontSize: 14 }}>
                            No images found
                        </Text>
                    </View>
                ) : (
                    <FlatList
                        key={view + currentQuery}
                        data={photos}
                        keyExtractor={p => p.id}
                        numColumns={3}
                        contentContainerStyle={styles.browserGrid}
                        onEndReached={handleLoadMore}
                        onEndReachedThreshold={0.5}
                        showsVerticalScrollIndicator={false}
                        ListFooterComponent={loadingMore ? (
                            <View style={{ padding: 16, alignItems: 'center' }}>
                                <ActivityIndicator size="small" color={YELLOW} />
                            </View>
                        ) : null}
                        renderItem={({ item }) => {
                            const wasJustAdded = lastAdded === item.id;
                            return (
                                <TouchableOpacity
                                    style={[styles.browserTile, { backgroundColor: '#F0F0F0' }]}
                                    onPress={() => handlePhotoTap(item)}
                                    activeOpacity={0.85}
                                >
                                    <Image
                                        source={{ uri: item.urls.small }}
                                        style={styles.browserTileImg}
                                        resizeMode="cover"
                                    />
                                    {/* "Added" flash overlay */}
                                    {wasJustAdded && (
                                        <View style={styles.addedOverlay}>
                                            <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                                                <SvgCircle cx="12" cy="12" r="11" fill={YELLOW} />
                                                <SvgPath d="M7 12l4 4 6-7" stroke={BLACK} strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" />
                                            </Svg>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            );
                        }}
                    />
                )
            )}
        </Animated.View>
    );
};

// ═══════════════════════════════════════════════════════════
// Inspiration View (grid + detail)
// ═══════════════════════════════════════════════════════════

type InspirationCardProps = {
    category?:    InspirationCategory;   // undefined → "add new" placeholder
    onPress:      () => void;
    onLongPress?: () => void;
};

const InspirationCard: React.FC<InspirationCardProps> = ({ category, onPress, onLongPress }) => {
    if (!category) {
        return (
            <TouchableOpacity
                style={inspStyles.card}
                onPress={onPress}
                activeOpacity={0.75}
            >
                <View style={inspStyles.emptyCardInner}>
                    <View style={inspStyles.plusCircle}>
                        <Text style={inspStyles.plusText}>+</Text>
                    </View>
                </View>
            </TouchableOpacity>
        );
    }

    const thumb   = category.thumbnailUri ?? category.images[0]?.uri;
    const title   = category.title || 'UNTITLED';

    return (
        <TouchableOpacity
            style={inspStyles.card}
            onPress={onPress}
            onLongPress={onLongPress}
            delayLongPress={450}
            activeOpacity={0.8}
        >
            <View style={inspStyles.cardImageWrap}>
                {thumb ? (
                    <Image
                        source={{ uri: thumb }}
                        style={inspStyles.cardImage}
                        resizeMode="cover"
                    />
                ) : null}
            </View>
            <Text style={inspStyles.cardTitle} numberOfLines={1}>{title}</Text>
        </TouchableOpacity>
    );
};

// ── Draggable image inside the inspiration board ──
// Pan + pinch + rotate. Drag onto the bin (when one's visible) to remove.
type DraggableInspirationImageProps = {
    image:            InspirationImage;
    onUpdate:         (id: string, x: number, y: number, s: number, r: number) => void;
    onInstantRemove:  (id: string) => void;
    onDragStart:      () => void;
    onDragEnd:        () => void;
    isOverDeleteZone: SharedValue<boolean>;
    boardSize:        SharedValue<{ width: number; height: number }>;
    isThumbnail?:     boolean;
    onSetThumbnail?:  (id: string) => void;
};

const INSP_IMG_SIZE = 120;

const DraggableInspirationImage: React.FC<DraggableInspirationImageProps> = ({
    image,
    onUpdate,
    onInstantRemove,
    onDragStart,
    onDragEnd,
    isOverDeleteZone,
    boardSize,
    isThumbnail = false,
    onSetThumbnail,
}) => {
    const x        = useSharedValue(image.position_x);
    const y        = useSharedValue(image.position_y);
    const scale    = useSharedValue(image.scale);
    const rotation = useSharedValue(image.rotation);
    const ctx      = useSharedValue({ x: 0, y: 0 });
    const dragging = useSharedValue(false);

    const pan = Gesture.Pan()
        .onStart(() => {
            // Reset for this drag so a successful previous delete doesn't
            // leave the flag latched true.
            isOverDeleteZone.value = false;
            dragging.value = true;
            ctx.value = { x: x.value, y: y.value };
            runOnJS(onDragStart)();
        })
        .onUpdate((e) => {
            x.value = ctx.value.x + e.translationX;
            y.value = ctx.value.y + e.translationY;

            // AABB overlap so the image's actual visible footprint (after
            // scale) decides "over the bin", not just the geometric center.
            const boardW = boardSize.value.width;
            const boardH = boardSize.value.height;
            if (boardW > 0 && boardH > 0) {
                const itemCX = x.value + INSP_IMG_SIZE / 2;
                const itemCY = y.value + INSP_IMG_SIZE / 2;
                const itemHalfW = (INSP_IMG_SIZE * scale.value) / 2;
                const itemHalfH = (INSP_IMG_SIZE * scale.value) / 2;

                const binCX     = boardW / 2;
                const binCY     = boardH - 65;
                const binHalfW  = 90;
                const binHalfH  = 45;

                const isOver =
                    Math.abs(itemCX - binCX) < (itemHalfW + binHalfW) &&
                    Math.abs(itemCY - binCY) < (itemHalfH + binHalfH);

                if (isOver !== isOverDeleteZone.value) {
                    isOverDeleteZone.value = isOver;
                    if (isOver) {
                        runOnJS(Haptics.impactAsync)(Haptics.ImpactFeedbackStyle.Medium);
                    }
                }
            }
        })
        .onFinalize(() => {
            dragging.value = false;
            runOnJS(onDragEnd)();

            // NB: do NOT reset isOverDeleteZone here — pinch/rot's onFinalize
            // also fires on release, and they read this flag to decide
            // whether to skip their own onUpdate (which would re-introduce
            // the deleted image from closure state).
            if (isOverDeleteZone.value) {
                runOnJS(onInstantRemove)(image.id);
            } else {
                runOnJS(onUpdate)(image.id, x.value, y.value, scale.value, rotation.value);
            }
        });

    const pinch = Gesture.Pinch()
        .onChange((e) => { scale.value *= e.scaleChange; })
        .onFinalize(() => {
            // Don't persist a position update if the release was over the
            // bin — pan.onFinalize handles deletion, and re-writing state
            // here would resurrect the deleted image.
            if (isOverDeleteZone.value) return;
            runOnJS(onUpdate)(image.id, x.value, y.value, scale.value, rotation.value);
        });

    const rot = Gesture.Rotation()
        .onChange((e) => { rotation.value += e.rotationChange * (180 / Math.PI); })
        .onFinalize(() => {
            if (isOverDeleteZone.value) return;
            runOnJS(onUpdate)(image.id, x.value, y.value, scale.value, rotation.value);
        });

    const composed = Gesture.Simultaneous(pan, pinch, rot);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [
            { translateX: x.value },
            { translateY: y.value },
            { scale: scale.value },
            { rotate: `${rotation.value}deg` },
        ],
        position: 'absolute' as const,
        zIndex: dragging.value ? 100 : 5,
        shadowOpacity: withTiming(dragging.value ? 0.18 : 0.08, { duration: 180 }),
    }));

    return (
        <GestureDetector gesture={composed}>
            <Animated.View style={[inspStyles.draggableImgWrap, animatedStyle]}>
                <Image
                    source={{ uri: image.uri }}
                    style={inspStyles.draggableImg}
                    resizeMode="cover"
                />
                {/* Cover / thumbnail selector badge */}
                {onSetThumbnail && (
                    <TouchableOpacity
                        style={[inspStyles.coverBtn, isThumbnail && inspStyles.coverBtnActive]}
                        onPress={() => onSetThumbnail(image.id)}
                        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                        activeOpacity={0.7}
                    >
                        <Text style={[inspStyles.coverBtnText, isThumbnail && inspStyles.coverBtnTextActive]}>
                            {isThumbnail ? '★' : '☆'}
                        </Text>
                    </TouchableOpacity>
                )}
            </Animated.View>
        </GestureDetector>
    );
};

type InspirationDetailProps = {
    category: InspirationCategory;
    onBack:   () => void;
    onChange: (patch: Partial<InspirationCategory>) => void;
};

const InspirationDetail: React.FC<InspirationDetailProps> = ({
    category,
    onBack,
    onChange,
}) => {
    const [title, setTitle] = useState(category.title);
    const [isDraggingAny, setIsDraggingAny] = useState(false);
    const isOverDeleteZone = useSharedValue(false);
    const boardSize        = useSharedValue({ width: 0, height: 0 });

    const deleteZoneStyle = useAnimatedStyle(() => ({
        backgroundColor: isOverDeleteZone.value ? '#FF3B30' : WHITE,
        borderColor:     isOverDeleteZone.value ? '#FF3B30' : BLACK + '20',
        transform: [{ scale: withTiming(isOverDeleteZone.value ? 1.1 : 1, { duration: 180 }) }],
    }));
    const deleteIconProps = useAnimatedProps(() => ({
        stroke: isOverDeleteZone.value ? '#FFF' : BLACK,
    }));

    const commitTitle = () => {
        const trimmed = title.trim();
        if (trimmed !== category.title) {
            onChange({ title: trimmed });
        }
    };

    const handleAddImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes:              ['images'],
            allowsEditing:           false,
            quality:                 0.8,
            allowsMultipleSelection: true,
            selectionLimit:          8,
        });
        if (result.canceled) return;
        const newImgs = result.assets.map((a, i) =>
            makeInspirationImage(a.uri, i, category.images.length)
        );
        onChange({ images: [...category.images, ...newImgs] });
    };

    const handleImageUpdate = (id: string, x: number, y: number, s: number, r: number) => {
        const next = category.images.map(img =>
            img.id === id
                ? { ...img, position_x: x, position_y: y, scale: s, rotation: r }
                : img
        );
        onChange({ images: next });
    };

    const handleImageInstantRemove = (id: string) => {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const updated = category.images.filter(i => i.id !== id);
        // If the deleted image was the thumbnail, clear it
        const removedImg = category.images.find(i => i.id === id);
        const wasThumb = removedImg && removedImg.uri === category.thumbnailUri;
        onChange({ images: updated, ...(wasThumb ? { thumbnailUri: undefined } : {}) });
    };

    const handleSetThumbnail = (id: string) => {
        const img = category.images.find(i => i.id === id);
        if (!img) return;
        const newThumb = category.thumbnailUri === img.uri ? undefined : img.uri;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onChange({ thumbnailUri: newThumb });
    };

    // Root = the white board card itself, so it matches the exact shape of
    // the Monthly board / Inspiration grid (same marginHorizontal, radius).
    return (
        <View
            style={inspStyles.boardCard}
            onLayout={e => {
                const { width: w, height: h } = e.nativeEvent.layout;
                boardSize.value = { width: w, height: h };
            }}
        >
            {/* Subtle back chevron, top-left, no background */}
            <TouchableOpacity
                onPress={onBack}
                hitSlop={{ top: 14, bottom: 14, left: 14, right: 14 }}
                style={inspStyles.detailBackInline}
                activeOpacity={0.5}
            >
                <ChevronLeftIcon color={BLACK} size={24} />
            </TouchableOpacity>

            {/* Editable title, centered at top of card */}
            <View style={inspStyles.boardTitleWrap} pointerEvents="box-none">
                <RNTextInput
                    value={title}
                    onChangeText={setTitle}
                    onBlur={commitTitle}
                    onSubmitEditing={commitTitle}
                    placeholder="TITLE"
                    placeholderTextColor="#D1D5DB"
                    style={inspStyles.boardTitleInput}
                    autoCapitalize="characters"
                    returnKeyType="done"
                />
            </View>

            {/* Draggable images */}
            {category.images.map(img => (
                <DraggableInspirationImage
                    key={img.id}
                    image={img}
                    onUpdate={handleImageUpdate}
                    onInstantRemove={handleImageInstantRemove}
                    onDragStart={() => setIsDraggingAny(true)}
                    onDragEnd={()   => setIsDraggingAny(false)}
                    isOverDeleteZone={isOverDeleteZone}
                    boardSize={boardSize}
                    isThumbnail={
                        category.thumbnailUri
                            ? img.uri === category.thumbnailUri
                            : img.id === category.images[0]?.id
                    }
                    onSetThumbnail={handleSetThumbnail}
                />
            ))}

            {/* Drag-to-delete bin (matches Monthly board) */}
            {isDraggingAny && (
                <Animated.View
                    entering={SlideInDown.duration(200)}
                    exiting={SlideOutDown.duration(200)}
                    style={[styles.deleteZoneWrapper, deleteZoneStyle]}
                >
                    <View style={styles.deleteZoneInner}>
                        <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                            <AnimatedPath
                                d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6"
                                animatedProps={deleteIconProps}
                                strokeWidth={1.5}
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                        </Svg>
                    </View>
                </Animated.View>
            )}

            {/* + FAB inside the card, bottom-right (hidden during drag) */}
            {!isDraggingAny && (
                <TouchableOpacity
                    style={inspStyles.boardFab}
                    onPress={handleAddImage}
                    activeOpacity={0.8}
                >
                    <Text style={inspStyles.boardFabText}>+</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

const InspirationView: React.FC = () => {
    const [cats, setCats] = useState<InspirationCategory[]>([]);
    const [activeId, setActiveId] = useState<string | null>(null);

    const refresh = useCallback(async () => {
        const data = await getInspirationCategories();
        setCats(data);
    }, []);

    useFocusEffect(useCallback(() => { refresh(); }, [refresh]));

    const active = cats.find(c => c.id === activeId) ?? null;

    const handleCreate = async () => {
        const cat = await createInspirationCategory();
        setCats(prev => [...prev, cat]);
        setActiveId(cat.id);
    };

    const handleUpdate = async (patch: Partial<InspirationCategory>) => {
        if (!active) return;
        // Optimistic local update
        setCats(prev => prev.map(c => c.id === active.id ? { ...c, ...patch } : c));
        await updateInspirationCategory(active.id, {
            title:        patch.title        ?? active.title,
            images:       patch.images       ?? active.images,
            thumbnailUri: 'thumbnailUri' in patch ? patch.thumbnailUri : active.thumbnailUri,
        });
    };

    const handleDeleteCategory = (cat: InspirationCategory) => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
        Alert.alert(
            'Delete category?',
            cat.title ? `"${cat.title}" will be removed.` : 'This category will be removed.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        await deleteInspirationCategory(cat.id);
                        setCats(prev => prev.filter(c => c.id !== cat.id));
                        if (activeId === cat.id) setActiveId(null);
                    },
                },
            ]
        );
    };

    // Detail view takes over when a category is open
    if (active) {
        return (
            <InspirationDetail
                category={active}
                onBack={() => setActiveId(null)}
                onChange={handleUpdate}
            />
        );
    }

    // Grid view
    return (
        <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={inspStyles.gridContainer}
            showsVerticalScrollIndicator={false}
        >
            <View style={inspStyles.gridRow}>
                {cats.map(cat => (
                    <InspirationCard
                        key={cat.id}
                        category={cat}
                        onPress={() => setActiveId(cat.id)}
                        onLongPress={() => handleDeleteCategory(cat)}
                    />
                ))}
                {/* "+" tile always at the end */}
                <InspirationCard onPress={handleCreate} />
            </View>
        </ScrollView>
    );
};

const inspStyles = StyleSheet.create({
    // ── Grid ──
    gridContainer: {
        paddingHorizontal: 10,
        paddingTop:        10,
        paddingBottom:     24,
    },
    gridRow: {
        flexDirection: 'row',
        flexWrap:      'wrap',
        justifyContent: 'space-between',
    },
    card: {
        width:        '48%',
        aspectRatio:  3 / 4,
        backgroundColor: WHITE,
        borderRadius: 18,
        marginBottom: 12,
        padding:      10,
        justifyContent: 'space-between',
    },
    cardImageWrap: {
        flex: 1,
        backgroundColor: '#F3F4F6',
        borderRadius: 12,
        overflow: 'hidden',
    },
    cardImage: {
        width:  '100%',
        height: '100%',
    },
    cardTitle: {
        fontFamily: 'Inter-Bold',
        fontSize:   16,
        color:      BLACK,
        textAlign:  'center',
        marginTop:  10,
        textTransform: 'uppercase',
        letterSpacing: 0.6,
    },
    emptyCardInner: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
    },
    plusCircle: {
        width:  56,
        height: 56,
        borderRadius: 28,
        backgroundColor: YELLOW,
        alignItems:  'center',
        justifyContent: 'center',
    },
    plusText: {
        fontFamily: 'Inter-Bold',
        fontSize:   28,
        color:      BLACK,
        marginTop:  -2,
    },

    // ── Detail (mirrors Monthly board) ──
    boardCard: {
        flex: 1,
        marginHorizontal: 12,
        backgroundColor: WHITE,
        borderRadius: 20,
        overflow: 'hidden',
        position: 'relative',
    },
    detailBackInline: {
        position: 'absolute',
        top:  16,
        left: 14,
        width:  36,
        height: 36,
        alignItems:     'center',
        justifyContent: 'center',
        zIndex: 3,
    },
    boardTitleWrap: {
        position: 'absolute',
        top: 22,
        left: 0,
        right: 0,
        alignItems: 'center',
        zIndex: 0,
    },
    boardTitleInput: {
        fontFamily:    'Inter-Bold',
        fontSize:      28,
        color:         BLACK,
        textAlign:     'center',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        paddingVertical:  4,
        paddingHorizontal: 16,
        minWidth: 120,
    },
    draggableImgWrap: {
        width:  INSP_IMG_SIZE,
        height: INSP_IMG_SIZE,
        shadowColor:  BLACK,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 6,
        elevation: 3,
    },
    draggableImg: {
        width:  '100%',
        height: '100%',
        borderRadius: 10,
        backgroundColor: '#F3F4F6',
    },
    // Cover / thumbnail selector
    coverBtn: {
        position:   'absolute',
        top:        4,
        right:      4,
        width:      24,
        height:     24,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems:     'center',
        justifyContent: 'center',
        zIndex: 10,
    },
    coverBtnActive: {
        backgroundColor: YELLOW,
    },
    coverBtnText: {
        fontSize: 13,
        color:    WHITE,
        lineHeight: 16,
    },
    coverBtnTextActive: {
        color: BLACK,
    },
    boardFab: {
        position: 'absolute',
        right:    16,
        bottom:   16,
        width:    56,
        height:   56,
        borderRadius: 28,
        backgroundColor: YELLOW,
        borderWidth: 2,
        borderColor: BLACK,
        alignItems:     'center',
        justifyContent: 'center',
        zIndex: 5,
    },
    boardFabText: {
        fontFamily: 'Inter-Bold',
        fontSize:   28,
        color:      BLACK,
        marginTop:  -2,
    },
});

// ═══════════════════════════════════════════════════════════
// Main Screen
// ═══════════════════════════════════════════════════════════

export const VisionBoardScreen: React.FC = () => {
    const boardRef     = useRef<View>(null);
    const headerHeight = useHeaderHeight();
    const insets       = useSafeAreaInsets();
    const [boardMode, setBoardMode] = useState<'monthly' | 'inspiration'>('monthly');

    // Sliding indicator for the Monthly / Inspiration toggle
    const [pillWidth, setPillWidth] = useState(0);
    const pillProgress = useSharedValue(0); // 0 = monthly, 1 = inspiration
    useEffect(() => {
        pillProgress.value = withTiming(boardMode === 'monthly' ? 0 : 1, { duration: 220 });
    }, [boardMode]);
    // Inner area = pillWidth − 2*border(2) − 2*padding(4) = pillWidth − 12
    const halfInner = Math.max(0, (pillWidth - 12) / 2);
    const pillIndicatorStyle = useAnimatedStyle(() => ({
        transform: [{ translateX: pillProgress.value * halfInner }],
    }));

    const todayStr = useMemo(() => {
        const d = new Date();
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }, []);

    const [items, setItems] = useState<LocalVisionItem[]>([]);
    const [isInputVisible, setIsInputVisible] = useState(false);
    const [isStockVisible, setIsStockVisible] = useState(false);
    const [stockThemeCategory, setStockThemeCategory] = useState<{ label: string; subcategories: { label: string; query: string }[] } | undefined>(undefined);
    const [isLayoutVisible, setIsLayoutVisible] = useState(false);
    const [deleteId, setDeleteId] = useState<string | null>(null);
    const [showClearConfirm, setShowClearConfirm] = useState(false);
    const [editingTextItem, setEditingTextItem] = useState<LocalVisionItem | null>(null);
    const [boardBgId, setBoardBgId] = useState('default');
    const [layoutVersion, setLayoutVersion] = useState(0);

    const activeBgPreset = BOARD_BG_PRESETS.find(b => b.id === boardBgId) ?? BOARD_BG_PRESETS[0];

    // Drag-to-delete state
    const [isDraggingAny, setIsDraggingAny] = useState(false);
    const isOverDeleteZone = useSharedValue(false);
    // Measured size of the board (used for board-local drag-to-delete hit-test)
    const boardSize = useSharedValue({ width: 0, height: 0 });

    const deleteZoneStyle = useAnimatedStyle(() => ({
        backgroundColor: isOverDeleteZone.value ? '#FF3B30' : WHITE,
        borderColor: isOverDeleteZone.value ? '#FF3B30' : BLACK + '20',
        transform: [{ scale: withTiming(isOverDeleteZone.value ? 1.1 : 1, { duration: 180 }) }],
    }));

    const deleteTextStyle = useAnimatedStyle(() => ({
        color: isOverDeleteZone.value ? '#FFF' : BLACK,
    }));

    const deleteIconProps = useAnimatedProps(() => ({
        stroke: isOverDeleteZone.value ? '#FFF' : BLACK,
    }));

    // Item count text
    const itemCountText = useMemo(() => {
        if (items.length === 0) return '';
        if (items.length === 1) return '1 dream pinned';
        return `${items.length} dreams pinned`;
    }, [items.length]);

    const loadItems = async () => {
        if (boardMode === 'monthly') {
            const data = await fetchVisionItems();
            setItems(data);
        } else {
            // Inspiration mode manages its own list; keep board items empty.
            setItems([]);
        }
    };

    useFocusEffect(
        useCallback(() => { loadItems(); }, [boardMode])
    );

    const handleShareBoard = async () => {
        if (!boardRef.current || items.length === 0) return;
        try {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            const uri = await captureRef(boardRef, {
                format: 'png',
                quality: 0.9,
            });
            await Sharing.shareAsync(uri, {
                mimeType: 'image/png',
                dialogTitle: 'Share your Vision Board',
            });
        } catch (e) {
            console.error('Share failed:', e);
            Alert.alert('Share Failed', 'Could not capture your vision board.');
        }
    };

    const handleAddImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: false,
            quality: 0.8,
        });
        if (!result.canceled) {
            const localUri = result.assets[0].uri;
            const tempId = `temp-${Date.now()}`;
            const pos_x = Math.random() * Math.max(10, width - ITEM_SIZE - 20) + 10;
            const pos_y = Math.random() * Math.max(10, height * 0.35) + 10;
            const pos_rot = (Math.random() - 0.5) * 12;
            const tempItem: LocalVisionItem = {
                id: tempId,
                type: 'image',
                content: localUri,
                position_x: pos_x,
                position_y: pos_y,
                rotation: pos_rot,
                scale: 1,
                syncStatus: 'uploading',
            };
            setItems(prev => [...prev, tempItem]);

            try {
                const newItem = await addVisionItem('image', localUri, { x: pos_x, y: pos_y, rotation: pos_rot, scale: 1 });
                if (newItem) {
                    // Preserve the displayed position — don't let DB random coords cause a jump
                    setItems(prev => prev.map(i => i.id === tempId
                        ? { ...newItem, position_x: pos_x, position_y: pos_y, rotation: pos_rot, syncStatus: 'synced' }
                        : i));
                } else {
                    setItems(prev => prev.map(i => i.id === tempId ? { ...i, syncStatus: 'error' } : i));
                }
            } catch (e) {
                console.error('Vision board image add failed:', e);
                setItems(prev => prev.map(i => i.id === tempId ? { ...i, syncStatus: 'error' } : i));
                Alert.alert('Upload Failed', 'Would you like to retry?', [
                    { text: 'Cancel', style: 'cancel' },
                    { text: 'Retry', onPress: () => handleRetry(tempItem) }
                ]);
            }
        }
    };

    const handleRetry = async (item: LocalVisionItem) => {
        if (!item.content.startsWith('file://')) return;
        setItems(prev => prev.map(i => i.id === item.id ? { ...i, syncStatus: 'uploading' } : i));

        try {
            const newItem = await addVisionItem('image', item.content);
            if (newItem) {
                setItems(prev => prev.map(i => i.id === item.id ? { ...newItem, syncStatus: 'synced' } : i));
            } else {
                setItems(prev => prev.map(i => i.id === item.id ? { ...i, syncStatus: 'error' } : i));
            }
        } catch (e) {
            setItems(prev => prev.map(i => i.id === item.id ? { ...i, syncStatus: 'error' } : i));
            Alert.alert('Upload Failed Again', 'Please check your connection.');
        }
    };

    const handleAddText = async (text: string) => {
        if (!text.trim()) return;
        const newItem = await addVisionItem('text', text);
        if (newItem) setItems(prev => [...prev, newItem]);
        setIsInputVisible(false);
    };

    const handleApplyLayout = (preset: LayoutPreset) => {
        const newPositions = preset.arrange(items.length, width, height - 100);

        const updatedItems = items.map((item, i) => {
            if (!newPositions[i]) return item; // Safety check
            const pos = newPositions[i];
            if (!item.id.startsWith('temp-') && !item.id.startsWith('stock-')) {
                updateVisionItemPosition(item.id, pos.x, pos.y, pos.scale, pos.rotation);
            }
            return {
                ...item,
                position_x: pos.x,
                position_y: pos.y,
                scale: pos.scale,
                rotation: pos.rotation,
            };
        });
        setItems(updatedItems);
        setLayoutVersion(v => v + 1);
        setIsLayoutVisible(false);
    };

    const handleAddStockImage = async (url: string) => {
        setIsStockVisible(false);
        const tempId = `stock-${Date.now()}`;
        // Scatter each stock image slightly so they don't all stack
        const pos_x = Math.random() * Math.max(10, width - ITEM_SIZE - 20) + 10;
        const pos_y = Math.random() * Math.max(10, height * 0.4) + 10;
        const pos_rot = (Math.random() - 0.5) * 8;
        const tempItem: LocalVisionItem = {
            id: tempId,
            type: 'image',
            content: url,
            position_x: pos_x,
            position_y: pos_y,
            rotation: pos_rot,
            scale: 1,
            syncStatus: 'uploading',
        };
        setItems(prev => [...prev, tempItem]);

        try {
            const newItem = await addVisionItem('image', url, { x: pos_x, y: pos_y, rotation: pos_rot, scale: 1 });
            if (newItem) {
                // Preserve the displayed position so the item doesn't jump
                setItems(prev => prev.map(i => i.id === tempId
                    ? { ...newItem, position_x: pos_x, position_y: pos_y, rotation: pos_rot, syncStatus: 'synced' }
                    : i));
            } else {
                setItems(prev => prev.map(i => i.id === tempId ? { ...i, syncStatus: 'error' } : i));
            }
        } catch (e) {
            setItems(prev => prev.map(i => i.id === tempId ? { ...i, syncStatus: 'error' } : i));
        }
    };

    const handleClearBoard = () => {
        setIsLayoutVisible(false);
        setShowClearConfirm(true);
    };

    const confirmClearBoard = async () => {
        const ids = items.filter(i => !i.id.startsWith('temp-') && !i.id.startsWith('stock-')).map(i => i.id);
        setItems([]);
        setShowClearConfirm(false);
        await Promise.all(ids.map(id => deleteVisionItem(id)));
    };

    const handleUpdate = (id: string, x: number, y: number, s: number, r: number) => {
        // Skip items that still have a temporary local ID (not yet persisted to DB)
        if (id.startsWith('temp-') || id.startsWith('stock-')) return;
        updateVisionItemPosition(id, x, y, s, r);
    };

    const confirmDelete = async () => {
        if (deleteId) {
            await deleteVisionItem(deleteId);
            setItems(prev => prev.filter(i => i.id !== deleteId));
            setDeleteId(null);
        }
    };

    const handleUpdateTextStyle = (style: { text_color?: string; font_family?: string; bg_style?: string }) => {
        if (!editingTextItem) return;

        setItems(prev => prev.map(i => i.id === editingTextItem.id ? { ...i, ...style } : i));
        setEditingTextItem(prev => prev ? { ...prev, ...style } : null);
        if (!editingTextItem.id.startsWith('temp-')) {
            updateVisionItemStyle(editingTextItem.id, style);
        }
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={[styles.container, { backgroundColor: BLACK }]}>
                {/* ── Mode toggle pill (below the floating AppHeader) ── */}
                <View style={[styles.modePillWrap, { marginTop: headerHeight + 16 }]}>
                    <View
                        style={styles.modePill}
                        onLayout={e => setPillWidth(e.nativeEvent.layout.width)}
                    >
                        {/* Sliding yellow indicator behind the labels */}
                        <Animated.View style={[styles.modePillIndicator, { width: halfInner }, pillIndicatorStyle]} />
                        <TouchableOpacity
                            onPress={() => setBoardMode('monthly')}
                            style={styles.modePillHalf}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modePillText}>Monthly</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setBoardMode('inspiration')}
                            style={styles.modePillHalf}
                            activeOpacity={0.8}
                        >
                            <Text style={styles.modePillText}>Inspiration</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* ── Inspiration mode short-circuits the board ── */}
                {boardMode === 'inspiration' && (
                    <View style={{ flex: 1, marginBottom: 62 + insets.bottom + 12 }}>
                        <InspirationView />
                    </View>
                )}

                {/* ── Monthly Board Card ── */}
                {boardMode === 'monthly' && (
                <View style={[styles.boardCardWrapper, { marginBottom: 62 + insets.bottom + 12 }]}>
                    <View
                        style={styles.board}
                        ref={boardRef}
                        collapsable={false}
                        onLayout={e => {
                            const { width: w, height: h } = e.nativeEvent.layout;
                            boardSize.value = { width: w, height: h };
                        }}
                    >
                        {/* Canvas background layer */}
                        {activeBgPreset.type === 'gradient' && activeBgPreset.colors ? (
                            <LinearGradient
                                colors={activeBgPreset.colors}
                                start={activeBgPreset.start ?? { x: 0, y: 0 }}
                                end={activeBgPreset.end ?? { x: 1, y: 1 }}
                                style={StyleSheet.absoluteFillObject}
                            />
                        ) : activeBgPreset.type === 'solid' && activeBgPreset.color ? (
                            <View style={[StyleSheet.absoluteFillObject, { backgroundColor: activeBgPreset.color }]} />
                        ) : null}

                        {/* Month header at top of card */}
                        <View style={styles.monthHeader} pointerEvents="none">
                            <Text style={styles.monthHeaderName}>
                                {new Date().toLocaleDateString('en-US', { month: 'long' }).toUpperCase()}
                            </Text>
                            <Text style={styles.monthHeaderYear}>
                                {new Date().getFullYear()}
                            </Text>
                        </View>

                        {items.map((item) => (
                            <DraggableItem
                                key={item.id}
                                item={item}
                                layoutVersion={layoutVersion}
                                onUpdate={handleUpdate}
                                onRetry={handleRetry}
                                onDelete={(id, instant) => {
                                    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                                    if (instant) {
                                        setItems(prev => prev.filter(i => i.id !== id));
                                        if (!id.startsWith('temp-') && !id.startsWith('stock-')) {
                                            deleteVisionItem(id);
                                        }
                                    } else {
                                        setDeleteId(id);
                                    }
                                }}
                                onEditStyle={(id) => setEditingTextItem(items.find(i => i.id === id) ?? null)}
                                onDragStart={() => {
                                    setIsDraggingAny(true);
                                    // Bring to front by moving to end of render list
                                    setItems(prev => {
                                        const idx = prev.findIndex(i => i.id === item.id);
                                        if (idx === -1 || idx === prev.length - 1) return prev;
                                        const next = [...prev];
                                        next.push(next.splice(idx, 1)[0]);
                                        return next;
                                    });
                                }}
                                onDragEnd={() => setIsDraggingAny(false)}
                                isOverDeleteZone={isOverDeleteZone}
                                boardSize={boardSize}
                            />
                        ))}

                        {/* Delete zone */}
                        {isDraggingAny && (
                            <Animated.View
                                entering={SlideInDown.duration(200)}
                                exiting={SlideOutDown.duration(200)}
                                style={[styles.deleteZoneWrapper, deleteZoneStyle]}
                            >
                                <View style={styles.deleteZoneInner}>
                                    <Svg width={22} height={22} viewBox="0 0 24 24" fill="none">
                                        <AnimatedPath
                                            d="M3 6h18M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M10 11v6M14 11v6"
                                            animatedProps={deleteIconProps}
                                            strokeWidth={1.5}
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                        />
                                    </Svg>
                                </View>
                            </Animated.View>
                        )}
                    </View>

                    {/* ── FAB: + Add button ── */}
                    {!isDraggingAny && (
                        <TouchableOpacity
                            style={styles.fab}
                            onPress={() => {
                                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                                setStockThemeCategory(undefined);
                                setIsStockVisible(true);
                            }}
                            activeOpacity={0.75}
                        >
                            <Text style={styles.fabText}>+</Text>
                        </TouchableOpacity>
                    )}
                </View>
                )}

                {/* ── Sheets ── */}
                <Portal>
                    <AffirmationSheet
                        visible={isInputVisible}
                        onDismiss={() => setIsInputVisible(false)}
                        onSubmit={(text) => {
                            handleAddText(text);
                            setIsInputVisible(false);
                        }}
                    />
                    <LayoutSheet
                        visible={isLayoutVisible}
                        onDismiss={() => setIsLayoutVisible(false)}
                        onSelect={handleApplyLayout}
                        onClearBoard={handleClearBoard}
                        itemCount={items.length}
                        activeBgId={boardBgId}
                        onSetBg={(preset) => setBoardBgId(preset.id)}
                    />
                    <StockImageSheet
                        visible={isStockVisible}
                        onDismiss={() => { setIsStockVisible(false); setStockThemeCategory(undefined); }}
                        onSelect={handleAddStockImage}
                        themeCategory={stockThemeCategory}
                    />
                    {editingTextItem?.type === 'text' && (
                        <TextStyleSheet
                            item={editingTextItem}
                            onDismiss={() => setEditingTextItem(null)}
                            onStyleChange={handleUpdateTextStyle}
                        />
                    )}
                </Portal>

                {/* ── Delete Confirmation ── */}
                {deleteId && (
                    <Portal>
                        <Animated.View entering={FadeIn.duration(200)} style={styles.dialogOverlay}>
                            <View style={[styles.dialogCard, { backgroundColor: WHITE }]}>
                                <TrashIcon color='#D32F2F' size={28} />
                                <Text style={[styles.dialogTitle, { color: BLACK }]}>
                                    Remove this?
                                </Text>
                                <Text style={[styles.dialogBody, { color: BLACK }]}>
                                    It'll be removed from your vision board
                                </Text>
                                <View style={styles.dialogActions}>
                                    <TouchableOpacity
                                        onPress={() => setDeleteId(null)}
                                        style={[styles.dialogBtn, { backgroundColor: '#F0F0F0' }]}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.dialogBtnText, { color: BLACK }]}>Keep</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={confirmDelete}
                                        style={[styles.dialogBtn, { backgroundColor: '#D32F2F' }]}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.dialogBtnText, { color: '#FFF' }]}>Remove</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Animated.View>
                    </Portal>
                )}

                {/* ── Clear Board Confirmation ── */}
                {showClearConfirm && (
                    <Portal>
                        <Animated.View entering={FadeIn.duration(200)} style={styles.dialogOverlay}>
                            <Animated.View
                                entering={FadeInDown.duration(280).springify().damping(16)}
                                style={[styles.dialogCard, { backgroundColor: WHITE }]}
                            >
                                {/* Icon badge */}
                                <View style={[styles.clearDialogIconBadge, { backgroundColor: '#D32F2F' + '14' }]}>
                                    <TrashIcon color='#D32F2F' size={30} />
                                </View>

                                <Text style={[styles.dialogTitle, { color: BLACK, marginTop: 6 }]}>
                                    Clear entire board?
                                </Text>
                                <Text style={[styles.dialogBody, { color: BLACK }]}>
                                    {`All ${items.length} item${items.length !== 1 ? 's' : ''} will be permanently removed.\nThis cannot be undone.`}
                                </Text>

                                {/* Divider */}
                                <View style={[styles.clearDialogDivider, { backgroundColor: BLACK + '15' }]} />

                                <View style={[styles.dialogActions, { flexDirection: 'column', gap: 8 }]}>
                                    <TouchableOpacity
                                        onPress={confirmClearBoard}
                                        style={[styles.dialogBtn, { backgroundColor: '#D32F2F', width: '100%' }]}
                                        activeOpacity={0.75}
                                    >
                                        <Text style={[styles.dialogBtnText, { color: '#FFF' }]}>Clear All</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => setShowClearConfirm(false)}
                                        style={[styles.dialogBtn, { backgroundColor: '#F0F0F0', width: '100%' }]}
                                        activeOpacity={0.7}
                                    >
                                        <Text style={[styles.dialogBtnText, { color: BLACK }]}>Cancel</Text>
                                    </TouchableOpacity>
                                </View>
                            </Animated.View>
                        </Animated.View>
                    </Portal>
                )}
            </View>
        </GestureHandlerRootView>
    );
};

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },

    // ── Monthly / Inspiration pill toggle ──
    modePillWrap: {
        marginHorizontal: 12,
        marginBottom: 10,
    },
    modePill: {
        flexDirection: 'row',
        backgroundColor: WHITE,
        borderRadius: 40,
        padding: 4,
        borderWidth: 2,
        borderColor: BLACK,
        position: 'relative',
        overflow: 'hidden',
    },
    modePillIndicator: {
        position: 'absolute',
        top: 4,
        bottom: 4,
        left: 4,
        backgroundColor: YELLOW,
        borderRadius: 40,
    },
    modePillHalf: {
        flex: 1,
        borderRadius: 40,
        paddingVertical: 12,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1,
    },
    modePillText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        color: BLACK,
    },

    // ── Board Card Wrapper ──
    boardCardWrapper: {
        flex: 1,
        marginHorizontal: 12,
        marginBottom: 12,
        backgroundColor: WHITE,
        borderRadius: 20,
        overflow: 'hidden',
    },

    // ── Monthly header (APRIL / 2026) ──
    monthHeader: {
        position: 'absolute',
        top: 24,
        left: 0,
        right: 0,
        alignItems: 'center',
    },
    monthHeaderName: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        color: BLACK,
        letterSpacing: 0,
    },
    monthHeaderYear: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        color: '#D1D5DB',
        letterSpacing: 0,
        marginTop: -2,
    },

    // ── Board ──
    board: {
        flex: 1,
        overflow: 'hidden',
    },

    // ── FAB ──
    fab: {
        position: 'absolute',
        bottom: 16,
        right: 16,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: YELLOW,
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
    },
    fabText: {
        color: BLACK,
        fontSize: 20,
        lineHeight: 30,
        fontFamily: 'Inter-Bold',
        marginTop: -2,
    },

    itemContainer: {
        width: 160,
        height: 160,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowRadius: 20,
        elevation: 4,
    },
    imageWrapper: {
        borderRadius: 18,
        borderWidth: 1.5,
        overflow: 'hidden',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 20,
        elevation: 6,
    },
    imageItem: {
        width: 150,
        height: 150,
        borderRadius: 16,
    },
    imageOverlay: {
        position: 'absolute',
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    overlayText: {
        fontSize: 12,
        color: '#FFF',
        fontFamily: 'Inter-Bold',
        fontWeight: '600',
        textAlign: 'center',
    },
    textItem: {
        padding: 22,
        borderRadius: 18,
        width: 155,
        minHeight: 100,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 16,
        elevation: 2,
    },
    textItemContent: {
        fontFamily: 'Inter-Bold',
        fontSize: 17,
        lineHeight: 24,
        textAlign: 'center',
    },

    // ── Empty State ──
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        paddingBottom: 60,
    },
    emptyOrb: {
        position: 'absolute',
        borderRadius: 999,
    },
    emptyOrb1: {
        width: 220,
        height: 220,
        top: '18%',
        right: -50,
    },
    emptyOrb2: {
        width: 180,
        height: 180,
        bottom: '22%',
        left: -40,
    },
    emptyIconWrap: {
        width: 72, height: 72, borderRadius: 36,
        backgroundColor: YELLOW,
        alignItems: 'center', justifyContent: 'center',
    },
    emptyTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
    },
    emptySubtitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        marginTop: 6,
        textAlign: 'center',
        lineHeight: 20,
    },
    emptyBrowseBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        paddingVertical: 15,
        borderRadius: 22,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.22,
        shadowRadius: 14,
        elevation: 6,
        marginBottom: 4,
    },
    emptyBrowseBtnText: {
        fontFamily: 'Inter-Bold',
        fontSize: 16,
        fontWeight: '700',
    },
    emptyActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 8,
    },
    emptyActionBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 18,
        paddingVertical: 12,
        borderRadius: 20,
        borderWidth: 1,
    },
    emptyActionText: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        fontWeight: '600',
    },

    // ── Delete Zone ──
    deleteZoneWrapper: {
        position: 'absolute',
        bottom: Platform.OS === 'ios' ? 40 : 20,
        alignSelf: 'center',
        paddingHorizontal: 28,
        paddingVertical: 14,
        borderRadius: 22,
        borderWidth: 1.5,
        zIndex: 100,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.10,
        shadowRadius: 12,
        elevation: 8,
    },
    deleteZoneInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    // ── Layout Sheet ──
    layoutGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        padding: 20,
        justifyContent: 'center',
    },
    layoutCard: {
        width: '45%',
        aspectRatio: 1.4,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 16,
        borderWidth: 1,
        gap: 8,
    },
    layoutName: {
        fontFamily: 'Inter-Bold',
        fontSize: 14,
        fontWeight: '600',
    },
    clearBoardBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginHorizontal: 20,
        marginTop: 4,
        marginBottom: 8,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 16,
        borderWidth: 1,
    },
    clearBoardIconWrap: {
        width: 36,
        height: 36,
        borderRadius: 10,
        alignItems: 'center',
        justifyContent: 'center',
    },
    clearBoardText: {
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        fontWeight: '600',
    },
    clearBoardSub: {
        fontFamily: 'Inter-Bold',
        fontSize: 12,
        marginTop: 1,
    },

    // ── Image Browser Sheet ──
    imageBrowserSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: height * 0.88,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        overflow: 'hidden',
    },
    browserHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingBottom: 6,
        gap: 6,
    },
    browserBackBtn: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
    },
    browserSearchWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        borderRadius: 22,
        borderWidth: 1,
        paddingHorizontal: 14,
        paddingVertical: 10,
        gap: 8,
    },
    browserSearchInput: {
        flex: 1,
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        padding: 0,
    },
    browserDrillHint: {
        fontFamily: 'Inter-Bold',
        fontSize: 11,
        opacity: 0.6,
    },
    browserDrillTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 22,
        lineHeight: 26,
    },
    // Category cards grid
    catCardsGrid: {
        paddingHorizontal: 8,
        paddingTop: 4,
        paddingBottom: 32,
    },
    catCardsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    catCard: {
        width: CAT_CARD_W,
        height: CAT_CARD_H,
        borderRadius: 14,
        overflow: 'hidden',
    },
    catCardImg: {
        width: '100%',
        height: '100%',
    },
    catCardOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 10,
        paddingHorizontal: 12,
        backgroundColor: 'rgba(0,0,0,0.38)',
    },
    catCardLabel: {
        color: '#FFF',
        fontFamily: 'Inter-Bold',
        fontSize: 20,
    },
    // Photo grid
    browserGrid: {
        paddingHorizontal: 3,
        paddingBottom: 40,
    },
    browserTile: {
        width: TILE_SIZE,
        height: TILE_SIZE,
        margin: 2,
        borderRadius: 8,
        overflow: 'hidden',
    },
    browserTileImg: {
        width: TILE_SIZE,
        height: TILE_SIZE,
    },
    addedOverlay: {
        position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: BLACK + '55',
        alignItems: 'center', justifyContent: 'center',
    },
    browserCenterMsg: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
        gap: 12,
    },

    // ── Affirmation Sheet ──
    sheetContainer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 132 : 108,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 12,
    },
    sheetHandle: {
        alignItems: 'center',
        paddingTop: 12,
        paddingBottom: 4,
    },
    sheetHandleBar: {
        width: 36,
        height: 4,
        borderRadius: 2,
    },
    sheetHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        paddingHorizontal: 24,
        paddingTop: 12,
        paddingBottom: 8,
    },
    sheetTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 24,
    },
    sheetSubtitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        marginTop: 2,
    },
    sheetClose: {
        width: 36,
        height: 36,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 4,
    },
    templateScroll: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    templateChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 14,
        paddingVertical: 10,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
    },
    templateText: {
        fontFamily: 'Inter-Bold',
        fontSize: 13,
        maxWidth: 180,
    },
    sheetInputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginHorizontal: 20,
        marginTop: 8,
        borderRadius: 18,
        borderWidth: 1,
        paddingRight: 6,
    },
    sheetInput: {
        flex: 1,
        fontFamily: 'Inter-Bold',
        fontSize: 15,
        paddingHorizontal: 16,
        paddingVertical: 12,
        minHeight: 48,
    },
    sheetSendBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // ── Delete Dialog ──
    dialogOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 200,
    },
    dialogCard: {
        width: width * 0.78,
        borderRadius: 24,
        padding: 28,
        alignItems: 'center',
        gap: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.12,
        shadowRadius: 24,
        elevation: 12,
    },
    dialogTitle: {
        fontFamily: 'Inter-Bold',
        fontSize: 20,
        marginTop: 4,
        letterSpacing: 0.2,
    },
    dialogBody: {
        fontFamily: 'Inter-Medium',
        fontSize: 14,
        textAlign: 'center',
        lineHeight: 20,
    },
    dialogActions: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 12,
        width: '100%',
    },
    dialogBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 16,
        alignItems: 'center',
    },
    dialogBtnText: {
        fontFamily: 'Inter-SemiBold',
        fontSize: 15,
        letterSpacing: 0.2,
    },
    clearDialogIconBadge: {
        width: 64,
        height: 64,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    clearDialogDivider: {
        width: '100%',
        height: 1,
        marginVertical: 8,
    },

    // ── Text Style Sheet ──
    textStyleSheet: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingBottom: Platform.OS === 'ios' ? 36 : 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 20,
        elevation: 12,
        zIndex: 201,
    },
    textStyleSection: {
        paddingTop: 6,
        paddingBottom: 10,
    },
    textStyleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 20,
    },
    fontPill: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 11,
        borderRadius: 20,
    },
    colorSwatch: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    bgChip: {
        flex: 1,
        height: 48,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
    },
    bgChipLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 11,
        fontWeight: '600',
    },

    // ── Board Background Picker (inside LayoutSheet) ──
    bgPickerRow: {
        paddingHorizontal: 20,
        paddingBottom: 12,
        gap: 8,
    },
    bgPickerLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 0.8,
    },
    bgPickerScroll: {
        gap: 8,
        paddingVertical: 4,
    },
    boardBgChip: {
        width: 60,
        height: 44,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    boardBgChipLabel: {
        fontFamily: 'Inter-Bold',
        fontSize: 10,
        fontWeight: '600',
    },
});

export default VisionBoardScreen;
