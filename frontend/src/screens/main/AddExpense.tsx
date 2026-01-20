import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ScrollView, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS } from '../../theme/colors';
import * as ImagePicker from 'expo-image-picker';
import client from '../../api/client';
import { useStore } from '../../store/useStore';

const CATEGORIES = ['Food Delivery', 'Groceries', 'Shopping', 'Transport', 'Entertainment', 'Bills & Utilities', 'Others'];

const AddExpense = ({ navigation }: { navigation: any }) => {
    const [amount, setAmount] = useState('');
    const [category, setCategory] = useState(CATEGORIES[0]);
    const [description, setDescription] = useState('');
    const [loading, setLoading] = useState(false);
    const [image, setImage] = useState<string | null>(null);
    const [parsing, setParsing] = useState(false);
    const [smsText, setSmsText] = useState('');

    const parseReceipt = async (base64Image: string) => {
        setParsing(true);
        try {
            const response = await client.post('/expenses/parse-receipt', { image: base64Image });
            if (response.data.amount) {
                setAmount(response.data.amount.toString());
            }
            if (response.data.description) {
                setDescription(response.data.description);
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
            setSmsText('');
            Alert.alert('Magic!', 'Expense details extracted from SMS');
        } catch (error) {
            console.error('Failed to parse SMS', error);
        } finally {
            setParsing(false);
        }
    };

    const handlePickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
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

    const handleSubmit = async () => {
        if (!amount) {
            Alert.alert('Error', 'Please enter an amount');
            return;
        }

        setLoading(true);
        try {
            await client.post('/expenses/', {
                amount: parseFloat(amount),
                date: new Date().toISOString(),
                category,
                description,
                source: image ? 'receipt' : 'manual',
                receipt_image_base64: image,
                currency: 'INR',
            });

            Alert.alert('Success', 'Expense added!');
            setAmount('');
            setDescription('');
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
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Add Expense</Text>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Magic Paste (SMS)</Text>
                    <TextInput
                        style={[styles.input, styles.smsInput]}
                        placeholder="Paste your bank SMS here..."
                        placeholderTextColor={COLORS.textSecondary}
                        multiline
                        value={smsText}
                        onChangeText={(text) => {
                            setSmsText(text);
                            if (text.length > 20) handleSmsPaste(text);
                        }}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Amount (₹)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="0.00"
                        placeholderTextColor={COLORS.textSecondary}
                        keyboardType="numeric"
                        value={amount}
                        onChangeText={setAmount}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Category</Text>
                    <View style={styles.categoryContainer}>
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
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Description (Optional)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="What was this for?"
                        placeholderTextColor={COLORS.textSecondary}
                        value={description}
                        onChangeText={setDescription}
                    />
                </View>

                <View style={styles.imagePickerGroup}>
                    <TouchableOpacity style={styles.imagePickerButton} onPress={handleCameraCapture}>
                        <Text style={styles.imagePickerText}>📸 Camera</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.imagePickerButton} onPress={handlePickImage}>
                        <Text style={styles.imagePickerText}>🖼️ Gallery</Text>
                    </TouchableOpacity>
                </View>

                {parsing && (
                    <View style={styles.previewContainer}>
                        <Text style={styles.previewText}>🔍 Parsing receipt...</Text>
                    </View>
                )}

                {image && !parsing && (
                    <View style={styles.previewContainer}>
                        <Text style={styles.previewText}>✅ Receipt Attached</Text>
                        <TouchableOpacity onPress={() => setImage(null)}>
                            <Text style={styles.removeText}>Remove</Text>
                        </TouchableOpacity>
                    </View>
                )}

                <TouchableOpacity
                    style={[styles.submitButton, loading && styles.disabledButton]}
                    onPress={handleSubmit}
                    disabled={loading}
                >
                    <Text style={styles.submitButtonText}>{loading ? 'Adding...' : 'Save Expense'}</Text>
                </TouchableOpacity>
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 24,
    },
    inputGroup: {
        marginBottom: 20,
    },
    label: {
        color: COLORS.textSecondary,
        marginBottom: 8,
        fontSize: 14,
    },
    input: {
        backgroundColor: COLORS.surface,
        color: COLORS.text,
        padding: 16,
        borderRadius: 12,
        fontSize: 18,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    smsInput: {
        fontSize: 14,
        height: 60,
        backgroundColor: COLORS.background,
        borderStyle: 'dashed',
    },
    categoryContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    categoryBadge: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.surface,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    categoryBadgeActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    categoryText: {
        color: COLORS.textSecondary,
        fontSize: 12,
    },
    categoryTextActive: {
        color: 'white',
        fontWeight: 'bold',
    },
    imagePickerGroup: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 20,
    },
    imagePickerButton: {
        flex: 1,
        backgroundColor: COLORS.surface,
        padding: 16,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: COLORS.border,
        alignItems: 'center',
    },
    imagePickerText: {
        color: COLORS.text,
        fontWeight: '600',
    },
    previewContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: COLORS.surface,
        padding: 12,
        borderRadius: 12,
        marginBottom: 24,
        borderWidth: 1,
        borderColor: COLORS.success,
    },
    previewText: {
        color: COLORS.success,
        fontWeight: 'bold',
    },
    removeText: {
        color: COLORS.danger,
        fontSize: 12,
    },
    submitButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabledButton: {
        opacity: 0.7,
    }
});

export default AddExpense;
