import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { PieChart } from 'react-native-gifted-charts';
import { useStore } from '../../store/useStore';
import { ChevronLeft, ChevronRight } from 'lucide-react-native';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths } from 'date-fns';

const Analytics = () => {
    const { expenses } = useStore();
    const [chartData, setChartData] = useState<any[]>([]);
    const [groupBy, setGroupBy] = useState<'category' | 'month' | 'mode' | 'calendar'>('category');
    const [selectedMonth, setSelectedMonth] = useState(new Date());

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
                {(['category', 'mode', 'calendar'] as const).map((filter) => (
                    <TouchableOpacity
                        key={filter}
                        style={[styles.filterButton, groupBy === filter && styles.filterButtonActive]}
                        onPress={() => setGroupBy(filter)}
                    >
                        <Text style={[styles.filterText, groupBy === filter && styles.filterTextActive]}>
                            {filter === 'calendar' ? 'CALENDAR' : filter.toUpperCase()}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                {groupBy === 'calendar' ? (
                    <CalendarView expenses={expenses} selectedMonth={selectedMonth} onMonthChange={setSelectedMonth} />
                ) : chartData.length > 0 ? (
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
        color: COLORS.background,
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
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        alignSelf: 'flex-start',
        marginBottom: 20,
    },
    legend: {
        width: '100%',
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 24,
        borderWidth: 1,
        borderColor: '#111',
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
    },
    legendLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    dot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendLabel: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: '500',
    },
    legendRight: {
        alignItems: 'flex-end',
    },
    legendValue: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    legendPercentage: {
        color: COLORS.textSecondary,
        fontSize: 10,
        marginTop: 2,
    },
    emptyContainer: {
        padding: 60,
        alignItems: 'center',
    },
    placeholderText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
    },
    calendarContainer: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 24,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#111',
    },
    calendarHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 30,
        paddingHorizontal: 8,
    },
    monthText: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    navButton: {
        padding: 10,
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#222',
    },
    weekDays: {
        flexDirection: 'row',
        marginBottom: 15,
    },
    weekDayText: {
        flex: 1,
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
    },
    daysGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    dayCell: {
        width: (Dimensions.get('window').width - 88) / 7,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    dayText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    notCurrentMonthText: {
        color: '#111',
    },
    todayCell: {
        borderWidth: 1,
        borderColor: COLORS.primary,
        borderRadius: 12,
    },
    todayText: {
        color: COLORS.primary,
        fontWeight: 'bold',
    },
    selectedDayCell: {
        backgroundColor: COLORS.primary,
        borderRadius: 12,
    },
    selectedDayText: {
        color: '#000',
        fontWeight: 'bold',
    },
    expenseDayCell: {
        // Dot indicator style instead of background
    },
    expenseBadge: {
        width: 3,
        height: 3,
        borderRadius: 1.5,
        backgroundColor: COLORS.primary,
        marginTop: 2,
    },
    dayAmountText: {
        fontSize: 7,
        color: COLORS.primary,
        fontWeight: 'bold',
        marginTop: 1,
    },
    expenseDayText: {
        color: COLORS.text,
    },
    amountContainer: {
        display: 'none',
    },
    dayTotalText: {
        display: 'none',
    },
    transactionsSection: {
        marginTop: 30,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        paddingTop: 20,
    },
    transactionsTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 20,
    },
    transactionList: {
        gap: 0,
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
    },
    transactionInfo: {
        flex: 1,
    },
    transactionCategory: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    transactionDescription: {
        color: COLORS.textSecondary,
        fontSize: 11,
        marginTop: 2,
    },
    transactionAmount: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    noTransactionsText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: 10,
    },
});

