import React from 'react';
import Svg, { Path as SvgPath, Circle as SvgCircle } from 'react-native-svg';

interface LevelIconProps {
    level: number;
    color: string;
    size?: number;
}

const sw = 1.8;
const cap = 'round' as const;
const join = 'round' as const;

export const LevelIcon: React.FC<LevelIconProps> = ({ level, color, size = 20 }) => {
    const p = { stroke: color, strokeWidth: sw, strokeLinecap: cap, strokeLinejoin: join, fill: 'none' as const };

    return (
        <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            {level === 1 && (
                // Seedling — single leaf emerging from stem
                <>
                    <SvgPath d="M12 22v-8" {...p} />
                    <SvgPath d="M12 14C8 14 5 10 5 6c5 0 7 3 7 8z" {...p} />
                </>
            )}
            {level === 2 && (
                // Sprout — two leaves on a stem
                <>
                    <SvgPath d="M12 22v-12" {...p} />
                    <SvgPath d="M12 16C8 16 5 13 5 9c4 0 7 3 7 7z" {...p} />
                    <SvgPath d="M12 12c4 0 7-3 7-7-4 0-7 3-7 7z" {...p} />
                </>
            )}
            {level === 3 && (
                // Sapling — young tree with branch pairs
                <>
                    <SvgPath d="M12 22v-16" {...p} />
                    <SvgPath d="M8 18l4-4 4 4" {...p} />
                    <SvgPath d="M6 13l6-5 6 5" {...p} />
                </>
            )}
            {level === 4 && (
                // Bloom — tulip flower on a stem
                <>
                    <SvgPath d="M12 22v-8" {...p} />
                    <SvgPath d="M9 14c0-4 1.5-8 3-10 1.5 2 3 6 3 10" {...p} />
                    <SvgPath d="M8 18c-3 0-5-2-5-4 3 0 5 2 5 4z" {...p} />
                    <SvgPath d="M16 18c3 0 5-2 5-4-3 0-5 2-5 4z" {...p} />
                </>
            )}
            {level === 5 && (
                // Oak — rounded canopy tree
                <>
                    <SvgPath d="M12 22v-6" {...p} />
                    <SvgCircle cx={12} cy={10} r={7} {...p} />
                </>
            )}
            {level === 6 && (
                // Sequoia — tall layered conifer
                <>
                    <SvgPath d="M12 22v-4" {...p} />
                    <SvgPath d="M12 3l-5 7h10z" {...p} />
                    <SvgPath d="M12 8l-6 8h12z" {...p} />
                </>
            )}
            {level === 7 && (
                // Forest — two trees side by side
                <>
                    <SvgPath d="M7 22v-4" {...p} />
                    <SvgCircle cx={7} cy={13} r={4.5} {...p} />
                    <SvgPath d="M17 22v-5" {...p} />
                    <SvgCircle cx={17} cy={11} r={5.5} {...p} />
                </>
            )}
            {level === 8 && (
                // Mountain — two peaks
                <>
                    <SvgPath d="M3 20l5-10 3 4 4-10 5 10.5" {...p} />
                    <SvgPath d="M20 20H3" {...p} />
                </>
            )}
            {level === 9 && (
                // Sky — sun with rays
                <>
                    <SvgCircle cx={12} cy={12} r={4} {...p} />
                    <SvgPath d="M12 2v4M12 18v4M2 12h4M18 12h4" {...p} />
                    <SvgPath d="M5.6 5.6l2.9 2.9M15.5 15.5l2.9 2.9M5.6 18.4l2.9-2.9M15.5 8.5l2.9-2.9" {...p} />
                </>
            )}
            {level >= 10 && (
                // Cosmos — four-pointed sparkle star
                <SvgPath
                    d="M12 3l1.9 5.8a2 2 0 001.3 1.3L21 12l-5.8 1.9a2 2 0 00-1.3 1.3L12 21l-1.9-5.8a2 2 0 00-1.3-1.3L3 12l5.8-1.9a2 2 0 001.3-1.3L12 3z"
                    {...p}
                />
            )}
        </Svg>
    );
};
