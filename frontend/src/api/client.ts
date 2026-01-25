import axios from 'axios';
import { useStore } from '../store/useStore';

const client = axios.create({
    baseURL: 'http://192.168.1.48:8000/api', // Updated to use current local IP
    timeout: 15000,
});

client.interceptors.request.use((config) => {
    const token = useStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;
