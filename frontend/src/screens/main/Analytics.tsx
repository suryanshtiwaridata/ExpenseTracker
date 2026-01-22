import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { PieChart } from 'react-native-gifted-charts';
import { useStore } from '../../store/useStore';

const Analytics = () => {
    const { expenses } = useStore();
    const [chartData, setChartData] = useState<any[]>([]);
    const [groupBy, setGroupBy] = useState<'category' | 'month' | 'mode'>('category');

    useEffect(() => {
        const groups: any = {};

        expenses.forEach((exp) => {
            let key = '';
            if (groupBy === 'category') {
                key = exp.category;
            } else if (groupBy === 'month') {
                key = new Date(exp.date).toLocaleString('default', { month: 'short', year: '2-digit' });
            } else if (groupBy === 'mode') {
                key = (exp.payment_mode || 'Manual').charAt(0).toUpperCase() + (exp.payment_mode || 'Manual').slice(1);
            }

            groups[key] = (groups[key] || 0) + exp.amount;
        });

        const data = Object.keys(groups).map((key, index) => ({
            value: groups[key],
            label: key,
            color: [COLORS.primary, COLORS.secondary, COLORS.success, COLORS.warning, COLORS.danger][index % 5],
            text: key,
        }));

        setChartData(data);
    }, [expenses, groupBy]);

    const totalSpent = expenses.reduce((acc, curr) => acc + curr.amount, 0);

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>Analytics</Text>
                <Text style={styles.subtitle}>Where is your money going?</Text>
            </View>

            <View style={styles.filterContainer}>
                {(['category', 'month', 'mode'] as const).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[styles.filterButton, groupBy === filter && styles.filterButtonActive]}
                        onPress={() => setGroupBy(filter)}
                    >
                        <Text style={[styles.filterText, groupBy === filter && styles.filterTextActive]}>
                            By {filter.charAt(0).toUpperCase() + filter.slice(1)}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {chartData.length > 0 ? (
                    <View style={styles.chartSection}>
                        <View style={styles.chartWrapper}>
                            <PieChart
                                data={chartData}
                                donut
                                showGradient
                                sectionAutoFocus
                                radius={110}
                                innerRadius={70}
                                innerCircleColor={COLORS.background}
                                centerLabelComponent={() => (
                                    <View style={{ justifyContent: 'center', alignItems: 'center' }}>
                                        <Text style={{ fontSize: 20, color: 'white', fontWeight: 'bold' }}>
                                            ₹{totalSpent.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                                        </Text>
                                        <Text style={{ fontSize: 10, color: COLORS.textSecondary }}>Total Spent</Text>
                                    </View>
                                )}
                            />
                        </View>

                        <Text style={styles.sectionLabel}>
                            {groupBy === 'category' ? 'Category' : groupBy === 'month' ? 'Monthly' : 'Payment'} Breakdown
                        </Text>
                        <View style={styles.legend}>
                            {chartData.map((item, index) => (
                                <View key={index} style={styles.legendItem}>
                                    <View style={styles.legendLeft}>
                                        <View style={[styles.dot, { backgroundColor: item.color }]} />
                                        <Text style={styles.legendLabel}>{item.label}</Text>
                                    </View>
                                    <View style={styles.legendRight}>
                                        <Text style={styles.legendValue}>₹{item.value.toLocaleString()}</Text>
                                        <Text style={styles.legendPercentage}>
                                            {((item.value / totalSpent) * 100).toFixed(1)}%
                                        </Text>
                                    </View>
                                </View>
                            ))}
                        </View>
                    </View>
                ) : (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.placeholderText}>Start adding expenses to see analytics</Text>
                    </View>
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
    header: {
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    title: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    subtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 30,
    },
    filterContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        gap: 8,
        marginBottom: 10,
    },
    filterButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    filterButtonActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: '600',
    },
    filterTextActive: {
        color: 'white',
    },
    chartSection: {
        alignItems: 'center',
    },
    chartWrapper: {
        marginVertical: 40,
        alignItems: 'center',
        justifyContent: 'center',
    },
    sectionLabel: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    legend: {
        width: '100%',
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 20,
        gap: 16,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    legendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    legendLabel: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: '500',
    },
    legendRight: {
        alignItems: 'flex-end',
    },
    legendValue: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    legendPercentage: {
        color: COLORS.textSecondary,
        fontSize: 11,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 100,
    },
    placeholderText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
        fontSize: 16,
    },
});

export default Analytics;
