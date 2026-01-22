import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import { LogOut, User as UserIcon, Settings, Bell, Shield, Lock, ChevronRight, X } from 'lucide-react-native';
import client from '../../api/client';
import { requestNotificationPermissions, getExpoPushToken, sendLocalNotification } from '../../utils/notifications';

const Profile = () => {
    const { user, logout, expenses } = useStore();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);

    const totalSpent = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    const totalItems = expenses.length;

    const handleResetPassword = async () => {
        if (!currentPassword || !newPassword) {
            Alert.alert('Error', 'Please fill in both fields');
            return;
        }
        setResetLoading(true);
        try {
            await client.post('/auth/reset-password', {
                current_password: currentPassword,
                new_password: newPassword,
            });
            Alert.alert('Success', 'Password has been reset');
            setResetModalVisible(false);
            setCurrentPassword('');
            setNewPassword('');
        } catch (error: any) {
            console.error('Reset password failed', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to reset password');
        } finally {
            setResetLoading(false);
        }
    };

    const handleTogglePush = async (value: boolean) => {
        if (value) {
            setNotifLoading(true);
            const hasPermission = await requestNotificationPermissions();
            if (hasPermission) {
                setPushEnabled(true);
                Alert.alert('Notifications Enabled', 'You can now receive local reminders. Attempting to register for push services...');

                // Try to get token in background, but don't block
                getExpoPushToken().then(token => {
                    if (token) {
                        console.log('Push Token:', token);
                    }
                });
            } else {
                setPushEnabled(false);
                Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
            }
            setNotifLoading(false);
        } else {
            setPushEnabled(false);
        }
    };

    const sendTestNotif = async () => {
        if (!pushEnabled) {
            Alert.alert('Error', 'Please enable notifications first');
            return;
        }
        await sendLocalNotification('Expense Tracker', 'This is a test notification! 🚀');
    };

    const MenuItem = ({ icon: Icon, title, onPress, color = COLORS.text, rightElement = null }: { icon: any, title: string, onPress?: () => void, color?: string, rightElement?: React.ReactNode }) => (
        <TouchableOpacity style={styles.menuItem} onPress={onPress} disabled={!onPress}>
            <View style={styles.menuItemLeft}>
                <View style={[styles.iconContainer, { backgroundColor: COLORS.glass }]}>
                    <Icon color={color} size={20} />
                </View>
                <Text style={[styles.menuItemText, { color }]}>{title}</Text>
            </View>
            <View style={styles.menuItemRight}>
                {rightElement || <ChevronRight color={COLORS.textSecondary} size={20} />}
            </View>
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <View style={styles.profileImageContainer}>
                        <View style={styles.profileImagePlaceholder}>
                            <UserIcon color={COLORS.primary} size={40} />
                        </View>
                    </View>
                    <Text style={styles.userName}>{user?.name || 'Suryansh Tiwari'}</Text>
                    <Text style={styles.userEmail}>{user?.email || 'suryansh@example.com'}</Text>
                </View>

                <View style={styles.statsContainer}>
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{expenses[0]?.currency || '₹'}{totalSpent.toLocaleString()}</Text>
                        <Text style={styles.statLabel}>Total Spent</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.statBox}>
                        <Text style={styles.statValue}>{totalItems}</Text>
                        <Text style={styles.statLabel}>Transactions</Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Notifications</Text>
                    <MenuItem
                        icon={Bell}
                        title="Push Notifications"
                        rightElement={
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {notifLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />}
                                <Switch
                                    value={pushEnabled}
                                    onValueChange={handleTogglePush}
                                    trackColor={{ false: COLORS.border, true: COLORS.primary }}
                                    thumbColor="white"
                                />
                            </View>
                        }
                    />
                    {pushEnabled && (
                        <MenuItem
                            icon={Bell}
                            title="Send Test Notification"
                            onPress={sendTestNotif}
                            color={COLORS.primary}
                        />
                    )}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Security</Text>
                    <MenuItem
                        icon={Lock}
                        title="Reset Password"
                        onPress={() => setResetModalVisible(true)}
                    />
                    <MenuItem
                        icon={Shield}
                        title="Privacy Policy"
                        onPress={() => setPrivacyModalVisible(true)}
                    />
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Preferences</Text>
                    <MenuItem icon={Settings} title="General Settings" />
                    <MenuItem
                        icon={LogOut}
                        title="Logout"
                        onPress={logout}
                        color={COLORS.danger}
                    />
                </View>

                <Text style={styles.versionText}>Version 1.2.1</Text>
            </ScrollView>

            <Modal
                animationType="fade"
                transparent={true}
                visible={resetModalVisible}
                onRequestClose={() => setResetModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Reset Password</Text>
                            <TouchableOpacity onPress={() => setResetModalVisible(false)}>
                                <X color={COLORS.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Current Password</Text>
                        <TextInput
                            style={styles.modalInput}
                            secureTextEntry
                            value={currentPassword}
                            onChangeText={setCurrentPassword}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textSecondary}
                        />

                        <Text style={styles.modalLabel}>New Password</Text>
                        <TextInput
                            style={styles.modalInput}
                            secureTextEntry
                            value={newPassword}
                            onChangeText={setNewPassword}
                            placeholder="••••••••"
                            placeholderTextColor={COLORS.textSecondary}
                        />

                        <TouchableOpacity
                            style={[styles.modalButton, resetLoading && { opacity: 0.7 }]}
                            onPress={handleResetPassword}
                            disabled={resetLoading}
                        >
                            {resetLoading ? (
                                <ActivityIndicator color="white" />
                            ) : (
                                <Text style={styles.modalButtonText}>Save New Password</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            <Modal
                animationType="slide"
                transparent={true}
                visible={privacyModalVisible}
                onRequestClose={() => setPrivacyModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={[styles.modalContent, { height: '80%' }]}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Privacy Policy</Text>
                            <TouchableOpacity onPress={() => setPrivacyModalVisible(false)}>
                                <X color={COLORS.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView showsVerticalScrollIndicator={false}>
                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>1. Data Collection</Text>
                                <Text style={styles.privacyText}>
                                    We collect expense data that you manually enter, as well as data extracted from your receipts using OCR technology and bank statements via PDF parsing.
                                </Text>
                            </View>

                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>2. OCR & PDF Processing</Text>
                                <Text style={styles.privacyText}>
                                    When you scan a receipt or upload a PDF, the image/file is processed to extract transaction details like amount, date, vendor, and items. This processing happens securely on our servers.
                                </Text>
                            </View>

                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>3. Push Notifications</Text>
                                <Text style={styles.privacyText}>
                                    If enabled, we use notifications to remind you to log expenses and provide spending insights. We use Expo Push Services for this functionality.
                                </Text>
                            </View>

                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>4. Data Security</Text>
                                <Text style={styles.privacyText}>
                                    Your data is encrypted and stored securely. We do not sell your personal financial data to third parties.
                                </Text>
                            </View>

                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>5. Your Controls</Text>
                                <Text style={styles.privacyText}>
                                    You can delete your account and all associated data at any time from the support section or by contacting us.
                                </Text>
                            </View>
                        </ScrollView>

                        <TouchableOpacity
                            style={[styles.modalButton, { marginTop: 20 }]}
                            onPress={() => setPrivacyModalVisible(false)}
                        >
                            <Text style={styles.modalButtonText}>Close</Text>
                        </TouchableOpacity>
                    </View>
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
        alignItems: 'center',
        paddingVertical: 30,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 15,
    },
    profileImagePlaceholder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: COLORS.surface,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: COLORS.primary,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    userEmail: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 5,
    },
    statsContainer: {
        flexDirection: 'row',
        backgroundColor: COLORS.surface,
        marginHorizontal: 20,
        borderRadius: 16,
        padding: 20,
        marginBottom: 30,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
    },
    statBox: {
        flex: 1,
        alignItems: 'center',
    },
    statValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    statLabel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 4,
    },
    divider: {
        width: 1,
        backgroundColor: COLORS.border,
        height: '100%',
    },
    section: {
        marginBottom: 25,
        paddingHorizontal: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 15,
        marginLeft: 5,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: COLORS.surface,
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    menuItemText: {
        fontSize: 16,
        fontWeight: '500',
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    versionText: {
        textAlign: 'center',
        color: COLORS.textSecondary,
        fontSize: 12,
        marginBottom: 30,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.surface,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: COLORS.text,
    },
    modalLabel: {
        color: COLORS.textSecondary,
        fontSize: 14,
        marginBottom: 8,
        marginLeft: 4,
    },
    modalInput: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        padding: 16,
        borderRadius: 16,
        fontSize: 16,
        borderWidth: 1,
        borderColor: COLORS.border,
        marginBottom: 20,
    },
    modalButton: {
        backgroundColor: COLORS.primary,
        padding: 18,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 10,
    },
    modalButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    privacySection: {
        marginBottom: 20,
    },
    privacyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 8,
    },
    privacyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 20,
    },
});

export default Profile;
