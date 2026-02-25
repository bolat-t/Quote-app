import React, { memo } from 'react';
import { Circle, G } from 'react-native-svg';
import { BLOSSOM_POSITIONS } from './bonsaiPaths';
import { BonsaiColorPalette } from './bonsaiColors';

interface BonsaiBlossomsProps {
    stage: number;
    colors: BonsaiColorPalette;
    effectiveCount: number;
    isGolden?: boolean;  // Stage 10 golden blossoms
}

const BonsaiBlossoms: React.FC<BonsaiBlossomsProps> = ({
    stage,
    colors,
    effectiveCount,
    isGolden = false,
}) => {
    const allBlossoms = BLOSSOM_POSITIONS[stage] || [];
    const visibleBlossoms = allBlossoms.slice(0, effectiveCount);

    const petalColor = isGolden ? colors.sparkle : colors.blossom;

    return (
        <>
            {visibleBlossoms.map((blossom, i) => (
                <G key={`blossom-${i}`}>
                    {/* 5 petals arranged in a circle */}
                    {[0, 72, 144, 216, 288].map((angle, j) => {
                        const rad = (angle * Math.PI) / 180;
                        const px = blossom.x + Math.cos(rad) * blossom.size * 0.5;
                        const py = blossom.y + Math.sin(rad) * blossom.size * 0.5;
                        return (
                            <Circle
                                key={`petal-${i}-${j}`}
                                cx={px}
                                cy={py}
                                r={blossom.size * 0.45}
                                fill={petalColor}
                                opacity={0.85}
                            />
                        );
                    })}
                    {/* Center */}
                    <Circle
                        cx={blossom.x}
                        cy={blossom.y}
                        r={blossom.size * 0.3}
                        fill={colors.blossomCenter}
                    />
                </G>
            ))}
        </>
    );
};

export default memo(BonsaiBlossoms);
