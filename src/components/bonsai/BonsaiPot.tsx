import React, { memo } from 'react';
import { Path } from 'react-native-svg';
import { POT_RIM_PATH, POT_BODY_PATH, POT_SOIL_PATH } from './bonsaiPaths';
import { BonsaiColorPalette } from './bonsaiColors';

interface BonsaiPotProps {
    colors: BonsaiColorPalette;
    health: number;
}

const BonsaiPot: React.FC<BonsaiPotProps> = ({ colors, health }) => {
    const soilColor = health < 40 ? colors.potSoilDry : colors.potSoil;

    return (
        <>
            {/* Soil visible at top of pot */}
            <Path d={POT_SOIL_PATH} fill={soilColor} />
            {/* Pot rim */}
            <Path d={POT_RIM_PATH} fill={colors.potRim} />
            {/* Pot body */}
            <Path d={POT_BODY_PATH} fill={colors.potBody} />
            {/* Subtle left-edge highlight on pot body */}
            <Path
                d="M54 236 Q56 234 58 236 L60 264 Q58 267 56 264 Z"
                fill="#FFFFFF"
                opacity={0.14}
            />
        </>
    );
};

export default memo(BonsaiPot);