const CalendarView = ({ expenses, selectedMonth, onMonthChange }: { expenses: any[], selectedMonth: Date, onMonthChange: (d: Date) => void }) => {
    const [selectedDate, setSelectedDate] = useState<Date | null>(new Date());

    const calendarData = useMemo(() => {
        const start = startOfWeek(startOfMonth(selectedMonth));
        const end = endOfWeek(endOfMonth(selectedMonth));
        const days = eachDayOfInterval({ start, end });

        const expenseMap: Record<string, number> = {};
        expenses.forEach(exp => {
            const dateStr = format(new Date(exp.date), 'yyyy-MM-dd');
            expenseMap[dateStr] = (expenseMap[dateStr] || 0) + exp.amount;
        });

        return { days, expenseMap };
    }, [selectedMonth, expenses]);

    const selectedDayExpenses = useMemo(() => {
        if (!selectedDate) return [];
        return expenses.filter(exp => isSameDay(new Date(exp.date), selectedDate));
    }, [selectedDate, expenses]);

    return (
        <View style={styles.calendarContainer}>
            <View style={styles.calendarHeader}>
                <TouchableOpacity onPress={() => onMonthChange(subMonths(selectedMonth, 1))} style={styles.navButton}>
                    <ChevronLeft color={COLORS.text} size={20} />
                </TouchableOpacity>
                <Text style={styles.monthText}>{format(selectedMonth, 'MMMM yyyy')}</Text>
                <TouchableOpacity onPress={() => onMonthChange(addMonths(selectedMonth, 1))} style={styles.navButton}>
                    <ChevronRight color={COLORS.text} size={20} />
                </TouchableOpacity>
            </View>

            <View style={styles.weekDays}>
                {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
                    <Text key={i} style={styles.weekDayText}>{day}</Text>
                ))}
            </View>

            <View style={styles.daysGrid}>
                {calendarData.days.map((day, i) => {
                    const dateStr = format(day, 'yyyy-MM-dd');
                    const amount = calendarData.expenseMap[dateStr];
                    const isCurrentMonth = isSameMonth(day, selectedMonth);
                    const isToday = isSameDay(day, new Date());
                    const isSelected = selectedDate && isSameDay(day, selectedDate);
                    const hasExpenses = amount > 0 && isCurrentMonth;

                    return (
                        <TouchableOpacity
                            key={i}
                            style={[
                                styles.dayCell,
                                isToday && styles.todayCell,
                                isSelected && styles.selectedDayCell,
                                hasExpenses && styles.expenseDayCell
                            ]}
                            onPress={() => setSelectedDate(day)}
                        >
                            <Text style={[
                                styles.dayText,
                                !isCurrentMonth && styles.notCurrentMonthText,
                                isToday && styles.todayText,
                                isSelected && styles.selectedDayText,
                                hasExpenses && styles.expenseDayText
                            ]}>
                                {format(day, 'd')}
                            </Text>
                            {hasExpenses && (
                                <Text style={[
                                    styles.dayAmountText,
                                    isSelected && { color: COLORS.background }
                                ]}>
                                    ₹{amount > 999 ? `${(amount / 1000).toFixed(1)}k` : amount}
                                </Text>
                            )}
                            {hasExpenses && !isSelected && <View style={styles.expenseBadge} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {selectedDate && (
                <View style={styles.transactionsSection}>
                    <Text style={styles.transactionsTitle}>
                        {isSameDay(selectedDate, new Date()) ? 'Today' : format(selectedDate, 'MMM d, yyyy')}
                    </Text>
                    {selectedDayExpenses.length > 0 ? (
                        <View style={styles.transactionList}>
                            {selectedDayExpenses.map((exp, index) => (
                                <View key={index} style={styles.transactionItem}>
                                    <View style={styles.transactionInfo}>
                                        <Text style={styles.transactionCategory}>{exp.category}</Text>
                                        <Text style={styles.transactionDescription} numberOfLines={1}>
                                            {exp.description || 'No description'}
                                        </Text>
                                    </View>
                                    <Text style={styles.transactionAmount}>₹{exp.amount.toLocaleString()}</Text>
                                </View>
                            ))}
                        </View>
                    ) : (
                        <Text style={styles.noTransactionsText}>No expenses on this day</Text>
                    )}
                </View>
            )}
        </View>
    );
};

export default Analytics;
