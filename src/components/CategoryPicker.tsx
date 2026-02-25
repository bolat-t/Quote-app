import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useTheme } from '../context/ThemeContext';

interface CategoryPickerProps {
    categories: string[];
    selected: string;
    onSelect: (category: string) => void;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({ categories, selected, onSelect }) => {
    const { theme } = useTheme();
    const colors = theme.colors;

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
                            selected === cat && { backgroundColor: colors.primaryContainer, borderColor: colors.primary }
                        ]}
                        onPress={() => {
                            Haptics.selectionAsync();
                            onSelect(cat);
                        }}
                    >
                        <Text style={[
                            styles.categoryText,
                            { color: selected === cat ? colors.onSurface : colors.onSurface + '60' },
                            selected === cat && { fontFamily: 'Caveat-Bold' }
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
        borderWidth: 1,
        borderColor: 'transparent',
    },
    categoryText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 16,
    },
});
