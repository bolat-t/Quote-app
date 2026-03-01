import React from 'react';
import Svg, { Path, Circle, Rect } from 'react-native-svg';

const viewBox = '0 0 24 24';

interface TabIconProps {
    color: string;
    size?: number;
}

/** Home — clean house outline */
export const TabHomeIcon: React.FC<TabIconProps> = ({ color, size: s = 24 }) => (
    <Svg width={s} height={s} viewBox={viewBox} fill="none">
        <Path
            d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M9 21V14h6v7"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/** Canvas — clean brush/pen */
export const TabCanvasIcon: React.FC<TabIconProps> = ({ color, size: s = 24 }) => (
    <Svg width={s} height={s} viewBox={viewBox} fill="none">
        <Path
            d="M18.37 2.63a2.12 2.12 0 0 1 3 3L9 18l-5 1.5L5.5 14l12.87-11.37z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M15 5l4 4"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
        />
    </Svg>
);

/** Journal — pen + paper icon */
export const TabJournalIcon: React.FC<TabIconProps> = ({ color, size: s = 24 }) => (
    <Svg width={s} height={s} viewBox={viewBox} fill="none">
        <Path
            d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2V3z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path
            d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7V3z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/** History — clock icon */
export const TabHistoryIcon: React.FC<TabIconProps> = ({ color, size: s = 24 }) => (
    <Svg width={s} height={s} viewBox={viewBox} fill="none">
        <Circle
            cx="12"
            cy="12"
            r="9"
            stroke={color}
            strokeWidth={1.8}
        />
        <Path
            d="M12 7v5l3 3"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);

/** Vision — eye icon */
export const TabVisionIcon: React.FC<TabIconProps> = ({ color, size: s = 24 }) => (
    <Svg width={s} height={s} viewBox={viewBox} fill="none">
        <Path
            d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"
            stroke={color}
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Circle
            cx="12"
            cy="12"
            r="3"
            stroke={color}
            strokeWidth={1.8}
        />
    </Svg>
);
