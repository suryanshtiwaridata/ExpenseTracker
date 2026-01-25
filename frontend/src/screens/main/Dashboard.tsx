import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, TouchableOpacity, Alert, LayoutAnimation, Platform, UIManager } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import client from '../../api/client';
import { useStore } from '../../store/useStore';
import { useFocusEffect } from '@react-navigation/native';
import { TrendingUp, ArrowUpRight, ArrowDownLeft, ShoppingBag, Coffee, Car, Utensils, Trash2, ChevronDown, ChevronRight } from 'lucide-react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { isSameMonth, format } from 'date-fns';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
    UIManager.setLayoutAnimationEnabledExperimental(true);
}

const Dashboard = () => {
    const { expenses, setExpenses, removeExpense, user } = useStore();
    const [summary, setSummary] = useState({ total_spent: 0 });
    const [refreshing, setRefreshing] = useState(false);

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

    const recentExpenses = useMemo(() => {
        return [...expenses]
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
            .slice(0, 10);
    }, [expenses]);

    const monthlyTotal = useMemo(() => {
        const now = new Date();
        return expenses
            .filter(exp => isSameMonth(new Date(exp.date), now))
            .reduce((sum, exp) => sum + exp.amount, 0);
    }, [expenses]);

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

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
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
                        <Text style={styles.greeting}>{getGreeting()},</Text>
                        <Text style={styles.userName}>{user?.name?.split(' ')[0] || 'Suryansh'}</Text>
                    </View>
                    <TouchableOpacity style={styles.notificationButton}>
                        <View style={styles.dot} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={styles.content}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.premiumCard}>
                        <View style={styles.cardGlow} />
                        <View style={styles.cardHeader}>
                            <Text style={styles.cardLabel}>SPENDING IN {format(new Date(), 'MMM').toUpperCase()}</Text>
                            <Text style={styles.cardValue}>
                                ₹{monthlyTotal.toLocaleString()}
                            </Text>
                        </View>

                        <View style={styles.cardFooter}>
                            <View style={styles.footerItem}>
                                <View>
                                    <Text style={styles.footerLabel}>INCOME</Text>
                                    <Text style={styles.footerValue}>₹0</Text>
                                </View>
                            </View>
                            <View style={styles.footerSeparator} />
                            <View style={styles.footerItem}>
                                <View>
                                    <Text style={styles.footerLabel}>EXPENSE</Text>
                                    <Text style={styles.footerValue}>₹{monthlyTotal.toLocaleString()}</Text>
                                </View>
                            </View>
                        </View>
                        <View style={styles.cardChip} />
                    </View>

                    <View style={styles.sectionHeader}>
                        <Text style={styles.sectionTitle}>Recent Transactions</Text>
                    </View>

                    {recentExpenses.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No expenses yet. Scan a receipt!</Text>
                        </View>
                    ) : (
                        <View style={styles.transactionsList}>
                            {recentExpenses.map((expense: any) => (
                                <Swipeable
                                    key={expense.id}
                                    renderRightActions={() => renderRightActions(expense.id)}
                                    onSwipeableOpen={() => handleDeleteExpense(expense.id)}
                                >
                                    <View style={styles.expenseItem}>
                                        <View style={styles.expenseLeft}>
                                            <View style={[styles.categoryIconCircle, { borderColor: COLORS.border }]}>
                                                {React.createElement(getCategoryIcon(expense.category), { color: COLORS.text, size: 18 })}
                                            </View>
                                            <View style={styles.expenseInfo}>
                                                <Text style={styles.expenseVendor}>{expense.vendor || 'Unknown Vendor'}</Text>
                                                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                                    <Text style={styles.expenseCategory}>{expense.category}</Text>
                                                    <Text style={styles.dotSeparator}>•</Text>
                                                    <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
                                                </View>
                                            </View>
                                        </View>
                                        <View style={styles.expenseRight}>
                                            <Text style={styles.expenseAmount}>
                                                ₹{expense.amount.toLocaleString()}
                                            </Text>
                                        </View>
                                    </View>
                                </Swipeable>
                            ))}
                        </View>
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
    premiumCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 30,
        marginBottom: 35,
        borderWidth: 1,
        borderColor: '#222',
        position: 'relative',
        overflow: 'hidden',
    },
    cardGlow: {
        position: 'absolute',
        top: -100,
        right: -100,
        width: 250,
        height: 250,
        borderRadius: 125,
        backgroundColor: 'rgba(0, 209, 255, 0.05)',
    },
    cardChip: {
        position: 'absolute',
        top: 30,
        right: 30,
        width: 35,
        height: 25,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        borderRadius: 4,
        borderWidth: 1,
        borderColor: 'rgba(255, 255, 255, 0.1)',
    },
    cardHeader: {
        alignItems: 'flex-start',
        marginBottom: 40,
    },
    cardLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginBottom: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
    cardValue: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 1,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        paddingTop: 25,
    },
    footerItem: {
        flex: 1,
    },
    footerSeparator: {
        width: 1,
        height: 40,
        backgroundColor: '#1A1A1A',
        marginHorizontal: 15,
    },
    footerLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        letterSpacing: 1.5,
        marginBottom: 5,
    },
    footerValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    sectionHeader: {
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
    },
    transactionsList: {
        paddingBottom: 20,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
    },
    expenseLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    categoryIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    expenseInfo: {
        gap: 2,
    },
    expenseVendor: {
        fontSize: 15,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    expenseCategory: {
        fontSize: 11,
        color: COLORS.primary,
        fontWeight: '600',
    },
    dotSeparator: {
        fontSize: 11,
        color: '#333',
    },
    expenseDate: {
        fontSize: 11,
        color: '#444',
    },
    expenseRight: {
        alignItems: 'flex-end',
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    deleteAction: {
        backgroundColor: COLORS.danger,
        justifyContent: 'center',
        alignItems: 'center',
        width: 70,
        height: '100%',
    },
});

export default Dashboard;
