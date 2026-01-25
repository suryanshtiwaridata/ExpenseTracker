import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../store/useStore';
import { COLORS } from '../../theme/colors';
import client from '../../api/client';

const Login = ({ onRegister }: { onRegister: () => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const { setToken } = useStore();

    const handleLogin = async () => {
        try {
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
            console.error('Login failed', error);
            alert('Login failed. Please check your credentials.');
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.content}>
                <Text style={styles.title}>Welcome Back</Text>
                <Text style={styles.subtitle}>Sign in to track your expenses</Text>

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

                <TouchableOpacity style={styles.button} onPress={handleLogin}>
                    <Text style={styles.buttonText}>Login</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.registerButton} onPress={onRegister}>
                    <Text style={styles.registerButtonText}>Don't have an account? Register</Text>
                </TouchableOpacity>
            </View>
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
        flex: 1,
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
    registerButton: {
        marginTop: 35,
        alignItems: 'center',
    },
    registerButtonText: {
        color: COLORS.textSecondary,
        fontSize: 12,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
});

export default Login;
