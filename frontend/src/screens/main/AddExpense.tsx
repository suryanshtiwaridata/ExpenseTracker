import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';
import { useStore } from '../../store/useStore';
import { Camera, Image as ImageIcon, Plus, Info, Tag, IndianRupee, Clock, CheckCircle2, XCircle, FileText, Wallet } from 'lucide-react-native';

const CATEGORIES = ['Food Delivery', 'Groceries', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 'Others'];
const PAYMENT_MODES = ['upi', 'card', 'cash'];

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

const AddExpense = ({ navigation }: { navigation: any }) => {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES[0]);
    const [taxAmount, setTaxAmount] = useState('0.00');
    const [taxType, setTaxType] = useState<string | null>(null);
    const [description, setDescription] = useState('');
    const [vendor, setVendor] = useState('');
    const [items, setItems] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [smsText, setSmsText] = useState('');
    const [bulkExpenses, setBulkExpenses] = useState<any[]>([]);

    const parseReceipt = async (base64Image: string) => {
        setParsing(true);
        try {
            const response = await client.post('/expenses/parse-receipt', { image: base64Image });
            if (response.data.amount) {
                setAmount(response.data.amount.toString());
            }
            if (response.data.vendor) {
                setVendor(response.data.vendor);
            }
            if (response.data.description) {
                setDescription(response.data.description);
            }
            if (response.data.items) {
                setItems(response.data.items);
            }
            if (response.data.payment_mode) {
                setPaymentMode(response.data.payment_mode);
            }
            if (response.data.tax_amount) {
                setTaxAmount(response.data.tax_amount.toString());
                setTaxType(response.data.tax_type || 'Tax');
            }
        } catch (error) {
            console.error('Failed to parse receipt', error);
        } finally {
            setParsing(false);
        }
    };

    const handleSmsPaste = async (text: string) => {
        if (!text.trim()) return;
        setParsing(true);
        try {
            const response = await client.post('/expenses/parse-sms', { text });
            if (response.data.amount) {
                setAmount(response.data.amount.toString());
            }
            if (response.data.description) {
                setDescription(response.data.description);
            }
            setPaymentMode('upi'); // SMS transactions are usually UPI/Cards, but default to upi for now
            setSmsText('');
            Alert.alert('Magic!', 'Expense details extracted from SMS');
        } catch (error) {
            console.error('Failed to parse SMS', error);
        } finally {
            setParsing(false);
        }
    };

    const handlePickPdf = async () => {
        try {
            const result = await DocumentPicker.getDocumentAsync({
                type: 'application/pdf',
                copyToCacheDirectory: true,
            });

            if (!result.canceled) {
                setParsing(true);
                const fileUri = result.assets[0].uri;
                const base64Pdf = await FileSystem.readAsStringAsync(fileUri, {
                    encoding: 'base64',
                });

                const response = await client.post('/expenses/parse-pdf', { pdf: base64Pdf });
                if (response.data && response.data.length > 0) {
                    setBulkExpenses(response.data);
                    Alert.alert('Success', `Parsed ${response.data.length} transactions from statement`);
                } else {
                    Alert.alert('Notice', 'No transactions found in this PDF format yet.');
                }
            }
        } catch (error) {
            console.error('Failed to pick or parse PDF', error);
            Alert.alert('Error', 'Failed to process PDF statement');
        } finally {
            setParsing(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const base64 = result.assets[0].base64 || null;
            setImage(base64);
            if (base64) parseReceipt(base64);
        }
    };

    const handleCameraCapture = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Error', 'Camera permission is required');
            return;
        }

        const result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            quality: 0.5,
            base64: true,
        });

        if (!result.canceled) {
            const base64 = result.assets[0].base64 || null;
            setImage(base64);
            if (base64) parseReceipt(base64);
        }
    };

    const handleBulkSubmit = async () => {
        setLoading(true);
        try {
            await Promise.all(bulkExpenses.map(exp =>
                client.post('/expenses/', {
                    amount: exp.amount,
                    date: exp.date || new Date().toISOString(),
                    category: exp.category || 'Others',
                    description: exp.description || exp.vendor,
                    vendor: exp.vendor,
                    source: 'pdf',
                    payment_mode: exp.payment_mode || 'upi',
                    currency: 'INR'
                })
            ));
            Alert.alert('Success', `Saved ${bulkExpenses.length} transactions`);
            setBulkExpenses([]);
            navigation.navigate('Home');
        } catch (error) {
            console.error('Failed to save bulk expenses', error);
            Alert.alert('Error', 'Failed to save some transactions');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!amount) {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        setLoading(true);
        try {
            await client.post('/expenses/', {
                amount: parseFloat(amount) || 0,
                date: new Date().toISOString(),
                category,
                payment_mode: paymentMode,
                tax_amount: parseFloat(taxAmount) || 0,
                tax_type: taxType,
                description,
                vendor,
                items,
                source: image ? 'receipt' : 'manual',
                receipt_image_base64: image,
                currency: 'INR',
            });

            Alert.alert('Success', 'Expense added!');
            setAmount('');
            setDescription('');
            setVendor('');
            setItems([]);
            setImage(null);
            navigation.navigate('Home');
        } catch (error) {
            console.error('Failed to add expense', error);
            Alert.alert('Error', 'Failed to add expense');
        } finally {
            setLoading(false);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAwareScrollView
                style={{ flex: 1 }}
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                extraScrollHeight={100}
                enableOnAndroid={true}
            >
                <View style={styles.header}>
                    <Text style={styles.title}>New Expense</Text>
                    <Text style={styles.subtitle}>Fill in details or scan a receipt</Text>
                </View>

                <View style={styles.inputCard}>
                    <View style={styles.amountHeader}>
                        <IndianRupee color={COLORS.primary} size={24} />
                        <Text style={styles.amountLabel}>Amount (INR)</Text>
                    </View>
                    <TextInput
                        style={styles.amountInput}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.label}>Scan / Paste Magic</Text>
                    <View style={styles.imagePickerGroup}>
                        <TouchableOpacity style={styles.imagePickerButton} onPress={handleCameraCapture}>
                            <Camera color={COLORS.primary} size={24} />
                            <Text style={styles.imagePickerText}>Camera</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                            <ImageIcon color={COLORS.primary} size={24} />
                            <Text style={styles.imagePickerText}>Gallery</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickPdf}>
                            <FileText color={COLORS.primary} size={24} />
                            <Text style={styles.imagePickerText}>Statement</Text>
                        </TouchableOpacity>
                    </View>

                    <TextInput
                        style={styles.smsInput}
                        placeholder="Or paste bank SMS here..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        value={smsText}
                        onChangeText={(text) => {
                            setSmsText(text);
                            if (text.length > 20) handleSmsPaste(text);
                        }}
                    />
                </View>

                {bulkExpenses.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.bulkHeader}>
                            <Text style={styles.label}>Review Statement Items</Text>
                            <TouchableOpacity onPress={() => setBulkExpenses([])}>
                                <Text style={{ color: COLORS.danger }}>Clear</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.itemsCard}>
                            {bulkExpenses.map((exp, index) => (
                                <View key={index} style={styles.bulkRow}>
                                    <View style={styles.bulkLeft}>
                                        <Text style={styles.bulkVendor}>{exp.vendor}</Text>
                                        <Text style={styles.bulkCategory}>{exp.category}</Text>
                                    </View>
                                    <View style={styles.bulkRight}>
                                        <Text style={styles.bulkAmount}>₹{exp.amount}</Text>
                                        <TouchableOpacity
                                            onPress={() => setBulkExpenses(prev => prev.filter((_, i) => i !== index))}
                                            style={styles.removeBulkButton}
                                        >
                                            <XCircle color={COLORS.danger} size={18} />
                                        </TouchableOpacity>
                                    </View>
                                </View>
                            ))}
                        </View>
                        <TouchableOpacity
                            style={[styles.submitButton, { marginTop: 16 }]}
                            onPress={handleBulkSubmit}
                        >
                            <Text style={styles.submitButtonText}>Save All {bulkExpenses.length} Items</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {parsing && (
                    <View style={styles.statusBox}>
                        <ActivityIndicator color={COLORS.primary} size="small" />
                        <Text style={styles.statusText}>Reading receipt details...</Text>
                    </View>
                )}

                {image && !parsing && (
                    <View style={[styles.statusBox, { borderColor: COLORS.success }]}>
                        <CheckCircle2 color={COLORS.success} size={20} />
                        <Text style={[styles.statusText, { color: COLORS.success }]}>Receipt Linked Successfully</Text>
                        <TouchableOpacity onPress={() => setImage(null)}>
                            <XCircle color={COLORS.danger} size={20} />
                        </TouchableOpacity>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={styles.label}>Vendor, Category & Mode</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="Vendor Name (e.g. Starbucks)"
                        placeholderTextColor={COLORS.textSecondary}
                        value={vendor}
                        onChangeText={setVendor}
                    />

                    <View style={styles.pickerLabelRow}>
                        <Tag color={COLORS.textSecondary} size={14} />
                        <Text style={styles.pickerLabel}>Category</Text>
                    </View>
                    <View style={styles.categoryScroll}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {CATEGORIES.map((cat) => (
                                <TouchableOpacity
                                    key={cat}
                                    style={[styles.categoryBadge, category === cat && styles.categoryBadgeActive]}
                                    onPress={() => setCategory(cat)}
                                >
                                    <Text style={[styles.categoryText, category === cat && styles.categoryTextActive]}>
                                        {cat}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>

                    <View style={[styles.pickerLabelRow, { marginTop: 16 }]}>
                        <Wallet color={COLORS.textSecondary} size={14} />
                        <Text style={styles.pickerLabel}>Payment Mode</Text>
                    </View>
                    <View style={styles.categoryScroll}>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                            {PAYMENT_MODES.map((mode) => (
                                <TouchableOpacity
                                    key={mode}
                                    style={[styles.categoryBadge, paymentMode === mode && styles.categoryBadgeActive]}
                                    onPress={() => setPaymentMode(mode)}
                                >
                                    <Text style={[styles.categoryText, paymentMode === mode && styles.categoryTextActive]}>
                                        {mode.toUpperCase()}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </ScrollView>
                    </View>
                </View>

                {parseFloat(taxAmount) > 0 && (
                    <View style={styles.taxInfoBox}>
                        <View style={styles.taxInfoLeft}>
                            <Info color={COLORS.success} size={16} />
                            <Text style={styles.taxInfoText}>
                                Detected {taxType}: <Text style={{ fontWeight: 'bold' }}>₹{taxAmount}</Text>
                            </Text>
                        </View>
                        <TouchableOpacity onPress={() => setTaxAmount('0.00')}>
                            <XCircle color={COLORS.textSecondary} size={16} />
                        </TouchableOpacity>
                    </View>
                )}

                {items.length > 0 && (
                    <View style={styles.section}>
                        <Text style={styles.label}>Detected Items</Text>
                        <View style={styles.itemsCard}>
                            {items.map((item, index) => (
                                <View key={index} style={styles.itemRow}>
                                    <Clock color={COLORS.textSecondary} size={14} />
                                    <Text style={styles.itemText}>{item}</Text>
                                </View>
                            ))}
                        </View>
                    </View>
                )}

                <View style={styles.section}>
                    <Text style={[styles.label, { marginBottom: 12 }]}>Notes</Text>
                    <TextInput
                        style={[styles.input, { height: 100, textAlignVertical: 'top', paddingTop: 16 }]}
                        placeholder="Add some context..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <View style={styles.submitContent}>
                            <Plus color="white" size={24} />
                            <Text style={styles.submitButtonText}>Save Transaction</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </KeyboardAwareScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    content: {
        padding: 24,
    },
    header: {
        marginBottom: 40,
        marginTop: 10,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 3,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 10,
    },
    inputCard: {
        backgroundColor: COLORS.card,
        borderRadius: 24,
        padding: 30,
        marginBottom: 35,
        borderWidth: 1,
        borderColor: '#111',
    },
    amountHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        marginBottom: 15,
    },
    amountLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        textTransform: 'uppercase',
    },
    amountInput: {
        fontSize: 48,
        fontWeight: 'bold',
        color: COLORS.text,
        padding: 0,
        letterSpacing: -1,
    },
    section: {
        marginBottom: 35,
    },
    label: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 20,
    },
    input: {
        backgroundColor: COLORS.card,
        color: COLORS.text,
        padding: 20,
        borderRadius: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#111',
        marginBottom: 15,
    },
    smsInput: {
        backgroundColor: COLORS.card,
        color: COLORS.textSecondary,
        padding: 20,
        borderRadius: 16,
        fontSize: 13,
        borderWidth: 1,
        borderColor: '#111',
        borderStyle: 'dashed',
        height: 80,
    },
    imagePickerGroup: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    imagePickerButton: {
        flex: 1,
        backgroundColor: COLORS.card,
        paddingVertical: 20,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#111',
        alignItems: 'center',
        gap: 10,
    },
    imagePickerText: {
        color: COLORS.text,
        fontWeight: 'bold',
        fontSize: 12,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    statusBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 209, 255, 0.05)',
        padding: 15,
        borderRadius: 16,
        marginBottom: 35,
        borderWidth: 1,
        borderColor: COLORS.primary,
        gap: 12,
    },
    statusText: {
        flex: 1,
        color: COLORS.primary,
        fontSize: 13,
        fontWeight: 'bold',
    },
    categoryScroll: {
        marginTop: 5,
    },
    categoryBadge: {
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 30,
        backgroundColor: COLORS.card,
        marginRight: 12,
        borderWidth: 1,
        borderColor: '#111',
    },
    categoryBadgeActive: {
        backgroundColor: COLORS.text,
        borderColor: COLORS.text,
    },
    categoryText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    categoryTextActive: {
        color: '#000',
    },
    itemsCard: {
        backgroundColor: COLORS.card,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#111',
    },
    itemRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        paddingVertical: 10,
    },
    itemText: {
        color: COLORS.textSecondary,
        fontSize: 14,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 22,
        borderRadius: 24,
        alignItems: 'center',
        marginBottom: 40,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.3,
        shadowRadius: 20,
    },
    submitContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    submitButtonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    disabledButton: {
        opacity: 0.5,
    },
    bulkHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    bulkRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
    },
    bulkLeft: {
        flex: 1,
    },
    bulkRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 15,
    },
    removeBulkButton: {
        padding: 5,
    },
    bulkVendor: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    bulkCategory: {
        color: COLORS.textSecondary,
        fontSize: 12,
        marginTop: 2,
    },
    bulkAmount: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    pickerLabelRow: {
        display: 'none', // Labels are handled by section label
    },
    pickerLabel: {
        display: 'none',
    },
    taxInfoBox: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.card,
        padding: 15,
        borderRadius: 16,
        marginBottom: 25,
        borderWidth: 1,
        borderColor: COLORS.success + '20',
    },
    taxInfoLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    taxInfoText: {
        color: COLORS.text,
        fontSize: 13,
    },
});

export default AddExpense;
