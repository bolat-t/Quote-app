
import React, { useMemo } from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import { Svg, Polyline, Line, Circle, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

const YELLOW = '#FFE600';
const BLACK  = '#000000';
const WHITE  = '#FFFFFF';

interface ProgressChartProps {
    data: { day: string; date: string; completed: boolean; isToday: boolean }[];
}

export const ProgressChart: React.FC<ProgressChartProps> = ({ data }) => {
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
        <View style={styles.container}>
            <Text style={styles.title}>Consistency Tracker</Text>
            <Svg width={chartWidth} height={chartHeight + 30}>
                {/* Grid lines */}
                <Line
                    x1={paddingLeft} y1={chartHeight - 10}
                    x2={chartWidth - paddingRight} y2={chartHeight - 10}
                    stroke="#D8D8D8"
                    strokeWidth={1.5}
                />
                <Line
                    x1={paddingLeft} y1={15}
                    x2={chartWidth - paddingRight} y2={15}
                    stroke="#D8D8D8"
                    strokeWidth={1}
                    strokeDasharray="4,4"
                />

                {/* Line */}
                <Polyline
                    points={polylineStr}
                    fill="none"
                    stroke={YELLOW}
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
                            r={p.isToday ? 7 : 5}
                            fill={p.completed ? YELLOW : '#CCCCCC'}
                            stroke={BLACK}
                            strokeWidth={p.isToday ? 2.5 : 1.5}
                        />
                        {p.isToday && p.completed && (
                            <Circle
                                cx={p.x}
                                cy={p.y}
                                r={10}
                                fill={YELLOW + '40'}
                            />
                        )}
                        <SvgText
                            x={p.x}
                            y={chartHeight + 20}
                            fontSize="13"
                            fontFamily="Carlito-Bold"
                            fill={p.isToday ? BLACK : '#777777'}
                            textAnchor="middle"
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
        alignItems: 'center',
        backgroundColor: WHITE,
        borderWidth: 2,
        borderColor: BLACK,
    },
    title: {
        fontFamily: 'MontserratAlternates-ExtraBoldItalic',
        fontSize: 20,
        marginBottom: 12,
        alignSelf: 'flex-start',
        color: BLACK,
    },
});
