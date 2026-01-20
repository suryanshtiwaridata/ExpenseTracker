import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { PieChart } from 'react-native-gifted-charts';
import { useStore } from '../../store/useStore';

const Analytics = () => {
    const { expenses } = useStore();
    const [chartData, setChartData] = useState<any[]>([]);

    useEffect(() => {
        const categoryTotals: any = {};
        expenses.forEach((exp) => {
            categoryTotals[exp.category] = (categoryTotals[exp.category] || 0) + exp.amount;
        });

        const data = Object.keys(categoryTotals).map((cat, index) => ({
            value: categoryTotals[cat],
            label: cat,
            color: [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger][index % 5],
            text: cat,
        }));

        setChartData(data);
    }, [expenses]);

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Spending Breakdown</Text>

                {chartData.length > 0 ? (
                    <View style={styles.chartContainer}>
                        <PieChart
                            data={chartData}
                            donut
                            showGradient
                            sectionAutoFocus
                            radius={120}
                            innerRadius={80}
                            innerCircleColor={COLORS.background}
                            centerLabelComponent={() => (
                                <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                    <Text style={{ fontSize: 22, color: 'white', fontWeight: 'bold' }}>
                                        ₹{expenses.reduce((acc, curr) => acc + curr.amount, 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                    </Text>
                                    <Text style={{ fontSize: 14, color: 'white' }}>Total</Text>
                                </View>
                            )}
                        />
                        <View style={styles.legend}>
                            {chartData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={[styles.dot, { backgroundColor: item.color }]} />
                                    <Text style={styles.legendText}>{item.label}: ₹{item.value.toLocaleString('en-IN', { maximumFractionDigits: 0 })}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <Text style={styles.placeholderText}>No data to display yet</Text>
                )}
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 20,
        alignItems: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 30,
        alignSelf: 'flex-start',
    },
    chartContainer: {
        alignItems: 'center',
        width: '100%',
    },
    legend: {
        marginTop: 30,
        width: '100%',
        padding: 20,
        backgroundColor: COLORS.surface,
        borderRadius: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    legendText: {
        color: COLORS.text,
        fontSize: 14,
    },
    placeholderText: {
        color: COLORS.textSecondary,
        marginTop: 100,
    },
});

export default Analytics;
