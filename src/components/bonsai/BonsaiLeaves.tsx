import React, { memo } from 'react';
import { Circle, Ellipse, Path, G } from 'react-native-svg';
import { FOLIAGE_PAD_POSITIONS, BASE_LEAF_COUNT } from './bonsaiPaths';

interface BonsaiLeavesProps {
    stage: number;
    leafColor: string;
    effectiveCount: number;
    health: number;
}

// ─────────────────────────────────────────────────────────────
// Green canopy pad — organic foliage with leaf-tip spikes
// ─────────────────────────────────────────────────────────────
const GreenPad: React.FC<{
    cx: number; cy: number; r: number; leafColor: string; opacity: number;
}> = ({ cx, cy, r, leafColor, opacity }) => {
    // 6 leaf-tip teardrops poking out from perimeter at varied angles
    const leafTips = [20, 75, 135, 195, 255, 315].map(deg => {
        const rad = (deg * Math.PI) / 180;
        const edgeX = cx + r * Math.cos(rad);
        const edgeY = cy + r * Math.sin(rad);
        const tipX = cx + (r + r * 0.34) * Math.cos(rad);
        const tipY = cy + (r + r * 0.34) * Math.sin(rad);
        const perpRad = rad + Math.PI / 2;
        const w = r * 0.13;
        const wx = Math.cos(perpRad) * w;
        const wy = Math.sin(perpRad) * w;
        return (
            `M ${edgeX.toFixed(1)} ${edgeY.toFixed(1)} ` +
            `Q ${(tipX + wx).toFixed(1)} ${(tipY + wy).toFixed(1)} ` +
            `${tipX.toFixed(1)} ${tipY.toFixed(1)} ` +
            `Q ${(tipX - wx).toFixed(1)} ${(tipY - wy).toFixed(1)} ` +
            `${edgeX.toFixed(1)} ${edgeY.toFixed(1)} Z`
        );
    });

    return (
        <G opacity={opacity}>
            {/* Depth shadow */}
            <Circle cx={cx + r * 0.14} cy={cy + r * 0.15} r={r} fill="#1A3009" opacity={0.38} />
            {/* Dark green silhouette base */}
            <Circle cx={cx} cy={cy} r={r} fill="#2E5018" />
            {/* Main canopy colour */}
            <Circle cx={cx} cy={cy} r={r * 0.88} fill={leafColor} />
            {/* Leaf-tip spikes around perimeter */}
            {leafTips.map((d, i) => (
                <Path key={i} d={d} fill="#234010" opacity={0.72} />
            ))}
            {/* Inner lighter sub-mass for volume */}
            <Circle cx={cx - r * 0.12} cy={cy - r * 0.1} r={r * 0.52} fill={leafColor} opacity={0.48} />
            {/* Top-left highlight glow */}
            <Ellipse
                cx={cx - r * 0.24} cy={cy - r * 0.25}
                rx={r * 0.42} ry={r * 0.3}
                fill="#C8E6C9" opacity={0.36}
            />
        </G>
    );
};

// ─────────────────────────────────────────────────────────────
// Cherry blossom pad — clustered 5-petal flowers
// ─────────────────────────────────────────────────────────────
const CherryPad: React.FC<{
    cx: number; cy: number; r: number; opacity: number;
}> = ({ cx, cy, r, opacity }) => {
    const petalOffset = r * 0.36;
    const petals = [0, 72, 144, 216, 288].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return {
            px: cx + petalOffset * Math.cos(rad),
            py: cy + petalOffset * Math.sin(rad),
            angle: deg,
        };
    });

    // Satellite mini blossoms near edge for a clustered look
    const satellites = [40, 160, 280].map(deg => {
        const rad = (deg * Math.PI) / 180;
        return {
            sx: cx + (r * 0.8) * Math.cos(rad),
            sy: cy + (r * 0.8) * Math.sin(rad),
        };
    });

    return (
        <G opacity={opacity}>
            {/* Deep shadow */}
            <Circle cx={cx + r * 0.13} cy={cy + r * 0.15} r={r} fill="#7A1030" opacity={0.32} />
            {/* Dark pink base mass */}
            <Circle cx={cx} cy={cy} r={r} fill="#C85070" />
            {/* Mid-pink canopy */}
            <Circle cx={cx} cy={cy} r={r * 0.88} fill="#F08090" />
            {/* 5 petals fanning out */}
            {petals.map(({ px, py, angle }, i) => (
                <Ellipse
                    key={i}
                    cx={px} cy={py}
                    rx={r * 0.3} ry={r * 0.19}
                    fill="#FDDDE6"
                    opacity={0.9}
                    transform={`rotate(${angle}, ${px}, ${py})`}
                />
            ))}
            {/* Stamen — gold outer ring + amber dot */}
            <Circle cx={cx} cy={cy} r={r * 0.18} fill="#FFD166" opacity={0.95} />
            <Circle cx={cx} cy={cy} r={r * 0.09} fill="#F59E0B" opacity={1} />
            {/* Satellite blossoms near edge */}
            {satellites.map(({ sx, sy }, i) => (
                <G key={i}>
                    <Circle cx={sx} cy={sy} r={r * 0.18} fill="#FDDDE6" opacity={0.75} />
                    <Circle cx={sx} cy={sy} r={r * 0.07} fill="#FFD166" opacity={0.9} />
                </G>
            ))}
            {/* Top-left highlight */}
            <Ellipse
                cx={cx - r * 0.2} cy={cy - r * 0.22}
                rx={r * 0.4} ry={r * 0.28}
                fill="#FFE8EF" opacity={0.42}
            />
        </G>
    );
};

