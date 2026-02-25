import React, { memo } from 'react';
import { Path } from 'react-native-svg';
import { TRUNK_PATHS, TRUNK_WIDTH } from './bonsaiPaths';
import { BonsaiColorPalette } from './bonsaiColors';

interface BonsaiTrunkProps {
    stage: number;
    colors: BonsaiColorPalette;
}

const BonsaiTrunk: React.FC<BonsaiTrunkProps> = ({ stage, colors }) => {
    const path = TRUNK_PATHS[stage] || TRUNK_PATHS[1];
    const width = TRUNK_WIDTH[stage] || 2;

    return (
        <>
            {/* Main trunk */}
            <Path
                d={path}
                stroke={colors.trunk}
                strokeWidth={width}
                strokeLinecap="round"
                fill="none"
            />
            {/* Bark texture — subtle darker dashes for stage 5+ */}
            {stage >= 5 && (
                <Path
                    d={path}
                    stroke={colors.trunkDark}
                    strokeWidth={width * 0.3}
                    strokeLinecap="round"
                    strokeDasharray="3,6"
                    fill="none"
                    opacity={0.4}
                />
            )}
            {/* Driftwood / white-wood highlight — visible twist in the bark (stage 3+) */}
            {stage >= 3 && (
                <Path
                    d={path}
                    stroke="rgba(255,255,255,0.55)"
                    strokeWidth={width * 0.22}
                    strokeLinecap="round"
                    strokeDasharray={`${width * 0.8},${width * 2.2}`}
                    fill="none"
                />
            )}
        </>
    );
};

export default memo(BonsaiTrunk);
