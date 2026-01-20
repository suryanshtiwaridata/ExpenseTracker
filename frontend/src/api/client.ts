import axios from 'axios';
import { useStore } from '../store/useStore';

const client = axios.create({
    baseURL: 'http://192.168.1.13:8000/api', // Updated to use local IP for better connectivity
    timeout: 5000,
});

client.interceptors.request.use((config) => {
    const token = useStore.getState().token;
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default client;
