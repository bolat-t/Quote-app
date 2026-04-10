import * as Notifications from 'expo-notifications';


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

const REMINDER_MESSAGES = [
    { title: "ulbo.", body: "hi. just checking in. how are you doing today?" },
    { title: "ulbo.", body: "i saved a little space for your thoughts. come fill it in." },
    { title: "ulbo.", body: "today happened. you should probably write about it." },
    { title: "ulbo.", body: "even one sentence counts. i promise." },
    { title: "ulbo.", body: "i miss you. come reflect for a bit." },
    { title: "ulbo.", body: "your thoughts deserve somewhere to live. i am that place." },
    { title: "ulbo.", body: "take two minutes. just for you. i will be here." },
];

export const scheduleDailyReminder = async (hour = 8, minute = 0) => {
    await Notifications.cancelAllScheduledNotificationsAsync();

    // Pick a message based on the day of week so it rotates
    const idx = new Date().getDay() % REMINDER_MESSAGES.length;
    const msg  = REMINDER_MESSAGES[idx];

    await Notifications.scheduleNotificationAsync({
        content: {
            title: msg.title,
            body:  msg.body,
            sound: true,
        },
        trigger: {
            hour,
            minute,
            type: Notifications.SchedulableTriggerInputTypes.DAILY,
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
