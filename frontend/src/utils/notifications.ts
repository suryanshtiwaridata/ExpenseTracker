import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export async function requestNotificationPermissions() {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }
    return finalStatus === 'granted';
}

export async function getExpoPushToken() {
    try {
        const token = (await Notifications.getExpoPushTokenAsync()).data;
        return token;
    } catch (e) {
        console.warn('Failed to get push token:', e);
        return null;
    }
}

export async function registerForPushNotificationsAsync() {
    if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
            name: 'default',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
        });
    }

    const hasPermission = await requestNotificationPermissions();
    if (!hasPermission) {
        return null;
    }

    return await getExpoPushToken();
}

export async function sendLocalNotification(title: string, body: string) {
    console.log('Scheduling local notification...');
    await Notifications.scheduleNotificationAsync({
        content: {
            title: title,
            body: body,
            data: { data: 'goes here' },
        },
        trigger: null, // send immediately
    });
    console.log('Notification scheduled!');
}
