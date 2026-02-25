import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

interface ThemeToggleProps {
    size?: number;
}

export const ThemeToggle: React.FC<ThemeToggleProps> = ({ size = 28 }) => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme.mode === 'dark';
    const color = theme.colors.text;

    return (
        <TouchableOpacity
            onPress={toggleTheme}
            style={styles.container}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            activeOpacity={0.7}
        >
            <Svg width={size} height={size} viewBox="0 0 24 24">
                {isDark ? (
                    // Sun icon for dark mode (tap to switch to light)
                    <>
                        <Circle cx="12" cy="12" r="5" stroke={color} strokeWidth="2" fill="none" />
                        <Path
                            d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                            stroke={color}
                            strokeWidth="2"
                            strokeLinecap="round"
                        />
                    </>
                ) : (
                    // Moon icon for light mode (tap to switch to dark)
                    <Path
                        d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"
                        stroke={color}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}
            </Svg>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 8,
    },
});
