import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// Configure notifications handler
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
        shouldShowBanner: true,
        shouldShowList: true,
    }),
});

export const scheduleDailyReminder = async (hour = 8, minute = 0) => {
    // Cancel existing to avoid duplicates
    await Notifications.cancelAllScheduledNotificationsAsync();

    await Notifications.scheduleNotificationAsync({
        content: {
            title: "From your future self...",
            body: "Take a moment to reflect on today's wisdom.",
            sound: true,
        },
        trigger: {
            hour,
            minute,
            type: Notifications.SchedulableTriggerInputTypes.DAILY
        },
    });
};

export const requestNotificationPermissions = async () => {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
    }

    if (finalStatus !== 'granted') {
        return false;
    }
    return true;
};
