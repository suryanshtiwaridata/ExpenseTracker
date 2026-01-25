import React, { useState, useEffect } from 'react';
import { useIsFocused } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Switch, Modal, TextInput, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import { LogOut, User as UserIcon, Settings, Bell, Shield, Lock, ChevronRight, X, Smartphone, Fingerprint, PieChart } from 'lucide-react-native';
import client from '../../api/client';
import * as LocalAuthentication from 'expo-local-authentication';
import { requestNotificationPermissions } from '../../utils/notifications';

const Profile = ({ navigation }: { navigation: any }) => {
    const { user, logout, expenses, biometricsEnabled, setBiometricsEnabled, setUser } = useStore();
    const [pushEnabled, setPushEnabled] = useState(true);
    const [resetModalVisible, setResetModalVisible] = useState(false);
    const [profileModalVisible, setProfileModalVisible] = useState(false);
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [resetLoading, setResetLoading] = useState(false);
    const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
    const [notifLoading, setNotifLoading] = useState(false);

    // Profile update state
    const [updateName, setUpdateName] = useState(user?.name || '');
    const [updatePhone, setUpdatePhone] = useState(user?.phone || '');
    const [updateLoading, setUpdateLoading] = useState(false);

    const isFocused = useIsFocused();

    // Reset modals to default (closed) when screen is focused
    useEffect(() => {
        if (isFocused) {
            setResetModalVisible(false);
            setProfileModalVisible(false);
            setPrivacyModalVisible(false);
        }
    }, [isFocused]);

    const authenticate = async (): Promise<boolean> => {
        const hasHardware = await LocalAuthentication.hasHardwareAsync();
        if (!hasHardware) {
            Alert.alert('Error', 'Your device does not support biometric authentication');
            return false;
        }

        const isEnrolled = await LocalAuthentication.isEnrolledAsync();
        if (!isEnrolled) {
            Alert.alert('Error', 'No biometrics enrolled. Please set up FaceID/Fingerprint first');
            return false;
        }

        const result = await LocalAuthentication.authenticateAsync({
            promptMessage: 'Authenticate to proceed',
            fallbackLabel: 'Use PIN',
        });

        return result.success;
    };

    const handleResetPassword = async () => {
        if (!currentPassword || !newPassword) {
            Alert.alert('Error', 'Please fill in both fields');
            return;
        }

        if (biometricsEnabled) {
            const success = await authenticate();
            if (!success) return;
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

    const handleUpdateProfile = async () => {
        if (!updateName) {
            Alert.alert('Error', 'Name cannot be empty');
            return;
        }
        setUpdateLoading(true);
        try {
            const response = await client.put('/auth/profile', {
                name: updateName,
                phone: updatePhone,
            });
            setUser(response.data);
            Alert.alert('Success', 'Profile updated');
            setProfileModalVisible(false);
        } catch (error: any) {
            console.error('Update profile failed', error);
            Alert.alert('Error', error.response?.data?.detail || 'Failed to update profile');
        } finally {
            setUpdateLoading(false);
        }
    };

    const handleToggleBiometrics = async (value: boolean) => {
        if (value) {
            const success = await authenticate();
            if (success) {
                setBiometricsEnabled(true);
            }
        } else {
            setBiometricsEnabled(false);
        }
    };

    const handleTogglePush = async (value: boolean) => {
        if (value) {
            setNotifLoading(true);
            const hasPermission = await requestNotificationPermissions();
            setPushEnabled(hasPermission);
            if (!hasPermission) {
                Alert.alert('Permission Denied', 'Please enable notifications in your device settings.');
            }
            setNotifLoading(false);
        } else {
            setPushEnabled(false);
        }
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
                    {user?.phone && <Text style={styles.userPhone}>{user.phone}</Text>}
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>General Settings</Text>

                    <MenuItem
                        icon={Smartphone}
                        title="Update Profile"
                        onPress={() => {
                            setUpdateName(user?.name || '');
                            setUpdatePhone(user?.phone || '');
                            setProfileModalVisible(true);
                        }}
                    />

                    <MenuItem
                        icon={Fingerprint}
                        title="Face ID / PIN Lock"
                        rightElement={
                            <Switch
                                value={biometricsEnabled}
                                onValueChange={handleToggleBiometrics}
                                trackColor={{ false: '#111', true: COLORS.primary }}
                                thumbColor="white"
                            />
                        }
                    />

                    <MenuItem
                        icon={Bell}
                        title="Push Notifications"
                        onPress={() => { }}
                        rightElement={
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                {notifLoading && <ActivityIndicator size="small" color={COLORS.primary} style={{ marginRight: 8 }} />}
                                <Switch
                                    value={pushEnabled}
                                    onValueChange={handleTogglePush}
                                    trackColor={{ false: '#111', true: COLORS.primary }}
                                    thumbColor="white"
                                />
                            </View>
                        }
                    />

                    <MenuItem
                        icon={Lock}
                        title="Reset Password"
                        onPress={() => setResetModalVisible(true)}
                    />

                    <MenuItem
                        icon={PieChart}
                        title="Monthly Budgeting"
                        onPress={() => navigation.navigate('BudgetSettings')}
                        color={COLORS.primary}
                    />

                    <MenuItem
                        icon={Shield}
                        title="Privacy Policy"
                        onPress={() => setPrivacyModalVisible(true)}
                    />

                    <MenuItem
                        icon={LogOut}
                        title="Logout"
                        onPress={logout}
                        color={COLORS.danger}
                    />
                </View>

                <Text style={styles.versionText}>Version 1.2.1 • SECURE</Text>
            </ScrollView>

            {/* Profile Update Modal */}
            <Modal animationType="fade" transparent={true} visible={profileModalVisible} onRequestClose={() => setProfileModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Update Profile</Text>
                            <TouchableOpacity onPress={() => setProfileModalVisible(false)}>
                                <X color={COLORS.text} size={24} />
                            </TouchableOpacity>
                        </View>

                        <Text style={styles.modalLabel}>Full Name</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={updateName}
                            onChangeText={setUpdateName}
                            placeholder="Your Name"
                            placeholderTextColor={COLORS.textSecondary}
                        />

                        <Text style={styles.modalLabel}>Phone Number</Text>
                        <TextInput
                            style={styles.modalInput}
                            value={updatePhone}
                            onChangeText={setUpdatePhone}
                            placeholder="+91 00000 00000"
                            placeholderTextColor={COLORS.textSecondary}
                            keyboardType="phone-pad"
                        />

                        <TouchableOpacity
                            style={[styles.modalButton, updateLoading && { opacity: 0.7 }]}
                            onPress={handleUpdateProfile}
                            disabled={updateLoading}
                        >
                            {updateLoading ? (
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.modalButtonText}>Save Changes</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Reset Password Modal */}
            <Modal animationType="fade" transparent={true} visible={resetModalVisible} onRequestClose={() => setResetModalVisible(false)}>
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
                                <ActivityIndicator color="#000" />
                            ) : (
                                <Text style={styles.modalButtonText}>Verify & Save</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* Privacy Modal */}
            <Modal animationType="slide" transparent={true} visible={privacyModalVisible} onRequestClose={() => setPrivacyModalVisible(false)}>
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
                                <Text style={styles.privacyText}>We collect expense data that you manually enter, as well as data extracted from your receipts using OCR technology and bank statements.</Text>
                            </View>
                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>2. Biometrics</Text>
                                <Text style={styles.privacyText}>If enabled, biometrics are stored and managed by your device's secure enclave. We never access or store your actual face or fingerprint data.</Text>
                            </View>
                            <View style={styles.privacySection}>
                                <Text style={styles.privacyTitle}>3. Push Notifications</Text>
                                <Text style={styles.privacyText}>We use notifications to remind you to log expenses and provide spending insights.</Text>
                            </View>
                        </ScrollView>
                        <TouchableOpacity style={[styles.modalButton, { marginTop: 20 }]} onPress={() => setPrivacyModalVisible(false)}>
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
        paddingVertical: 50,
    },
    profileImageContainer: {
        position: 'relative',
        marginBottom: 25,
    },
    profileImagePlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: COLORS.card,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: COLORS.primary,
        shadowColor: COLORS.primary,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
    },
    userName: {
        fontSize: 24,
        fontWeight: 'bold',
        color: COLORS.text,
        letterSpacing: 1,
    },
    userEmail: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 8,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    userPhone: {
        fontSize: 12,
        color: COLORS.primary,
        marginTop: 4,
        fontWeight: 'bold',
    },
    section: {
        marginBottom: 40,
        paddingHorizontal: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 3,
        marginBottom: 25,
        marginLeft: 4,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#0A0A0A',
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
        borderWidth: 1,
        borderColor: '#111',
    },
    menuItemText: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    versionText: {
        textAlign: 'center',
        color: '#222',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 2,
        marginBottom: 40,
        marginTop: 10,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.9)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: COLORS.card,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 30,
        paddingBottom: 50,
        borderWidth: 1,
        borderColor: '#111',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 35,
    },
    modalTitle: {
        fontSize: 14,
        fontWeight: 'bold',
        color: COLORS.text,
        textTransform: 'uppercase',
        letterSpacing: 3,
    },
    modalLabel: {
        color: COLORS.textSecondary,
        fontSize: 10,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
        marginBottom: 12,
        marginLeft: 4,
    },
    modalInput: {
        backgroundColor: COLORS.background,
        color: COLORS.text,
        padding: 20,
        borderRadius: 16,
        fontSize: 15,
        borderWidth: 1,
        borderColor: '#111',
        marginBottom: 25,
    },
    modalButton: {
        backgroundColor: COLORS.primary,
        padding: 22,
        borderRadius: 20,
        alignItems: 'center',
        marginTop: 15,
    },
    modalButtonText: {
        color: '#000',
        fontSize: 14,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    privacySection: {
        marginBottom: 30,
    },
    privacyTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 12,
    },
    privacyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        lineHeight: 22,
    },
});

export default Profile;
