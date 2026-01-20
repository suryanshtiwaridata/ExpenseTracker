import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import client from '../../api/client';
import { useStore } from '../../store/useStore';
import { useFocusEffect } from '@react-navigation/native';

const Dashboard = () => {
    const { expenses, setExpenses } = useStore();
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

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
                }
            >
                <View style={styles.header}>
                    <Text style={styles.greeting}>Hello!</Text>
                    <Text style={styles.balance}>Total Spent: ₹{summary.total_spent.toLocaleString('en-IN')}</Text>
                </View>

                <Text style={styles.sectionTitle}>Recent Expenses</Text>
                {expenses.length === 0 ? (
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No expenses yet. Add one!</Text>
                    </View>
                ) : (
                    expenses.map((expense) => (
                        <View key={expense.id} style={styles.expenseItem}>
                            <View>
                                <Text style={styles.expenseCategory}>{expense.category}</Text>
                                <Text style={styles.expenseDate}>{new Date(expense.date).toLocaleDateString()}</Text>
                            </View>
                            <Text style={styles.expenseAmount}>-₹{expense.amount.toLocaleString('en-IN')}</Text>
                        </View>
                    ))
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
    },
    header: {
        marginBottom: 30,
        backgroundColor: COLORS.surface,
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    greeting: {
        fontSize: 18,
        color: COLORS.textSecondary,
    },
    balance: {
        fontSize: 32,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 4,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 16,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: COLORS.textSecondary,
    },
    expenseItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    expenseCategory: {
        fontSize: 16,
        fontWeight: '600',
        color: COLORS.text,
    },
    expenseDate: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    expenseAmount: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.danger,
    },
});

export default Dashboard;
