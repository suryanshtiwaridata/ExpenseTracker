import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert, ActivityIndicator, Platform, Modal, RefreshControl, Switch, KeyboardAvoidingView, Keyboard } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';
import { useStore } from '../../store/useStore';
import { Camera, Image as ImageIcon, Plus, Info, Tag, IndianRupee, Clock, CheckCircle2, XCircle, FileText, Wallet, Calendar, AlertTriangle, ShieldCheck, Receipt, Edit } from 'lucide-react-native';
import { Swipeable, GestureHandlerRootView } from 'react-native-gesture-handler';
import { GST_SLABS, CATEGORY_GST_DEFAULTS } from '../../constants/gst_rates';

const CATEGORIES = ['Food Delivery', 'Groceries', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 'Others'];
const PAYMENT_MODES = ['upi', 'card', 'cash'];

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import DateTimePicker from '@react-native-community/datetimepicker';

const AddExpense = ({ navigation, route }: { navigation: any, route?: any }) => {
    const editExpense = route?.params?.editExpense;
    const { user, budgets } = useStore();

    const [amount, setAmount] = useState(editExpense?.amount.toString() || '');
    const [category, setCategory] = useState(editExpense?.category || CATEGORIES[0]);
    const [paymentMode, setPaymentMode] = useState(editExpense?.payment_mode || PAYMENT_MODES[0]);
    const [taxAmount, setTaxAmount] = useState(editExpense?.tax_amount?.toString() || '0.00');
    const [taxType, setTaxType] = useState<string | null>(editExpense?.tax_type || null);
    const [description, setDescription] = useState(editExpense?.description || '');
    const [vendor, setVendor] = useState(editExpense?.vendor || '');
    const [items, setItems] = useState<string[]>(editExpense?.items || []);
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(editExpense?.receipt_image_base64 || null);
    const [parsing, setParsing] = useState(false);
    const [smsText, setSmsText] = useState('');
    const [lineItems, setLineItems] = useState<{ name: string; price: number; cgst?: number; sgst?: number; igst?: number; gstRate?: number }[]>(editExpense?.line_items || []);
    const [gstDetails, setGstDetails] = useState<{ cgst: number; sgst: number; igst: number; total_gst: number } | null>(editExpense?.gst_details || null);
    const [bulkExpenses, setBulkExpenses] = useState<any[]>([]);
    const [date, setDate] = useState(editExpense?.date ? new Date(editExpense.date) : new Date());
    const [isTaxDeductible, setIsTaxDeductible] = useState(editExpense?.is_tax_deductible || false);
    const [originalOcrData, setOriginalOcrData] = useState<any>(null);
    const [confidenceScores, setConfidenceScores] = useState<any>({});
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [isItemTaxModalVisible, setIsItemTaxModalVisible] = useState(false);
    const [selectedItemIndex, setSelectedItemIndex] = useState<number | null>(null);
    const [itemCgst, setItemCgst] = useState('');
    const [itemSgst, setItemSgst] = useState('');
    const [itemIgst, setItemIgst] = useState('');
    const [itemGstRate, setItemGstRate] = useState(18);
    const [isTaxInclusive, setIsTaxInclusive] = useState(true);
    const [isGlobalTaxModalVisible, setIsGlobalTaxModalVisible] = useState(false);
    const [globalTaxRate, setGlobalTaxRate] = useState(18);
    const [refreshing, setRefreshing] = useState(false);

    const resetState = () => {
        setAmount('');
        setDescription('');
        setVendor('');
        setItems([]);
        setLineItems([]);
        setGstDetails(null);
        setImage(null);
        setCategory(CATEGORIES[0]);
        setPaymentMode(PAYMENT_MODES[0]);
        setTaxAmount('0.00');
        setTaxType(null);
        setDate(new Date());
        setIsTaxDeductible(false);
    };

    // Handle initial state setup and resets
    React.useEffect(() => {
        if (editExpense) {
            setAmount(editExpense.amount.toString());
            setCategory(editExpense.category);
            setPaymentMode(editExpense.payment_mode || PAYMENT_MODES[0]);
            setTaxAmount(editExpense.tax_amount?.toString() || '0.00');
            setTaxType(editExpense.tax_type || null);
            setDescription(editExpense.description || '');
            setVendor(editExpense.vendor || '');
            setItems(editExpense.items || []);
            setImage(editExpense.receipt_image_base64 || null);
            setLineItems(editExpense.line_items || []);
            setGstDetails(editExpense.gst_details || null);
            setDate(new Date(editExpense.date));
            setIsTaxDeductible(editExpense.is_tax_deductible || false);
        }
    }, [editExpense]);

    // Reset when tab is focused and not in edit mode
    useFocusEffect(
        React.useCallback(() => {
            if (!editExpense && !amount && !vendor) {
                // Already likely fresh or first load
            }
            return () => { };
        }, [editExpense])
    );

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
                setTaxType(response.data.tax_type || 'GST');
            }
            if (response.data.scanned_image) {
                setImage(response.data.scanned_image);
            }
            if (response.data.line_items) {
                setLineItems(response.data.line_items);
            }
            if (response.data.gst_details) {
                setGstDetails(response.data.gst_details);
            }
            if (response.data.date) {
                setDate(new Date(response.data.date));
            }
            if (response.data.confidence_scores) {
                setConfidenceScores(response.data.confidence_scores);
            }
            // Store the "un-edited" version for feedback learning
            setOriginalOcrData(response.data);
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
            if (response.data.date) {
                setDate(new Date(response.data.date));
            }
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

    const onDateChange = (event: any, selectedDate?: Date) => {
        setShowDatePicker(Platform.OS === 'ios');
        if (selectedDate) {
            setDate(selectedDate);
        }
    };

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        resetState();
        navigation.setParams({ editExpense: undefined });
        // Simulate a small delay for the animation
        setTimeout(() => setRefreshing(false), 800);
    }, []);

    const handleSubmit = async () => {
        if (!amount) {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                amount: parseFloat(amount) || 0,
                date: date.toISOString(),
                category,
                payment_mode: paymentMode,
                tax_amount: parseFloat(taxAmount) || 0,
                tax_type: taxType,
                description,
                vendor,
                items,
                line_items: lineItems,
                gst_details: gstDetails,
                source: image ? 'receipt' : (editExpense?.source || 'manual'),
                receipt_image_base64: image,
                is_tax_deductible: isTaxDeductible,
                original_ocr_data: originalOcrData,
                currency: 'INR',
            };

            if (editExpense) {
                await client.put(`/expenses/${editExpense.id}`, payload);
                Alert.alert('Success', 'Expense updated!');
            } else {
                await client.post('/expenses/', payload);
                Alert.alert('Success', 'Expense added!');
            }

            // Always reset state after save
            setAmount('');
            setDescription('');
            setVendor('');
            setItems([]);
            setLineItems([]);
            setGstDetails(null);
            setImage(null);
            setCategory(CATEGORIES[0]);
            setPaymentMode(PAYMENT_MODES[0]);
            setTaxAmount('0.00');
            setTaxType(null);
            setDate(new Date());
            setIsTaxDeductible(false);

            // Clear the edit parameter so it doesn't open in edit mode next time
            navigation.setParams({ editExpense: undefined });

            navigation.navigate('Home', { refresh: true });
        } catch (error) {
            console.error('Failed to save expense', error);
            Alert.alert('Error', 'Failed to save expense');
        } finally {
            setLoading(false);
        }
    };

    const budgetForCategory = budgets.find(b => b.category === category);
    const isOverBudget = budgetForCategory && (budgetForCategory.current_spent + (parseFloat(amount) || 0) > budgetForCategory.monthly_limit);

    const openItemTaxModal = (index: number) => {
        setSelectedItemIndex(index);
        const item = lineItems[index];
        setItemCgst(item.cgst?.toString() || '');
        setItemSgst(item.sgst?.toString() || '');
        setItemIgst(item.igst?.toString() || '');
        setItemGstRate(item.gstRate || CATEGORY_GST_DEFAULTS[category] || 18);
        setIsTaxInclusive(true); // Default to retail behavior
        setIsItemTaxModalVisible(true);
    };

    const calculateGst = (rate: number, inclusive: boolean) => {
        if (selectedItemIndex === null) return;
        const item = lineItems[selectedItemIndex];
        const price = item.price;

        if (inclusive) {
            // Price = Base + GST -> Base = Price / (1 + Rate/100)
            const basePrice = price / (1 + rate / 100);
            const totalGst = price - basePrice;
            setItemCgst((totalGst / 2).toFixed(2));
            setItemSgst((totalGst / 2).toFixed(2));
            setItemIgst('0.00');
        } else {
            // Price = Base -> GST = Base * (Rate/100)
            const totalGst = price * (rate / 100);
            setItemCgst((totalGst / 2).toFixed(2));
            setItemSgst((totalGst / 2).toFixed(2));
            setItemIgst('0.00');
        }
    };

    const handleRateChange = (rate: number) => {
        setItemGstRate(rate);
        calculateGst(rate, isTaxInclusive);
    };

    const handleModeChange = (inclusive: boolean) => {
        setIsTaxInclusive(inclusive);
        calculateGst(itemGstRate, inclusive);
    };

    const saveItemTax = () => {
        if (selectedItemIndex === null) return;

        const newLineItems = [...lineItems];
        const cgstVal = parseFloat(itemCgst) || 0;
        const sgstVal = parseFloat(itemSgst) || 0;
        const igstVal = parseFloat(itemIgst) || 0;

        // If exclusive mode, we need to update the item price to include tax
        let finalPrice = newLineItems[selectedItemIndex].price;
        if (!isTaxInclusive) {
            finalPrice = finalPrice + cgstVal + sgstVal + igstVal;
        }

        newLineItems[selectedItemIndex] = {
            ...newLineItems[selectedItemIndex],
            price: finalPrice,
            cgst: cgstVal,
            sgst: sgstVal,
            igst: igstVal,
            gstRate: itemGstRate
        };
        setLineItems(newLineItems);

        // Sync with global tax details
        const totalCgst = newLineItems.reduce((acc, curr) => acc + (curr.cgst || 0), 0);
        const totalSgst = newLineItems.reduce((acc, curr) => acc + (curr.sgst || 0), 0);
        const totalIgst = newLineItems.reduce((acc, curr) => acc + (curr.igst || 0), 0);

        const newGstDetails = {
            cgst: totalCgst,
            sgst: totalSgst,
            igst: totalIgst,
            total_gst: totalCgst + totalSgst + totalIgst
        };

        setGstDetails(newGstDetails);
        setTaxAmount(newGstDetails.total_gst.toString());

        // Update total amount if we added tax
        if (!isTaxInclusive) {
            const newTotalAmount = newLineItems.reduce((acc, curr) => acc + curr.price, 0);
            setAmount(newTotalAmount.toString());
        }

        setIsItemTaxModalVisible(false);
    };

    const handleMarkAsTax = (type: 'cgst' | 'sgst' | 'igst') => {
        if (selectedItemIndex === null) return;
        const item = lineItems[selectedItemIndex];
        const price = item.price;

        // Add to global GST details
        const newGstDetails = { ...(gstDetails || { cgst: 0, sgst: 0, igst: 0, total_gst: 0 }) };
        newGstDetails[type] += price;
        newGstDetails.total_gst += price;

        setGstDetails(newGstDetails);
        setTaxAmount(newGstDetails.total_gst.toFixed(2));
        setTaxType('GST');

        // Remove from line items
        const newLineItems = lineItems.filter((_, i) => i !== selectedItemIndex);
        setLineItems(newLineItems);

        setIsItemTaxModalVisible(false);
        setSelectedItemIndex(null);
    };

    const applyGlobalTax = (rate: number, inclusive: boolean) => {
        const totalAmount = parseFloat(amount) || 0;
        let calculatedGst = 0;

        if (inclusive) {
            // Price includes tax: Base = Total / (1 + Rate/100)
            const basePrice = totalAmount / (1 + rate / 100);
            calculatedGst = totalAmount - basePrice;
        } else {
            // Price is base: GST = Total * (Rate/100)
            calculatedGst = totalAmount * (rate / 100);
            setAmount((totalAmount + calculatedGst).toString());
        }

        const halfTax = calculatedGst / 2;
        const newGstDetails = {
            cgst: halfTax,
            sgst: halfTax,
            igst: 0,
            total_gst: calculatedGst
        };

        setGstDetails(newGstDetails);
        setTaxAmount(calculatedGst.toFixed(2));
        setTaxType('GST');
        setIsGlobalTaxModalVisible(false);
    };

    const renderRightActions = (index: number) => (
        <TouchableOpacity
            style={styles.swipeTaxAction}
            onPress={() => openItemTaxModal(index)}
        >
            <Receipt color="white" size={20} />
            <Text style={styles.swipeTaxText}>TAX</Text>
        </TouchableOpacity>
    );

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <SafeAreaView style={styles.container}>
                <KeyboardAwareScrollView
                    style={{ flex: 1 }}
                    contentContainerStyle={styles.content}
                    showsVerticalScrollIndicator={false}
                    keyboardShouldPersistTaps="handled"
                    extraScrollHeight={100}
                    enableOnAndroid={true}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            tintColor={COLORS.primary}
                            title="Pull to Clear Form"
                            titleColor={COLORS.textSecondary}
                        />
                    }
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>{editExpense ? 'Update Expense' : 'New Expense'}</Text>
                        <Text style={styles.subtitle}>{editExpense ? 'Refine your transaction details' : 'Fill in details or scan a receipt'}</Text>
                    </View>

                    <View style={styles.inputCard}>
                        <View style={styles.amountHeader}>
                            <Text style={styles.amountLabel}>Amount (INR)</Text>
                        </View>
                        <TextInput
                            style={[styles.amountInput, confidenceScores.amount < 0.8 && styles.lowConfidenceGlow]}
                            placeholder="0"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="numeric"
                            value={amount}
                            onChangeText={(val) => {
                                setAmount(val);
                                if (confidenceScores.amount < 0.8) setConfidenceScores({ ...confidenceScores, amount: 1.0 });
                            }}
                        />
                        {confidenceScores.amount < 0.8 && <Text style={styles.trainingTag}>Learning needed - Please verify</Text>}
                    </View>

                    {isOverBudget && (
                        <View style={styles.budgetWarning}>
                            <AlertTriangle color={COLORS.danger} size={16} />
                            <Text style={styles.budgetWarningText}>
                                This expense will exceed your ₹{budgetForCategory.monthly_limit.toLocaleString()} budget for {category}!
                            </Text>
                        </View>
                    )}

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
                        <Text style={styles.label}>Date Of Transaction</Text>
                        <TouchableOpacity
                            style={styles.inputContainer}
                            onPress={() => setShowDatePicker(true)}
                            activeOpacity={0.7}
                        >
                            <Calendar color={COLORS.primary} size={18} />
                            <Text style={styles.dateText}>
                                {date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </Text>
                        </TouchableOpacity>

                        {showDatePicker && (
                            Platform.OS === 'ios' ? (
                                <Modal transparent animationType="slide" visible={showDatePicker}>
                                    <View style={styles.modalOverlay}>
                                        <View style={styles.datePickerModal}>
                                            <View style={styles.modalHeader}>
                                                <Text style={styles.modalTitle}>Select Date</Text>
                                                <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                                                    <XCircle color={COLORS.primary} size={24} />
                                                </TouchableOpacity>
                                            </View>
                                            <DateTimePicker
                                                value={date}
                                                mode="date"
                                                display="spinner"
                                                onChange={onDateChange}
                                                maximumDate={new Date()}
                                                textColor="white"
                                            />
                                            <TouchableOpacity
                                                style={styles.modalButton}
                                                onPress={() => setShowDatePicker(false)}
                                            >
                                                <Text style={styles.modalButtonText}>Done</Text>
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                </Modal>
                            ) : (
                                <DateTimePicker
                                    value={date}
                                    mode="date"
                                    display="default"
                                    onChange={onDateChange}
                                    maximumDate={new Date()}
                                />
                            )
                        )}
                    </View>

                    <View style={[styles.section, { marginTop: -10 }]}>
                        <Text style={styles.label}>Vendor, Category & Mode</Text>
                        <TextInput
                            style={[styles.input, confidenceScores.vendor < 0.8 && styles.lowConfidenceGlow]}
                            placeholder="Vendor Name (e.g. Starbucks)"
                            placeholderTextColor={COLORS.textSecondary}
                            value={vendor}
                            onChangeText={(val) => {
                                setVendor(val);
                                if (confidenceScores.vendor < 0.8) setConfidenceScores({ ...confidenceScores, vendor: 1.0 });
                            }}
                        />
                        {confidenceScores.vendor < 0.8 && <Text style={[styles.trainingTag, { marginTop: -10, marginBottom: 15 }]}>Learning from previous corrections...</Text>}

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
                            <View style={{ flexDirection: 'row', gap: 10 }}>
                                <TouchableOpacity onPress={() => setIsGlobalTaxModalVisible(true)}>
                                    <Plus color={COLORS.primary} size={16} />
                                </TouchableOpacity>
                                <TouchableOpacity onPress={() => setTaxAmount('0.00')}>
                                    <XCircle color={COLORS.textSecondary} size={16} />
                                </TouchableOpacity>
                            </View>
                        </View>
                    )}

                    {!taxType && (
                        <TouchableOpacity
                            style={[styles.taxInfoBox, { borderColor: '#111', borderStyle: 'dashed' }]}
                            onPress={() => setIsGlobalTaxModalVisible(true)}
                        >
                            <View style={styles.taxInfoLeft}>
                                <IndianRupee color={COLORS.textSecondary} size={16} />
                                <Text style={[styles.taxInfoText, { color: COLORS.textSecondary }]}>Add GST Calculation on Total</Text>
                            </View>
                            <Plus color={COLORS.textSecondary} size={16} />
                        </TouchableOpacity>
                    )}

                    {lineItems.length > 0 && (
                        <View style={styles.section}>
                            <Text style={styles.label}>Itemized Breakdown</Text>
                            <View style={styles.itemsCard}>
                                {/* Itemized rows hidden per user request to simplify UI */}
                                {gstDetails && (gstDetails.cgst > 0 || gstDetails.sgst > 0 || gstDetails.igst > 0) && (
                                    <View style={styles.gstDivider}>
                                        {gstDetails.cgst > 0 && (
                                            <View style={styles.gstRow}>
                                                <Text style={styles.gstLabel}>CGST</Text>
                                                <Text style={styles.gstValue}>₹{gstDetails.cgst.toLocaleString()}</Text>
                                            </View>
                                        )}
                                        {gstDetails.sgst > 0 && (
                                            <View style={styles.gstRow}>
                                                <Text style={styles.gstLabel}>SGST</Text>
                                                <Text style={styles.gstValue}>₹{gstDetails.sgst.toLocaleString()}</Text>
                                            </View>
                                        )}
                                        {gstDetails.igst > 0 && (
                                            <View style={styles.gstRow}>
                                                <Text style={styles.gstLabel}>IGST</Text>
                                                <Text style={styles.gstValue}>₹{gstDetails.igst.toLocaleString()}</Text>
                                            </View>
                                        )}
                                    </View>
                                )}
                            </View>
                        </View>
                    )}

                    <Modal visible={isItemTaxModalVisible} transparent animationType="slide">
                        <KeyboardAvoidingView
                            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                            style={styles.modalOverlay}
                        >
                            <TouchableOpacity
                                style={styles.modalDismissArea}
                                activeOpacity={1}
                                onPress={() => setIsItemTaxModalVisible(false)}
                            />
                            <View style={styles.taxModalContent}>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>Item Tax Entry</Text>
                                        <Text style={styles.modalSubtitle}>
                                            {selectedItemIndex !== null && lineItems[selectedItemIndex] ? lineItems[selectedItemIndex].name : 'Unknown Item'}
                                        </Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setIsItemTaxModalVisible(false)}>
                                        <XCircle color={COLORS.primary} size={28} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.taxModeSection}>
                                    <Text style={styles.taxInputLabel}>Calculation Mode</Text>
                                    <View style={styles.taxModeToggleRow}>
                                        <TouchableOpacity
                                            style={[styles.taxModeOption, isTaxInclusive && styles.taxModeOptionActive]}
                                            onPress={() => handleModeChange(true)}
                                        >
                                            <CheckCircle2 color={isTaxInclusive ? '#000' : COLORS.textSecondary} size={16} />
                                            <Text style={[styles.taxModeText, isTaxInclusive && styles.taxModeTextActive]}>Inclusive</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={[styles.taxModeOption, !isTaxInclusive && styles.taxModeOptionActive]}
                                            onPress={() => handleModeChange(false)}
                                        >
                                            <Plus color={!isTaxInclusive ? '#000' : COLORS.textSecondary} size={16} />
                                            <Text style={[styles.taxModeText, !isTaxInclusive && styles.taxModeTextActive]}>Exclusive</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <View style={styles.taxInputGroup}>
                                    <Text style={styles.taxInputLabel}>GST Rate (2026 Slabs)</Text>
                                    <View style={styles.rateSelectorRow}>
                                        {GST_SLABS.map((slab) => (
                                            <TouchableOpacity
                                                key={slab.value}
                                                style={[styles.rateBadge, itemGstRate === slab.value && styles.rateBadgeActive]}
                                                onPress={() => handleRateChange(slab.value)}
                                            >
                                                <Text style={[styles.rateText, itemGstRate === slab.value && styles.rateTextActive]}>
                                                    {slab.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.taxCalculatedGrid}>
                                    <View style={styles.taxInputItemWrapper}>
                                        <Text style={styles.taxInputLabel}>CGST</Text>
                                        <TextInput
                                            style={styles.taxInputItemSmall}
                                            keyboardType="numeric"
                                            returnKeyType="done"
                                            value={itemCgst}
                                            onChangeText={setItemCgst}
                                            placeholder="0.00"
                                            placeholderTextColor={COLORS.textSecondary}
                                            onSubmitEditing={() => Keyboard.dismiss()}
                                        />
                                    </View>
                                    <View style={styles.taxInputItemWrapper}>
                                        <Text style={styles.taxInputLabel}>SGST</Text>
                                        <TextInput
                                            style={styles.taxInputItemSmall}
                                            keyboardType="numeric"
                                            returnKeyType="done"
                                            value={itemSgst}
                                            onChangeText={setItemSgst}
                                            placeholder="0.00"
                                            placeholderTextColor={COLORS.textSecondary}
                                            onSubmitEditing={() => Keyboard.dismiss()}
                                        />
                                    </View>
                                </View>

                                <View style={styles.taxInputGroup}>
                                    <Text style={styles.taxInputLabel}>IGST Amount (Inter-state)</Text>
                                    <TextInput
                                        style={styles.taxInputItem}
                                        keyboardType="numeric"
                                        returnKeyType="done"
                                        value={itemIgst}
                                        onChangeText={setItemIgst}
                                        placeholder="0.00"
                                        placeholderTextColor={COLORS.textSecondary}
                                        onSubmitEditing={() => saveItemTax()}
                                    />
                                </View>

                                <View style={styles.taxMarkSection}>
                                    <Text style={styles.taxInputLabel}>Identify as Tax Line</Text>
                                    <View style={styles.taxModeToggleRow}>
                                        <TouchableOpacity
                                            style={styles.taxMarkOption}
                                            onPress={() => handleMarkAsTax('cgst')}
                                        >
                                            <ShieldCheck color={COLORS.success} size={14} />
                                            <Text style={styles.taxMarkText}>Mark CGST</Text>
                                        </TouchableOpacity>
                                        <TouchableOpacity
                                            style={styles.taxMarkOption}
                                            onPress={() => handleMarkAsTax('sgst')}
                                        >
                                            <ShieldCheck color={COLORS.success} size={14} />
                                            <Text style={styles.taxMarkText}>Mark SGST</Text>
                                        </TouchableOpacity>
                                    </View>
                                </View>

                                <TouchableOpacity style={styles.modalButton} onPress={saveItemTax}>
                                    <Text style={styles.modalButtonText}>Log Item GST</Text>
                                </TouchableOpacity>
                            </View>
                        </KeyboardAvoidingView>
                    </Modal>

                    <Modal visible={isGlobalTaxModalVisible} transparent animationType="slide">
                        <View style={styles.modalOverlay}>
                            <View style={styles.taxModalContent}>
                                <View style={styles.modalHeader}>
                                    <View>
                                        <Text style={styles.modalTitle}>Global GST Calculator</Text>
                                        <Text style={styles.modalSubtitle}>Apply to total: ₹{amount}</Text>
                                    </View>
                                    <TouchableOpacity onPress={() => setIsGlobalTaxModalVisible(false)}>
                                        <XCircle color={COLORS.primary} size={28} />
                                    </TouchableOpacity>
                                </View>

                                <View style={styles.taxInputGroup}>
                                    <Text style={styles.taxInputLabel}>Select GST Slab</Text>
                                    <View style={styles.rateSelectorRow}>
                                        {GST_SLABS.map((slab) => (
                                            <TouchableOpacity
                                                key={slab.value}
                                                style={[styles.rateBadge, globalTaxRate === slab.value && styles.rateBadgeActive]}
                                                onPress={() => setGlobalTaxRate(slab.value)}
                                            >
                                                <Text style={[styles.rateText, globalTaxRate === slab.value && styles.rateTextActive]}>
                                                    {slab.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                <View style={styles.taxModeToggleRow}>
                                    <TouchableOpacity
                                        onPress={() => applyGlobalTax(globalTaxRate, true)}
                                        style={[styles.modalButton, { flex: 1, marginTop: 0, backgroundColor: COLORS.surface }]}
                                    >
                                        <Text style={[styles.modalButtonText, { color: COLORS.text }]}>Inclusive</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => applyGlobalTax(globalTaxRate, false)}
                                        style={[styles.modalButton, { flex: 1, marginTop: 0 }]}
                                    >
                                        <Text style={styles.modalButtonText}>Exclusive</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <View style={styles.section}>
                        <View style={styles.taxToggleContainer}>
                            <View style={styles.taxToggleLeft}>
                                <ShieldCheck color={isTaxDeductible ? COLORS.success : COLORS.textSecondary} size={24} />
                                <View style={{ marginLeft: 15 }}>
                                    <Text style={styles.taxToggleTitle}>Tax Deductible</Text>
                                    <Text style={styles.taxToggleSubtitle}>Flag for tax audit & GST reconciliation</Text>
                                </View>
                            </View>
                            <Switch
                                value={isTaxDeductible}
                                onValueChange={setIsTaxDeductible}
                                trackColor={{ false: '#222', true: COLORS.success + '44' }}
                                thumbColor={isTaxDeductible ? COLORS.success : '#444'}
                            />
                        </View>
                    </View>

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
        </GestureHandlerRootView>
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
    headerTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    inputCard: {
        backgroundColor: COLORS.surface,
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: '#111',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.background,
        borderRadius: 16,
        paddingHorizontal: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#111',
    },
    taxToggleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#111',
    },
    taxToggleLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    taxToggleTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    taxToggleSubtitle: {
        fontSize: 10,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    dateText: {
        flex: 1,
        color: COLORS.text,
        fontSize: 16,
        paddingVertical: 18,
        paddingLeft: 12,
        fontWeight: 'bold',
    },
    datePickerModal: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 30,
        paddingBottom: 50,
        borderWidth: 1,
        borderColor: '#222',
        width: '100%',
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
        justifyContent: 'space-between',
        paddingVertical: 10,
    },
    itemInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    itemText: {
        color: COLORS.textSecondary,
        fontSize: 14,
        flex: 1,
    },
    itemPrice: {
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
    },
    gstDivider: {
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: '#1A1A1A',
        gap: 6,
    },
    gstRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    gstLabel: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    gstValue: {
        color: COLORS.textSecondary,
        fontSize: 12,
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
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
        alignItems: 'center',
    },
    modalDismissArea: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        width: '100%',
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    modalButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 20,
        width: '100%',
    },
    modalButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    budgetWarning: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 68, 68, 0.1)',
        padding: 16,
        borderRadius: 16,
        marginBottom: 25,
        gap: 12,
        borderWidth: 1,
        borderColor: 'rgba(255, 68, 68, 0.2)',
    },
    budgetWarningText: {
        flex: 1,
        color: COLORS.danger,
        fontSize: 12,
        fontWeight: 'bold',
    },
    lowConfidenceGlow: {
        borderColor: COLORS.warning + '88',
        backgroundColor: COLORS.warning + '08',
    },
    trainingTag: {
        fontSize: 10,
        color: COLORS.warning,
        fontWeight: 'bold',
        marginTop: 10,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    swipeTaxAction: {
        backgroundColor: COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        borderRadius: 0,
    },
    swipeTaxText: {
        color: 'white',
        fontSize: 10,
        fontWeight: 'bold',
        marginTop: 4,
    },
    itemTaxLine: {
        fontSize: 10,
        color: COLORS.success,
        marginTop: 4,
        fontWeight: 'bold',
    },
    taxModalContent: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 30,
        paddingBottom: 50,
        borderWidth: 1,
        borderColor: '#222',
        width: '100%',
    },
    modalSubtitle: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    taxInputGroup: {
        marginBottom: 20,
    },
    taxInputLabel: {
        fontSize: 10,
        color: COLORS.textSecondary,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
        marginBottom: 8,
    },
    taxInputItem: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 15,
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#111',
    },
    taxModeSection: {
        marginBottom: 25,
    },
    taxModeToggleRow: {
        flexDirection: 'row',
        gap: 12,
        marginTop: 10,
    },
    taxModeOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#111',
    },
    taxModeOptionActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    taxModeText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
    },
    taxModeTextActive: {
        color: '#000',
    },
    rateSelectorRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 10,
    },
    rateBadge: {
        flex: 1,
        backgroundColor: COLORS.surface,
        paddingVertical: 12,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#111',
    },
    rateBadgeActive: {
        backgroundColor: COLORS.text,
        borderColor: COLORS.text,
    },
    rateText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: 'bold',
    },
    rateTextActive: {
        color: '#000',
    },
    taxCalculatedGrid: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 20,
    },
    taxMarkSection: {
        marginTop: 10,
        paddingTop: 15,
        borderTopWidth: 1,
        borderTopColor: '#222',
        marginBottom: 20,
    },
    taxMarkOption: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        backgroundColor: 'rgba(0, 255, 127, 0.05)',
        paddingVertical: 10,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: 'rgba(0, 255, 127, 0.2)',
    },
    taxMarkText: {
        color: COLORS.success,
        fontSize: 11,
        fontWeight: 'bold',
    },
    taxInputItemWrapper: {
        flex: 1,
    },
    taxInputItemSmall: {
        backgroundColor: COLORS.surface,
        borderRadius: 12,
        padding: 15,
        color: COLORS.text,
        fontSize: 14,
        fontWeight: 'bold',
        borderWidth: 1,
        borderColor: '#111',
        marginTop: 8,
    },
});

export default AddExpense;
