import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';

const YELLOW = '#FFE600';
const BLACK = '#000000';
const WHITE = '#FFFFFF';

interface CategoryPickerProps {
    categories: string[];
    selected: string;
    onSelect: (category: string) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({ categories, selected, onSelect }) => {
    return (
        <View style={styles.categoryContainer}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.categoryScrollContent}
            >
                {categories.map((cat) => (
                    <TouchableOpacity
                        key={cat}
                        style={[
                            styles.categoryChip,
                            selected === cat && styles.categoryChipSelected
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onSelect(cat);
                        }}
                    >
                        <Text style={[
                            styles.categoryText,
                            { color: selected === cat ? BLACK : BLACK + '60' },
                            selected === cat && { fontFamily: 'MontserratAlternates-ExtraBoldItalic' }
                        ]}>
                            {cat}
                        </Text>
                    </TouchableOpacity>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    categoryContainer: {
        height: 40,
        marginBottom: 8,
    },
    categoryScrollContent: {
        paddingHorizontal: 16,
        alignItems: 'center',
        gap: 8,
    },
    categoryChip: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: 'transparent',
        backgroundColor: 'transparent',
    },
    categoryChipSelected: {
        backgroundColor: YELLOW,
        borderColor: BLACK,
    },
    categoryText: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 16,
    },
});
