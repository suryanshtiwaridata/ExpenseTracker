import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import { ChevronLeft, Save, IndianRupee, PieChart } from 'lucide-react-native';
import client from '../../api/client';

const CATEGORIES = ['Food Delivery', 'Groceries', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 'Others'];

const BudgetSettings = ({ navigation }: { navigation: any }) => {
    const { budgets, setBudgets } = useStore();
    const [loading, setLoading] = useState(false);
    const [saving, setSaving] = useState(false);

    // Local state for edits
    const [limits, setLimits] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        fetchBudgets();
    }, []);

    const fetchBudgets = async () => {
        setLoading(true);
        try {
            const response = await client.get('/budgets/');
            setBudgets(response.data);

            // Sync limits state
            const newLimits: { [key: string]: string } = {};
            CATEGORIES.forEach(cat => {
                const budget = response.data.find((b: any) => b.category === cat);
                newLimits[cat] = budget ? budget.monthly_limit.toString() : '0';
            });
            setLimits(newLimits);
        } catch (error) {
            console.error('Failed to fetch budgets', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const now = new Date();
            const month = now.getMonth() + 1;
            const year = now.getFullYear();

            const promises = Object.entries(limits).map(([category, limit]) => {
                const amount = parseFloat(limit);
                if (amount >= 0) {
                    return client.post('/budgets/', {
                        category,
                        monthly_limit: amount,
                        month,
                        year
                    });
                }
                return null;
            }).filter(p => p !== null);

            await Promise.all(promises);
            Alert.alert('Success', 'Budgets updated successfully');
            fetchBudgets(); // Refresh store
            navigation.goBack();
        } catch (error) {
            console.error('Failed to save budgets', error);
            Alert.alert('Error', 'Failed to save some budgets');
        } finally {
            setSaving(false);
        }
    };

    const updateLimit = (category: string, value: string) => {
        setLimits(prev => ({ ...prev, [category]: value }));
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <ActivityIndicator color={COLORS.primary} size="large" style={{ flex: 1 }} />
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <ChevronLeft color={COLORS.text} size={24} />
                    </TouchableOpacity>
                    <View>
                        <Text style={styles.title}>SMART BUDGETING</Text>
                        <Text style={styles.subtitle}>SET MONTHLY LIMITS</Text>
                    </View>
                </View>

                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.infoCard}>
                        <PieChart color={COLORS.primary} size={32} />
                        <Text style={styles.infoText}>
                            Set limits for each category to track your spending and receive real-time alerts.
                        </Text>
                    </View>

                    {CATEGORIES.map((category) => (
                        <View key={category} style={styles.categoryCard}>
                            <View style={styles.cardLeft}>
                                <Text style={styles.categoryName}>{category}</Text>
                                <Text style={styles.limitLabel}>Monthly Limit</Text>
                            </View>
                            <View style={styles.inputContainer}>
                                <IndianRupee color={COLORS.textSecondary} size={16} />
                                <TextInput
                                    style={styles.input}
                                    value={limits[category] || '0'}
                                    onChangeText={(val) => updateLimit(category, val)}
                                    keyboardType="numeric"
                                    placeholder="0"
                                    placeholderTextColor={COLORS.textSecondary}
                                />
                            </View>
                        </View>
                    ))}
                </ScrollView>

                <TouchableOpacity
                    style={[styles.saveButton, saving && { opacity: 0.7 }]}
                    onPress={handleSave}
                    disabled={saving}
                >
                    {saving ? (
                        <ActivityIndicator color="#000" />
                    ) : (
                        <>
                            <Save color="#000" size={20} />
                            <Text style={styles.saveButtonText}>SAVE BUDGETS</Text>
                        </>
                    )}
                </TouchableOpacity>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
        borderWidth: 1,
        borderColor: '#111',
    },
    title: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 2,
        letterSpacing: -0.5,
    },
    scrollContent: {
        padding: 24,
    },
    infoCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        padding: 24,
        borderRadius: 24,
        marginBottom: 32,
        borderWidth: 1,
        borderColor: '#111',
        gap: 20,
    },
    infoText: {
        flex: 1,
        color: COLORS.textSecondary,
        fontSize: 13,
        lineHeight: 20,
    },
    categoryCard: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.card,
        padding: 20,
        borderRadius: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#111',
    },
    cardLeft: {
        flex: 1,
    },
    categoryName: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    limitLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 4,
        letterSpacing: 1,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        paddingHorizontal: 16,
        borderRadius: 14,
        width: 120,
        borderWidth: 1,
        borderColor: '#111',
    },
    input: {
        flex: 1,
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        paddingVertical: 12,
        paddingLeft: 8,
    },
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: COLORS.primary,
        margin: 24,
        padding: 22,
        borderRadius: 24,
        gap: 12,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    saveButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
        letterSpacing: 2,
    },
});

export default BudgetSettings;