// ─────────────────────────────────────────────────────────────
// Wisteria grape cluster pad — hanging grape bunches
// ─────────────────────────────────────────────────────────────
const WisteriaPad: React.FC<{
    cx: number; cy: number; r: number; opacity: number;
}> = ({ cx, cy, r, opacity }) => {
    const gr = r * 0.25;   // grape radius
    const gs = gr * 2.08;  // grape spacing

    // Triangle grape arrangement: wide top → narrow tip
    const topY = cy - r * 0.1;
    const grapes = [
        // Row 1 (widest): 3 grapes
        { x: cx - gs,      y: topY,          r: gr * 1.0  },
        { x: cx,           y: topY - gr * 0.35, r: gr * 1.0  },
        { x: cx + gs,      y: topY,          r: gr * 1.0  },
        // Row 2: 2 grapes
        { x: cx - gs * 0.5, y: topY + gs,    r: gr * 0.88 },
        { x: cx + gs * 0.5, y: topY + gs,    r: gr * 0.88 },
        // Row 3: 2 grapes
        { x: cx - gs * 0.5, y: topY + gs * 2, r: gr * 0.75 },
        { x: cx + gs * 0.5, y: topY + gs * 2, r: gr * 0.75 },
        // Drip tip: 1
        { x: cx,            y: topY + gs * 3.1, r: gr * 0.56 },
    ];

    return (
        <G opacity={opacity}>
            {/* Shadow */}
            <Circle cx={cx + r * 0.13} cy={cy + r * 0.15} r={r} fill="#2A0B6A" opacity={0.34} />
            {/* Deep purple base cloud */}
            <Circle cx={cx} cy={cy} r={r} fill="#4C1D95" />
            <Circle cx={cx} cy={cy} r={r * 0.9} fill="#5B21B6" />
            {/* Individual grapes — 3-layer each: dark shell, main, highlight spot */}
            {grapes.map((g, i) => (
                <G key={i}>
                    <Circle cx={g.x} cy={g.y} r={g.r} fill="#3B0F8C" />
                    <Circle cx={g.x} cy={g.y} r={g.r * 0.84} fill="#7C3AED" />
                    <Circle
                        cx={g.x - g.r * 0.28} cy={g.y - g.r * 0.3}
                        r={g.r * 0.3} fill="#C4B5FD" opacity={0.62}
                    />
                </G>
            ))}
            {/* Two green leaves fanning out at top of cluster */}
            <Ellipse
                cx={cx - r * 0.4} cy={cy - r * 0.76}
                rx={r * 0.27} ry={r * 0.16}
                fill="#15803D" opacity={0.92}
                transform={`rotate(-30, ${cx - r * 0.4}, ${cy - r * 0.76})`}
            />
            <Ellipse
                cx={cx + r * 0.4} cy={cy - r * 0.76}
                rx={r * 0.27} ry={r * 0.16}
                fill="#15803D" opacity={0.92}
                transform={`rotate(30, ${cx + r * 0.4}, ${cy - r * 0.76})`}
            />
            {/* Soft highlight */}
            <Ellipse
                cx={cx - r * 0.18} cy={cy - r * 0.22}
                rx={r * 0.38} ry={r * 0.26}
                fill="#EDE9FE" opacity={0.32}
            />
        </G>
    );
};

// ─────────────────────────────────────────────────────────────
// Main BonsaiLeaves component
// ─────────────────────────────────────────────────────────────
const BonsaiLeaves: React.FC<BonsaiLeavesProps> = ({
    stage,
    leafColor,
    effectiveCount,
    health,
}) => {
    const pads = FOLIAGE_PAD_POSITIONS[stage] || [];
    const baseCount = BASE_LEAF_COUNT[stage] || 1;

    // Scale visible pads by health ratio
    const ratio = Math.max(0, Math.min(1, effectiveCount / baseCount));
    const padsToShow = Math.max(1, Math.ceil(ratio * pads.length));
    const visiblePads = pads.slice(0, padsToShow);

    // Overall opacity drops when health is low (wilting)
    const baseOpacity = health < 30 ? 0.52 : health < 60 ? 0.76 : 0.94;

    if (stage >= 9) {
        return (
            <>
                {visiblePads.map((pad, i) => (
                    <WisteriaPad
                        key={i}
                        cx={pad.x} cy={pad.y} r={pad.r}
                        opacity={baseOpacity}
                    />
                ))}
            </>
        );
    }

    if (stage >= 7) {
        return (
            <>
                {visiblePads.map((pad, i) => (
                    <CherryPad
                        key={i}
                        cx={pad.x} cy={pad.y} r={pad.r}
                        opacity={baseOpacity}
                    />
                ))}
            </>
        );
    }

    return (
        <>
            {visiblePads.map((pad, i) => (
                <GreenPad
                    key={i}
                    cx={pad.x} cy={pad.y} r={pad.r}
                    leafColor={leafColor}
                    opacity={baseOpacity}
                />
            ))}
        </>
    );
};

export default memo(BonsaiLeaves);
