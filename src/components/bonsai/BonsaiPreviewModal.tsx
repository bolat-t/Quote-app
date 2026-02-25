import React, { useState, memo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    Modal,
    TouchableOpacity,
    ScrollView,
    Dimensions,
} from 'react-native';
import { Svg, Path } from 'react-native-svg';
import { useTheme } from '../../context/ThemeContext';
import { LEVEL_TIERS } from '../../data/progressionConfig';
import { getBonsaiColors, getLeafColor } from './bonsaiColors';
import {
    TRUNK_PATHS, TRUNK_WIDTH, BRANCH_PATHS,
    LEAF_POSITIONS, BLOSSOM_POSITIONS, BASE_LEAF_COUNT, BASE_BLOSSOM_COUNT,
    POT_RIM_PATH, POT_BODY_PATH, POT_SOIL_PATH,
    COMPANION_STEM, COMPANION_LEAVES, STONE_PATHS, SPARKLE_POSITIONS,
    LeafData,
} from './bonsaiPaths';
import BonsaiPot from './BonsaiPot';
import BonsaiTrunk from './BonsaiTrunk';
import BonsaiBranches from './BonsaiBranches';
import BonsaiLeaves from './BonsaiLeaves';
import BonsaiBlossoms from './BonsaiBlossoms';
import SvgComponent, { G, Circle, Defs, RadialGradient, Stop } from 'react-native-svg';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const PREVIEW_SIZE = (SCREEN_WIDTH - 64) / 2; // 2 columns with padding

interface BonsaiPreviewModalProps {
    visible: boolean;
    onClose: () => void;
}

