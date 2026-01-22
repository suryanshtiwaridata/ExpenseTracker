import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import client from '../../api/client';
import { useStore } from '../../store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import { Wallet, TrendingUp, ArrowUpRight, ArrowDownLeft, ShoppingBag, Coffee, Car, Utensils, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Dashboard = () => {
    const { expenses, setExpenses, removeExpense, user } = useStore();
    const [summary, setSummary] = useState({ total_spent: 0 });
    const [refreshing, setRefreshing] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<string[]>([]);

    const fetchData = async () => {
        try {
            const [summaryRes, expensesRes] = await Promise.all([
                client.get('/expenses/summary'),
                client.get('/expenses/')
            ]);
            setSummary(summaryRes.data);
            setExpenses(expensesRes.data);
        } catch (error) {
            console.error('Failed to fetch dashboard data', error);
        }
    };

    const handleDeleteExpense = async (id: string) => {
        Alert.alert(
            'Delete Expense',
            'Are you sure you want to delete this expense?',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await client.delete(`/expenses/${id}`);
                            removeExpense(id);
                            // Refresh summary
                            const summaryRes = await client.get('/expenses/summary');
                            setSummary(summaryRes.data);
                        } catch (error) {
                            console.error('Failed to delete expense', error);
                            Alert.alert('Error', 'Failed to delete expense');
                        }
                    },
                },
            ]
        );
    };

    const toggleCategory = (category: string) => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setExpandedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const groupedExpenses = expenses.reduce((groups: any, expense) => {
        const category = expense.category;
        if (!groups[category]) {
            groups[category] = [];
        }
        groups[category].push(expense);
        return groups;
    }, {});

    const renderRightActions = (id: string) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => handleDeleteExpense(id)}
            >
                <Trash2 color="white" size={24} />
            </TouchableOpacity>
        );
    };

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await fetchData();
        setRefreshing(false);
    };

    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes('food')) return Utensils;
        if (cat.includes('coffee') || cat.includes('drink')) return Coffee;
        if (cat.includes('shop')) return ShoppingBag;
        if (cat.includes('transport') || cat.includes('car')) return Car;
        return ShoppingBag;
    };

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <View style={styles.topHeader}>
                    <View>
                        <Text style={styles.greeting}>Good Morning,</Text>
                        <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Suryansh'}</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}>
                        <View style={styles.dot} />
                        <Wallet color={COLORS.text} size={24} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.card}>
                        <View style={styles.cardRow}>
                            <View style={styles.cardHeader}>
                                <Text style={styles.cardLabel}>Total Spent</Text>
                                <Text style={styles.cardValue}>{expenses[0]?.currency || '₹'}{summary.total_spent.toLocaleString()}</Text>
                            </View>
                            <View style={[styles.trendBadge, { backgroundColor: 'rgba(34, 197, 94, 0.1)' }]}>
                                <TrendingUp color={COLORS.success} size={16} />
                                <Text style={[styles.trendText, { color: COLORS.success }]}>+2.5%</Text>
                            </View>
                        </View>

                        <View style={styles.cardFooter}>
                            <View style={styles.footerItem}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(99, 102, 241, 0.1)' }]}>
                                    <ArrowUpRight color={COLORS.primary} size={16} />
                                </View>
                                <View>
                                    <Text style={styles.footerLabel}>Income</Text>
                                    <Text style={[styles.footerValue, { color: COLORS.success }]}>
                                        {expenses[0]?.currency || '₹'}0
                                    </Text>
                                </View>
                            </View>
                            <View style={styles.footerItem}>
                                <View style={[styles.iconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                    <ArrowDownLeft color={COLORS.danger} size={16} />
                                </View>
                                <View>
                                    <Text style={styles.footerLabel}>Expense</Text>
                                    <Text style={[styles.footerValue, { color: COLORS.danger }]}>
                                        {expenses[0]?.currency || '₹'}{summary.total_spent.toLocaleString()}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Transactions by Category</Text>
                    </View>

                    {Object.keys(groupedExpenses).length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No expenses yet. Scan a receipt!</Text>
                        </View>
                    ) : (
                        Object.keys(groupedExpenses).map((category) => {
                            const Icon = getCategoryIcon(category);
                            const isExpanded = expandedCategories.includes(category);
                            const catExpenses = groupedExpenses[category];
                            const categoryTotal = catExpenses.reduce((sum: number, e: any) => sum + e.amount, 0);

                            return (
                                <View key={category} style={styles.categoryContainer}>
                                    <TouchableOpacity
                                        style={styles.categoryHeader}
                                        onPress={() => toggleCategory(category)}
                                        activeOpacity={0.7}
                                    >
                                        <View style={styles.categoryInfo}>
                                            <View style={[styles.categoryIcon, { backgroundColor: COLORS.glass }]}>
                                                <Icon color={COLORS.primary} size={22} />
                                            </View>
                                            <View>
                                                <Text style={styles.categoryName}>{category}</Text>
                                                <Text style={styles.categoryCount}>{catExpenses.length} Transactions</Text>
                                            </View>
                                        </View>
                                        <View style={styles.categoryRight}>
                                            <Text style={[styles.categoryAmount, { color: COLORS.danger }]}>
                                                ₹{categoryTotal.toLocaleString()}
                                            </Text>
                                            {isExpanded ? <ChevronDown color={COLORS.textSecondary} size={20} /> : <ChevronRight color={COLORS.textSecondary} size={20} />}
                                        </View>
                                    </TouchableOpacity>

                                    {isExpanded && (
                                        <View style={styles.transactionsList}>
                                            {catExpenses.map((expense: any) => (
                                                <Swipeable
                                                    key={expense.id}
                                                    renderRightActions={() => renderRightActions(expense.id)}
                                                    onSwipeableOpen={() => handleDeleteExpense(expense.id)}
                                                >
                                                    <View style={styles.expenseItem}>
                                                        <View style={styles.expenseLeft}>
                                                            <View style={styles.expenseInfo}>
                                                                <Text style={styles.expenseVendor}>{expense.vendor || 'Unknown Vendor'}</Text>
                                                                <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
                                                            </View>
                                                        </View>
                                                        <View style={styles.expenseRight}>
                                                            <Text style={[styles.expenseAmount, { color: COLORS.danger }]}>
                                                                ₹{expense.amount.toLocaleString()}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                </Swipeable>
                                            ))}
                                        </View>
                                    )}
                                </View>
                            );
                        })
                    )}
                </ScrollView>
            </SafeAreaView>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    topHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 10,
        paddingBottom: 20,
    },
    greeting: {
        fontSize: 14,
        color: COLORS.textSecondary,
    },
    userName: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    dot: {
        position: 'absolute',
        top: 12,
        right: 12,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: COLORS.secondary,
        zIndex: 1,
        borderWidth: 2,
        borderColor: COLORS.surface,
    },
    content: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    card: {
        backgroundColor: COLORS.primary,
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        elevation: 10,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    cardRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    cardHeader: {
        marginBottom: 20,
    },
    cardLabel: {
        fontSize: 14,
        color: 'rgba(255, 255, 255, 0.8)',
        marginBottom: 8,
    },
    cardValue: {
        fontSize: 32,
        fontWeight: 'bold',
        color: 'white',
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    trendText: {
        fontSize: 12,
        fontWeight: 'bold',
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: 'rgba(255, 255, 255, 0.2)',
        paddingTop: 20,
    },
    footerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    footerLabel: {
        fontSize: 11,
        color: 'rgba(255, 255, 255, 0.7)',
    },
    footerValue: {
        fontSize: 14,
        fontWeight: 'bold',
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
    },
    categoryContainer: {
        marginBottom: 16,
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        overflow: 'hidden',
    },
    categoryHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryIcon: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    categoryName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    categoryCount: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    categoryRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    categoryAmount: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    transactionsList: {
        backgroundColor: 'rgba(0,0,0,0.02)',
        paddingHorizontal: 12,
        paddingBottom: 12,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 14,
        borderRadius: 12,
        marginTop: 8,
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    expenseInfo: {
        gap: 2,
    },
    expenseVendor: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.text,
    },
    expenseDate: {
        fontSize: 11,
        color: COLORS.textSecondary,
    },
    expenseRight: {
        alignItems: 'flex-end',
    },
    expenseAmount: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    deleteAction: {
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '85%',
        alignSelf: 'center',
        borderRadius: 12,
        marginTop: 8,
    },
});

export default Dashboard;
