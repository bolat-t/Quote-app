import { supabase } from '../lib/supabase';
import * as Application from 'expo-application';
import * as Device from 'expo-device';
import { Platform } from 'react-native';

export type FeedbackType = 'bug' | 'feature' | 'general';

export interface FeedbackData {
    message: string;
    type: FeedbackType;
    rating?: number; // 1-5
}

export const submitFeedback = async (data: FeedbackData): Promise<boolean> => {
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error('User not authenticated');

        const deviceInfo = {
            brand: Device.brand,
            modelName: Device.modelName,
            osName: Device.osName,
            osVersion: Device.osVersion,
            platform: Platform.OS,
        };

        const { error } = await supabase
            .from('feedback')
            .insert({
                user_id: user.id,
                message: data.message,
                type: data.type,
                rating: data.rating,
                app_version: Application.nativeApplicationVersion || '1.0.0',
                device_info: deviceInfo,
            });

        if (error) {
            console.error('Error submitting feedback:', error);
            return false;
        }

        return true;
    } catch (error) {
        console.error('Error in submitFeedback:', error);
        return false;
    }
};