/** Static mini bonsai for preview grid (no animations) */
const MiniBonsai: React.FC<{ stage: number; isDark: boolean }> = memo(({ stage, isDark }) => {
    const colors = getBonsaiColors(isDark);
    const leafColor = getLeafColor(isDark, 100); // full health for preview
    const leafCount = BASE_LEAF_COUNT[stage] || 2;
    const blossomCount = BASE_BLOSSOM_COUNT[stage] || 0;
    const tier = LEVEL_TIERS.find(t => t.level === stage);

    return (
        <View style={previewStyles.miniCard}>
            <SvgComponent
                width={PREVIEW_SIZE - 24}
                height={PREVIEW_SIZE - 24}
                viewBox="0 0 200 280"
            >
                {/* Glow */}
                <Defs>
                    <RadialGradient id={`glow-${stage}`} cx="100" cy="140" rx="60" ry="60">
                        <Stop offset="0" stopColor={isDark ? '#6EE7B7' : '#4ECCA3'} stopOpacity="0.08" />
                        <Stop offset="1" stopColor={isDark ? '#6EE7B7' : '#4ECCA3'} stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {stage >= 4 && (
                    <Circle cx={100} cy={140} r={60} fill={`url(#glow-${stage})`} />
                )}

                {/* Stones (stage 8+) */}
                {stage >= 8 && STONE_PATHS.map((d, i) => (
                    <Path key={`s-${i}`} d={d} fill={colors.stone} opacity={0.7} />
                ))}

                {/* Pot */}
                <BonsaiPot colors={colors} health={100} />

                {/* Companion (stage 7+) */}
                {stage >= 7 && (
                    <>
                        <Path d={COMPANION_STEM} stroke={colors.trunk} strokeWidth={1.5} strokeLinecap="round" fill="none" />
                        {COMPANION_LEAVES.map((leaf, i) => (
                            <G key={`cl-${i}`} transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rotation}) scale(${leaf.scale})`}>
                                <Path d="M0 0 Q4 -3 8 0 Q4 3 0 0 Z" fill={leafColor} opacity={0.8} />
                            </G>
                        ))}
                    </>
                )}

                {/* Trunk */}
                <BonsaiTrunk stage={stage} colors={colors} />

                {/* Branches */}
                <BonsaiBranches stage={stage} colors={colors} />

                {/* Leaves */}
                <BonsaiLeaves
                    stage={stage}
                    leafColor={leafColor}
                    effectiveCount={leafCount}
                    health={100}
                />

                {/* Blossoms */}
                {blossomCount > 0 && (
                    <BonsaiBlossoms
                        stage={stage}
                        colors={colors}
                        effectiveCount={blossomCount}
                        isGolden={stage >= 10}
                    />
                )}

                {/* Clouds (stage 9+) */}
                {stage >= 9 && (
                    <>
                        <Path d="M30 100 Q45 94 60 98 Q75 92 85 96" stroke={colors.cloud} strokeWidth={1.5} fill="none" opacity={0.3} strokeLinecap="round" />
                        <Path d="M115 95 Q130 88 145 92 Q160 86 170 90" stroke={colors.cloud} strokeWidth={1.2} fill="none" opacity={0.25} strokeLinecap="round" />
                    </>
                )}

                {/* Sparkles (stage 10) */}
                {stage >= 10 && SPARKLE_POSITIONS.map((pos, i) => (
                    <Circle key={`sp-${i}`} cx={pos.x} cy={pos.y} r={1.5} fill={colors.sparkle} opacity={0.6} />
                ))}
            </SvgComponent>

            <Text style={[previewStyles.stageLabel, { color: isDark ? '#E2E8F0' : '#1A1D23' }]}>
                Lv {stage} — {tier?.title}
            </Text>
        </View>
    );
});

export const BonsaiPreviewModal: React.FC<BonsaiPreviewModalProps> = ({ visible, onClose }) => {
    const { theme, isDark } = useTheme();
    const { colors } = theme;
    const [selectedStage, setSelectedStage] = useState<number | null>(null);

    return (
        <Modal animationType="slide" transparent={false} visible={visible} onRequestClose={onClose}>
            <View style={[previewStyles.container, { backgroundColor: colors.background }]}>
                {/* Header */}
                <View style={[previewStyles.header, { borderBottomColor: colors.outline + '20' }]}>
                    <Text style={[previewStyles.title, { color: colors.onSurface }]}>Bonsai Growth Stages</Text>
                    <TouchableOpacity onPress={onClose} style={previewStyles.closeBtn}>
                        <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                            <Path d="M18 6L6 18M6 6L18 18" stroke={colors.onSurface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                        </Svg>
                    </TouchableOpacity>
                </View>

                {/* Selected stage full view */}
                {selectedStage && (
                    <View style={[previewStyles.selectedSection, { backgroundColor: colors.surface, borderColor: colors.outline + '20' }]}>
                        <SvgComponent
                            width={SCREEN_WIDTH - 80}
                            height={280}
                            viewBox="0 0 200 280"
                        >
                            <Defs>
                                <RadialGradient id="glow-selected" cx="100" cy="140" rx="60" ry="60">
                                    <Stop offset="0" stopColor={isDark ? '#6EE7B7' : '#4ECCA3'} stopOpacity="0.08" />
                                    <Stop offset="1" stopColor={isDark ? '#6EE7B7' : '#4ECCA3'} stopOpacity="0" />
                                </RadialGradient>
                            </Defs>

                            {selectedStage >= 4 && (
                                <Circle cx={100} cy={140} r={60} fill="url(#glow-selected)" />
                            )}

                            {selectedStage >= 8 && STONE_PATHS.map((d, i) => (
                                <Path key={`ss-${i}`} d={d} fill={getBonsaiColors(isDark).stone} opacity={0.7} />
                            ))}

                            <BonsaiPot colors={getBonsaiColors(isDark)} health={100} />

                            {selectedStage >= 7 && (
                                <>
                                    <Path d={COMPANION_STEM} stroke={getBonsaiColors(isDark).trunk} strokeWidth={1.5} strokeLinecap="round" fill="none" />
                                    {COMPANION_LEAVES.map((leaf, i) => (
                                        <G key={`scl-${i}`} transform={`translate(${leaf.x}, ${leaf.y}) rotate(${leaf.rotation}) scale(${leaf.scale})`}>
                                            <Path d="M0 0 Q4 -3 8 0 Q4 3 0 0 Z" fill={getLeafColor(isDark, 100)} opacity={0.8} />
                                        </G>
                                    ))}
                                </>
                            )}

                            <BonsaiTrunk stage={selectedStage} colors={getBonsaiColors(isDark)} />
                            <BonsaiBranches stage={selectedStage} colors={getBonsaiColors(isDark)} />
                            <BonsaiLeaves stage={selectedStage} leafColor={getLeafColor(isDark, 100)} effectiveCount={BASE_LEAF_COUNT[selectedStage]} health={100} />
                            {BASE_BLOSSOM_COUNT[selectedStage] > 0 && (
                                <BonsaiBlossoms stage={selectedStage} colors={getBonsaiColors(isDark)} effectiveCount={BASE_BLOSSOM_COUNT[selectedStage]} isGolden={selectedStage >= 10} />
                            )}

                            {selectedStage >= 9 && (
                                <>
                                    <Path d="M30 100 Q45 94 60 98 Q75 92 85 96" stroke={getBonsaiColors(isDark).cloud} strokeWidth={1.5} fill="none" opacity={0.3} strokeLinecap="round" />
                                    <Path d="M115 95 Q130 88 145 92 Q160 86 170 90" stroke={getBonsaiColors(isDark).cloud} strokeWidth={1.2} fill="none" opacity={0.25} strokeLinecap="round" />
                                </>
                            )}

                            {selectedStage >= 10 && SPARKLE_POSITIONS.map((pos, i) => (
                                <Circle key={`ssp-${i}`} cx={pos.x} cy={pos.y} r={1.5} fill={getBonsaiColors(isDark).sparkle} opacity={0.6} />
                            ))}
                        </SvgComponent>

                        <Text style={[previewStyles.selectedTitle, { color: colors.onSurface }]}>
                            Lv {selectedStage} — {LEVEL_TIERS.find(t => t.level === selectedStage)?.title}
                        </Text>
                        <Text style={[previewStyles.selectedSub, { color: colors.onSurfaceVariant }]}>
                            {BASE_LEAF_COUNT[selectedStage]} leaves · {BASE_BLOSSOM_COUNT[selectedStage]} blossoms · {LEVEL_TIERS.find(t => t.level === selectedStage)?.unlocks}
                        </Text>

                        <TouchableOpacity onPress={() => setSelectedStage(null)} style={[previewStyles.backBtn, { backgroundColor: colors.primaryContainer }]}>
                            <Text style={[previewStyles.backBtnText, { color: colors.onPrimaryContainer }]}>Back to Grid</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* Grid of all stages */}
                {!selectedStage && (
                    <ScrollView contentContainerStyle={previewStyles.grid} showsVerticalScrollIndicator={false}>
                        {Array.from({ length: 10 }, (_, i) => i + 1).map(stage => (
                            <TouchableOpacity key={stage} activeOpacity={0.7} onPress={() => setSelectedStage(stage)}>
                                <MiniBonsai stage={stage} isDark={isDark} />
                            </TouchableOpacity>
                        ))}
                        <View style={{ height: 40 }} />
                    </ScrollView>
                )}
            </View>
        </Modal>
    );
};

const previewStyles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 56,
        paddingBottom: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 28,
    },
    closeBtn: {
        padding: 8,
    },
    grid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        padding: 12,
        gap: 12,
    },
    miniCard: {
        width: PREVIEW_SIZE,
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 4,
    },
    stageLabel: {
        fontFamily: 'Caveat-Bold',
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
    },
    selectedSection: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        margin: 16,
        borderRadius: 20,
        borderWidth: 1,
    },
    selectedTitle: {
        fontFamily: 'Caveat-Bold',
        fontSize: 24,
        marginTop: 12,
    },
    selectedSub: {
        fontFamily: 'Carlito',
        fontSize: 14,
        marginTop: 4,
        textAlign: 'center',
    },
    backBtn: {
        marginTop: 20,
        paddingHorizontal: 24,
        paddingVertical: 10,
        borderRadius: 12,
    },
    backBtnText: {
        fontFamily: 'Carlito',
        fontSize: 15,
        fontWeight: '600',
    },
});
