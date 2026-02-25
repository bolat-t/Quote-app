
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';

const { width } = Dimensions.get('window');

interface ProgressChartProps {
    data: { day: string; date: string; completed: boolean; isToday: boolean }[];
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
    const { theme } = useTheme();
    const chartWidth = width - 80;
    const chartHeight = 80;
    const paddingLeft = 8;
    const paddingRight = 8;
    const usableWidth = chartWidth - paddingLeft - paddingRight;

    const pointSpacing = data.length > 1 ? usableWidth / (data.length - 1) : usableWidth;

    // Build polyline points
    const points = data.map((item, i) => {
        const x = paddingLeft + i * pointSpacing;
        const y = item.completed ? 15 : chartHeight - 10;
        return { x, y, ...item };
    });

    const polylineStr = points.map(p => `${p.x},${p.y}`).join(' ');

    return (
        <View style={[styles.container, { backgroundColor: theme.colors.surface }]}>
            <Text style={[styles.title, { color: theme.colors.text }]}>Consistency Tracker</Text>
            <Svg width={chartWidth} height={chartHeight + 30}>
                {/* Grid lines */}
                <Line
                    x1={paddingLeft} y1={chartHeight - 10}
                    x2={chartWidth - paddingRight} y2={chartHeight - 10}
                    stroke={theme.colors.text + '10'}
                    strokeWidth={1}
                />
                <Line
                    x1={paddingLeft} y1={15}
                    x2={chartWidth - paddingRight} y2={15}
                    stroke={theme.colors.text + '10'}
                    strokeWidth={1}
                    strokeDasharray="4,4"
                />

                {/* Line */}
                <Polyline
                    points={polylineStr}
                    fill="none"
                    stroke={theme.colors.primary}
                    strokeWidth={2.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {/* Dots */}
                {points.map((p, i) => (
                    <React.Fragment key={i}>
                        <Circle
                            cx={p.x}
                            cy={p.y}
                            r={p.isToday ? 6 : 4}
                            fill={p.completed ? theme.colors.primary : theme.colors.text + '20'}
                            stroke={p.isToday ? theme.colors.primary : 'none'}
                            strokeWidth={p.isToday ? 2 : 0}
                        />
                        {p.isToday && p.completed && (
                            <Circle
                                cx={p.x}
                                cy={p.y}
                                r={10}
                                fill={theme.colors.primary + '15'}
                            />
                        )}
                        <SvgText
                            x={p.x}
                            y={chartHeight + 18}
                            fontSize="11"
                            fontFamily="Carlito"
                            fill={p.isToday ? theme.colors.primary : theme.colors.text + '50'}
                            textAnchor="middle"
                            fontWeight={p.isToday ? 'bold' : 'normal'}
                        >
                            {p.day}
                        </SvgText>
                    </React.Fragment>
                ))}
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        borderRadius: 16,
        padding: 16,
        marginVertical: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.04,
        shadowRadius: 6,
        elevation: 1,
        alignItems: 'center',
    },
    title: {
        fontFamily: 'Caveat-Bold',
        fontSize: 20,
        marginBottom: 12,
        alignSelf: 'flex-start',
    },
});
