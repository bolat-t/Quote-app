import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { Modal, Portal, Button } from 'react-native-paper';
import { PAPER_TYPES, LEVEL_TIERS, getLevelForXP } from '../data/progressionConfig';

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

interface PaperSelectorProps {
    visible: boolean;
    onDismiss: () => void;
    currentPaper: string;
    onSelectPaper: (paperId: string) => void;
    userXP: number;
}

export const PaperSelector: React.FC<PaperSelectorProps> = ({
    visible,
    onDismiss,
    currentPaper,
    onSelectPaper,
    userXP,
}) => {
    const currentLevel = getLevelForXP(userXP);

    const papers = Object.values(PAPER_TYPES).sort((a, b) => a.levelRequired - b.levelRequired);

    return (
        <Portal>
            <Modal visible={visible} onDismiss={onDismiss} contentContainerStyle={styles.modalContent}>
                <Text style={styles.title}>Choose Your Paper</Text>
                <Text style={styles.subtitle}>Unlock new styles as you level up!</Text>

                <ScrollView contentContainerStyle={styles.scrollContent} horizontal={true} showsHorizontalScrollIndicator={false}>
                    {papers.map((paper) => {
                        const isLocked = currentLevel.level < paper.levelRequired;
                        const isSelected = currentPaper === paper.id;

                        return (
                            <TouchableOpacity
                                key={paper.id}
                                onPress={() => !isLocked && onSelectPaper(paper.id)}
                                style={[
                                    styles.paperOption,
                                    { borderColor: isSelected ? BLACK : BLACK + '25', opacity: isLocked ? 0.6 : 1 },
                                    isSelected && { backgroundColor: YELLOW },
                                ]}
                            >
                                <View style={[styles.previewInfo, { backgroundColor: (paper as any).color || '#FFF' }]}>
                                    {isLocked && (
                                        <View style={styles.lockOverlay}>
                                            <Text style={styles.lockText}>🔒 Lvl {paper.levelRequired}</Text>
                                        </View>
                                    )}
                                    {(paper as any).pattern === 'grid' && <View style={styles.gridPattern} />}
                                    {(paper as any).pattern === 'dots' && <View style={styles.dotsPattern} />}
                                    {(paper as any).pattern === 'lines' && <View style={styles.linesPattern} />}
                                    {(paper as any).pattern === 'stars' && <View style={styles.starsPattern} />}
                                </View>
                                <Text style={styles.paperName}>{paper.name}</Text>
                            </TouchableOpacity>
                        );
                    })}
                </ScrollView>

                <Button mode="contained" onPress={onDismiss} style={styles.closeButton}>
                    Close
                </Button>
            </Modal>
        </Portal>
    );
};

const styles = StyleSheet.create({
    modalContent: {
        margin: 20,
        padding: 24,
        borderRadius: 16,
        alignItems: 'center',
        backgroundColor: WHITE,
        borderWidth: 2.5,
        borderColor: BLACK,
    },
    title: {
        fontFamily: 'GasoekOne',
        fontSize: 28,
        marginBottom: 8,
        color: BLACK,
    },
    subtitle: {
        fontFamily: 'GasoekOne',
        fontSize: 16,
        marginBottom: 24,
        opacity: 0.7,
        color: BLACK,
    },
    scrollContent: {
        paddingVertical: 10,
        gap: 16,
    },
    paperOption: {
        width: 100,
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 2,
        borderRadius: 12,
        padding: 8,
    },
    previewInfo: {
        width: 80,
        height: 100,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#ddd',
        marginBottom: 8,
        overflow: 'hidden',
        justifyContent: 'center',
        alignItems: 'center',
    },
    paperName: {
        fontFamily: 'GasoekOne',
        fontSize: 14,
        textAlign: 'center',
        color: BLACK,
    },
    lockOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 10,
    },
    lockText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 12,
    },
    closeButton: {
        marginTop: 24,
        width: '100%',
    },
    // Simple CSS-like patterns for preview
    gridPattern: {
        ...StyleSheet.absoluteFillObject,
        borderWidth: 1,
        borderColor: '#ccc',
        borderStyle: 'dashed', // Approximation
    },
    dotsPattern: {
        // Hard to do pure CSS dots in RN simply without SVG, leave as placeholder color for now or use image
    },
    linesPattern: {
        // Placeholder
    },
    starsPattern: {
        backgroundColor: '#0F172A',
    }
});
