import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import { X, Receipt, Search, ZoomIn } from 'lucide-react-native';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
const COLUMN_COUNT = 2;
const ITEM_WIDTH = (width - 48 - 12) / COLUMN_COUNT;

const ReceiptGallery = () => {
    const { expenses } = useStore();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Filter expenses that have receipts
    const receiptExpenses = expenses.filter(e => e.receipt_image_base64);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.receiptItem}
            onPress={() => setSelectedImage(item.receipt_image_base64)}
        >
            <Image
                source={{ uri: `data:image/jpeg;base64,${item.receipt_image_base64}` }}
                style={styles.receiptImage}
            />
            <View style={styles.receiptOverlay}>
                <Text style={styles.receiptAmount}>₹{item.amount.toLocaleString()}</Text>
                <Text style={styles.receiptDate}>{format(new Date(item.date), 'MMM dd, yyyy')}</Text>
                <Text style={styles.receiptVendor} numberOfLines={1}>{item.vendor || 'Unknown Vendor'}</Text>
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <View>
                    <Text style={styles.title}>RECEIPT GALLERY</Text>
                    <Text style={styles.subtitle}>{receiptExpenses.length} SCANNED RECEIPTS</Text>
                </View>
                <TouchableOpacity style={styles.iconButton}>
                    <Search color={COLORS.text} size={20} />
                </TouchableOpacity>
            </View>

            {receiptExpenses.length > 0 ? (
                <FlatList
                    data={receiptExpenses}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={COLUMN_COUNT}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                />
            ) : (
                <View style={styles.emptyContainer}>
                    <Receipt color="#111" size={80} strokeWidth={1} />
                    <Text style={styles.emptyText}>NO RECEIPTS YET</Text>
                    <Text style={styles.emptySubtext}>Scan a receipt in the 'Add' section to see it here.</Text>
                </View>
            )}

            <Modal visible={!!selectedImage} transparent={true} animationType="fade">
                <View style={styles.modalOverlay}>
                    <TouchableOpacity
                        style={styles.closeButton}
                        onPress={() => setSelectedImage(null)}
                    >
                        <X color="white" size={30} />
                    </TouchableOpacity>
                    {selectedImage && (
                        <Image
                            source={{ uri: `data:image/jpeg;base64,${selectedImage}` }}
                            style={styles.fullImage}
                            resizeMode="contain"
                        />
                    )}
                </View>
            </Modal>
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
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 24,
        paddingVertical: 20,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 4,
    },
    subtitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        marginTop: 4,
        letterSpacing: -0.5,
    },
    iconButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#111',
    },
    listContent: {
        paddingHorizontal: 24,
        paddingBottom: 100,
    },
    receiptItem: {
        width: ITEM_WIDTH,
        height: ITEM_WIDTH * 1.4,
        marginBottom: 12,
        marginRight: 12,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: COLORS.card,
        borderWidth: 1,
        borderColor: '#111',
    },
    receiptImage: {
        width: '100%',
        height: '100%',
        opacity: 0.6,
    },
    receiptOverlay: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        padding: 12,
        backgroundColor: 'rgba(0,0,0,0.6)',
    },
    receiptAmount: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
    },
    receiptDate: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 2,
    },
    receiptVendor: {
        color: COLORS.primary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginTop: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
    },
    emptyText: {
        color: '#222',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 3,
        marginTop: 20,
    },
    emptySubtext: {
        color: COLORS.textSecondary,
        fontSize: 14,
        textAlign: 'center',
        marginTop: 8,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'black',
        justifyContent: 'center',
        alignItems: 'center',
    },
    fullImage: {
        width: '100%',
        height: '100%',
    },
    closeButton: {
        position: 'absolute',
        top: 60,
        right: 24,
        zIndex: 10,
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default ReceiptGallery;
