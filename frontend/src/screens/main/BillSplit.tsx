import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Image, Share } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import { useStore } from '../../store/useStore';
import { X, Users, CreditCard, Share2, Download, Check, ChevronLeft, IndianRupee } from 'lucide-react-native';
import ViewShot from 'react-native-view-shot';
import * as Sharing from 'expo-sharing';

const BillSplit = ({ navigation, route }: { navigation: any, route: any }) => {
    const { expense } = route.params;
    const [numPeople, setNumPeople] = useState('2');
    const [names, setNames] = useState<string[]>(['You', 'Friend']);
    const [viewShotReady, setViewShotReady] = useState(false);
    const viewShotRef = useRef<any>(null);

    const amount = expense.amount;
    const splitAmount = amount / parseInt(numPeople || '1');

    const handlePeopleChange = (text: string) => {
        const val = parseInt(text);
        if (val > 0 && val <= 20) {
            setNumPeople(text);
            const newNames = Array.from({ length: val }, (_, i) => i === 0 ? 'You' : `Friend ${i + 1}`);
            setNames(newNames);
        } else if (!text) {
            setNumPeople('');
        }
    };

    const handleShare = async () => {
        try {
            const uri = await viewShotRef.current.capture();
            if (!(await Sharing.isAvailableAsync())) {
                Alert.alert('Error', 'Sharing is not available');
                return;
            }
            await Sharing.shareAsync(uri);
        } catch (error) {
            console.error('Share failed', error);
            Alert.alert('Error', 'Failed to generate shareable card');
        }
    };

    const CardPreview = () => (
        <ViewShot ref={viewShotRef} options={{ format: 'png', quality: 0.9 }} style={styles.cardContainer}>
            <View style={styles.card}>
                <View style={styles.cardHeader}>
                    <View style={styles.logoCircle}>
                        <IndianRupee color={COLORS.primary} size={24} />
                    </View>
                    <View>
                        <Text style={styles.cardBrand}>EXPENSE TRACKER</Text>
                        <Text style={styles.cardTagline}>Smart Bill Split</Text>
                    </View>
                </View>

                <View style={styles.cardBody}>
                    <Text style={styles.cardExpenseTitle}>{expense.vendor || 'General Expense'}</Text>
                    <Text style={styles.cardTotalAmount}>₹{amount.toLocaleString()}</Text>

                    <View style={styles.divider} />

                    <View style={styles.splitInfo}>
                        <View style={styles.splitRow}>
                            <Text style={styles.splitLabel}>Split Among</Text>
                            <Text style={styles.splitValue}>{numPeople} People</Text>
                        </View>
                        <View style={styles.splitRow}>
                            <Text style={styles.splitLabel}>Each Person Pays</Text>
                            <Text style={styles.splitEachAmount}>₹{splitAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Text>
                        </View>
                    </View>

                    <View style={styles.footerBranding}>
                        <Text style={styles.footerText}>Settled via ExpenseTracker AI</Text>
                    </View>
                </View>
            </View>
        </ViewShot>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <X color={COLORS.text} size={24} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Split Bill</Text>
                <View style={{ width: 44 }} />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent}>
                <View style={styles.section}>
                    <Text style={styles.label}>Split with how many people?</Text>
                    <View style={styles.inputContainer}>
                        <Users color={COLORS.primary} size={20} style={styles.inputIcon} />
                        <TextInput
                            style={styles.input}
                            value={numPeople}
                            onChangeText={handlePeopleChange}
                            keyboardType="numeric"
                            placeholder="Number of people"
                            placeholderTextColor={COLORS.textSecondary}
                        />
                    </View>
                </View>

                <Text style={styles.previewTitle}>Card Preview</Text>
                <CardPreview />

                <TouchableOpacity style={styles.shareButton} onPress={handleShare}>
                    <Share2 color="#000" size={20} />
                    <Text style={styles.shareButtonText}>Share Card</Text>
                </TouchableOpacity>

                <Text style={styles.tipText}>Tip: Swipe on the card to change styles (Coming Soon)</Text>
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
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingVertical: 15,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    scrollContent: {
        padding: 24,
    },
    section: {
        marginBottom: 30,
    },
    label: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 15,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.card,
        borderRadius: 16,
        paddingHorizontal: 15,
        borderWidth: 1,
        borderColor: '#111',
    },
    inputIcon: {
        marginRight: 12,
    },
    input: {
        flex: 1,
        color: COLORS.text,
        paddingVertical: 18,
        fontSize: 16,
        fontWeight: 'bold',
    },
    previewTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 20,
    },
    cardContainer: {
        backgroundColor: '#000',
        borderRadius: 24,
        padding: 2,
        marginBottom: 30,
    },
    card: {
        backgroundColor: COLORS.card,
        borderRadius: 22,
        padding: 25,
        borderWidth: 1,
        borderColor: COLORS.primary + '33',
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 30,
    },
    logoCircle: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
        borderWidth: 1,
        borderColor: COLORS.primary,
    },
    cardBrand: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 2,
    },
    cardTagline: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    cardBody: {
        alignItems: 'center',
    },
    cardExpenseTitle: {
        fontSize: 16,
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 10,
    },
    cardTotalAmount: {
        fontSize: 36,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 25,
    },
    divider: {
        width: '100%',
        height: 1,
        backgroundColor: '#1a1a1a',
        marginBottom: 25,
    },
    splitInfo: {
        width: '100%',
        gap: 15,
        marginBottom: 30,
    },
    splitRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    splitLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
    },
    splitValue: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    splitEachAmount: {
        fontSize: 20,
        fontWeight: 'bold',
        color: COLORS.primary,
    },
    footerBranding: {
        marginTop: 10,
    },
    footerText: {
        fontSize: 9,
        color: '#333',
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    shareButton: {
        backgroundColor: COLORS.primary,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
        borderRadius: 20,
        gap: 10,
    },
    shareButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    tipText: {
        textAlign: 'center',
        marginTop: 20,
        color: '#222',
        fontSize: 10,
        fontWeight: 'bold',
    }
});

export default BillSplit;
