import React, { memo } from 'react';
import { Path } from 'react-native-svg';
import { BRANCH_PATHS } from './bonsaiPaths';
import { BonsaiColorPalette } from './bonsaiColors';

interface BonsaiBranchesProps {
    stage: number;
    colors: BonsaiColorPalette;
}

const BonsaiBranches: React.FC<BonsaiBranchesProps> = ({ stage, colors }) => {
    const branches = BRANCH_PATHS[stage] || [];

    return (
        <>
            {branches.map((branch, i) => (
                <Path
                    key={`branch-${i}`}
                    d={branch.d}
                    stroke={colors.branch}
                    strokeWidth={branch.width}
                    strokeLinecap="round"
                    fill="none"
                />
            ))}
        </>
    );
};

export default memo(BonsaiBranches);
