import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, Modal, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import { X, Receipt, Search, ZoomIn } from 'lucide-react-native';
import { format } from 'date-fns';

const { width } = Dimensions.get('window');
// Removing grid constants since we are moving to a list
import { FileText, ChevronRight } from 'lucide-react-native';

const ReceiptGallery = () => {
    const { expenses } = useStore();
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    // Filter expenses that have receipts
    const receiptExpenses = expenses.filter(e => e.receipt_image_base64);

    const renderItem = ({ item }: { item: any }) => (
        <TouchableOpacity
            style={styles.transactionItem}
            onPress={() => setSelectedImage(item.receipt_image_base64)}
            activeOpacity={0.7}
        >
            <View style={styles.itemLeft}>
                <View style={styles.iconContainer}>
                    <FileText color={COLORS.primary} size={20} />
                </View>
                <View style={styles.txInfo}>
                    <Text style={styles.txVendor}>{item.vendor || 'Unknown Vendor'}</Text>
                    <Text style={styles.txDate}>{format(new Date(item.date), 'dd MMM yyyy')}</Text>
                </View>
            </View>
            <View style={styles.itemRight}>
                <Text style={styles.txAmount}>₹{item.amount.toLocaleString()}</Text>
                <ChevronRight color={COLORS.textSecondary} size={16} />
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
                    numColumns={1}
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
    transactionItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 18,
        borderBottomWidth: 1,
        borderBottomColor: '#111',
    },
    itemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconContainer: {
        width: 44,
        height: 44,
        borderRadius: 12,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#111',
    },
    txInfo: {
        gap: 4,
    },
    txVendor: {
        color: COLORS.text,
        fontSize: 15,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    txDate: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
    },
    itemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    txAmount: {
        color: COLORS.text,
        fontSize: 16,
        fontWeight: 'bold',
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
