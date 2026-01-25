import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import client from '../../api/client';

const Register = ({ onBack }: { onBack: () => void }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [password, setPassword] = useState('');
    const { setToken } = useStore();

    const handleRegister = async () => {
        try {
            await client.post('/auth/register', { email, name, password });

            const formData = new FormData();
            formData.append('username', email);
            formData.append('password', password);

            const response = await client.post('/auth/login', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            setToken(response.data.access_token);

            // Fetch user profile
            const userRes = await client.get('/auth/me', {
                headers: { 'Authorization': `Bearer ${response.data.access_token}` }
            });
            useStore.getState().setUser(userRes.data);
        } catch (error) {
            console.error('Registration failed', error);
            alert('Registration failed. Please try again.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <ScrollView contentContainerStyle={styles.content}>
                <Text style={styles.title}>Create Account</Text>
                <Text style={styles.subtitle}>Join us to manage your expenses</Text>

                <TextInput
                    style={styles.input}
                    placeholder="Full Name"
                    placeholderTextColor={COLORS.textSecondary}
                    value={name}
                    onChangeText={setName}
                />
                <TextInput
                    style={styles.input}
                    placeholder="Email"
                    placeholderTextColor={COLORS.textSecondary}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                />
                <TextInput
                    style={styles.input}
                    placeholder="Password"
                    placeholderTextColor={COLORS.textSecondary}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry
                />

                <TouchableOpacity style={styles.button} onPress={handleRegister}>
                    <Text style={styles.buttonText}>Register</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.backButton} onPress={onBack}>
                    <Text style={styles.backButtonText}>Already have an account? Login</Text>
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
        padding: 40,
        justifyContent: 'center',
        flexGrow: 1,
    },
    title: {
        fontSize: 12,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 4,
        marginBottom: 10,
    },
    subtitle: {
        fontSize: 28,
        fontWeight: 'bold',
        color: COLORS.text,
        marginBottom: 60,
        letterSpacing: -1,
    },
    input: {
        backgroundColor: COLORS.card,
        color: COLORS.text,
        padding: 22,
        borderRadius: 20,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#111',
        fontSize: 16,
    },
    button: {
        backgroundColor: COLORS.text,
        padding: 22,
        borderRadius: 24,
        alignItems: 'center',
        marginTop: 40,
    },
    buttonText: {
        color: '#000',
        fontWeight: 'bold',
        fontSize: 16,
        textTransform: 'uppercase',
        letterSpacing: 2,
    },
    backButton: {
        marginTop: 35,
        alignItems: 'center',
    },
    backButtonText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default Register;
