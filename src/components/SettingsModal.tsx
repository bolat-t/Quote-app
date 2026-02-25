import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, TouchableOpacity, Switch, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Svg, Path, Circle } from 'react-native-svg';
import { useTheme } from '../context/ThemeContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../context/AuthContext';
import { usePurchase } from '../context/PurchaseContext';
import { AuthModal } from './AuthModal';
import { BonsaiPreviewModal } from './bonsai/BonsaiPreviewModal';
import { BonsaiImagePickerModal } from './bonsai/BonsaiImagePickerModal';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types';

interface SettingsModalProps {
    visible: boolean;
    onClose: () => void;
    onNotificationToggle: () => void;
    areNotificationsEnabled: boolean;
    onExportData: () => Promise<void>;
    isExporting?: boolean;
    onFeedback: () => void;
    onShowOnboarding?: () => void;
    onClearMemory?: () => Promise<void>;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
    visible,
    onClose,
    onNotificationToggle,
    areNotificationsEnabled,
    onExportData,
    isExporting = false,
    onFeedback,
    onShowOnboarding,
    onClearMemory,
}) => {
    const { theme } = useTheme();
    const { colors } = theme;
    const insets = useSafeAreaInsets();
    const { user, signOut } = useAuth();
    const { isPremium } = usePurchase();
    const [isAuthModalVisible, setIsAuthModalVisible] = useState(false);
    const [isBonsaiPreviewVisible, setIsBonsaiPreviewVisible] = useState(false);
    const [isBonsaiPickerVisible, setIsBonsaiPickerVisible] = useState(false);
    const [localPremium, setLocalPremium] = useState(isPremium);
    const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();


    const handleSignOut = async () => {
        Alert.alert(
            "Sign Out",
            "Are you sure you want to sign out?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Sign Out",
                    style: "destructive",
                    onPress: async () => {
                        await signOut();
                    }
                }
            ]
        );
    };

    return (
        <Modal
            animationType="fade"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                {/* Backdrop */}
                <TouchableOpacity style={styles.backdrop} activeOpacity={1} onPress={onClose} />

                <View style={[styles.modalView, { backgroundColor: colors.surface, borderColor: colors.outline + '30' }]}>
                    <View style={styles.header}>
                        <Text style={[styles.modalTitle, { color: colors.onSurface }]}>Settings</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <Svg width={24} height={24} viewBox="0 0 24 24" fill="none">
                                <Path d="M18 6L6 18M6 6L18 18" stroke={colors.onSurface} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                            </Svg>
                        </TouchableOpacity>
                    </View>

                    <View style={[styles.divider, { backgroundColor: colors.outline + '20' }]} />

                    <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Account Section */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Cloud Sync</Text>
                                <Text style={[styles.settingDescription, { color: colors.onSurface + '80' }]}>
                                    {user ? `Signed in as ${user.email}` : 'Backup your journal'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                onPress={() => user ? handleSignOut() : setIsAuthModalVisible(true)}
                                style={[styles.smallButton, { borderColor: colors.outline + '40', backgroundColor: colors.onSurface + '05' }]}
                            >
                                <Text style={[styles.smallButtonText, { color: colors.onSurface }]}>
                                    {user ? 'Sign Out' : 'Sign In'}
                                </Text>
                            </TouchableOpacity>
                        </View>

                        <View style={[styles.divider, { backgroundColor: colors.outline + '20' }]} />

                        {/* Notification Setting */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Daily Reminders</Text>
                                <Text style={[styles.settingDescription, { color: colors.onSurface + '80' }]}>
                                    Receive a daily prompt to reflect.
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#767577", true: colors.primary + '80' }}
                                thumbColor={areNotificationsEnabled ? colors.primary : "#f4f3f4"}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={onNotificationToggle}
                                value={areNotificationsEnabled}
                            />
                        </View>

                        {/* Export Data */}
                        <View style={[styles.divider, { backgroundColor: colors.outline + '20', marginVertical: 16 }]} />

                        <TouchableOpacity
                            style={[styles.exportButton, { borderColor: colors.outline + '40', backgroundColor: colors.onSurface + '05' }]}
                            onPress={onExportData}
                            disabled={isExporting}
                        >
                            {isExporting ? (
                                <ActivityIndicator size="small" color={colors.primary} />
                            ) : (
                                <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
                                    <Path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" stroke={colors.onSurface} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                    <Path d="M17 8l-5-5-5 5" stroke={colors.onSurface} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                    <Path d="M12 3v12" stroke={colors.onSurface} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            )}
                            <Text style={[styles.exportButtonText, { color: colors.onSurface }]}>
                                {isExporting ? 'Exporting...' : 'Export Journal Data'}
                            </Text>
                        </TouchableOpacity>
                        <Text style={[styles.settingDescription, { color: colors.onSurface + '60', textAlign: 'center', marginTop: 8 }]}>
                            Download your reflections as a JSON file
                        </Text>

                        <View style={[styles.divider, { backgroundColor: colors.outline + '20', marginVertical: 16 }]} />

                        {/* Memory Settings */}
                        <TouchableOpacity
                            style={[styles.smallButton, { borderColor: colors.outline + '40', backgroundColor: colors.onSurface + '05', alignSelf: 'center', width: '100%', alignItems: 'center', paddingVertical: 12, marginBottom: 16 }]}
                            onPress={() => {
                                Alert.alert(
                                    "Clear Mascot Memory?",
                                    "This will reset what your mascots remember about your mood patterns. Your journal entries will stay safe.",
                                    [
                                        { text: "Cancel", style: "cancel" },
                                        {
                                            text: "Clear Memory",
                                            style: "destructive",
                                            onPress: async () => {
                                                // Import dynamically or pass as prop?
                                                // Ideally pass as prop to keep component pure, but specific feature..
                                                // Let's rely on global import for this specific feature or use a prop if strict.
                                                // Since I cannot easily change props everywhere, I'll use a direct import if possible,
                                                // BUT SettingsModal is a component.
                                                // Better to pass `onClearMemory` prop.
                                                if (onClearMemory) {
                                                    await onClearMemory();
                                                    Alert.alert("Memory Cleared", "Your mascots have a fresh start.");
                                                }
                                            }
                                        }
                                    ]
                                );
                            }}
                        >
                            <Text style={[styles.smallButtonText, { color: colors.onSurface }]}>
                                Clear Mascot Memory
                            </Text>
                        </TouchableOpacity>

                        {/* Feedback Button */}
                        <TouchableOpacity
                            style={[styles.smallButton, { borderColor: colors.outline + '40', backgroundColor: colors.onSurface + '05', alignSelf: 'center', width: '100%', alignItems: 'center', paddingVertical: 12 }]}
                            onPress={onFeedback}
                        >
                            <Text style={[styles.smallButtonText, { color: colors.onSurface }]}>
                                Give Feedback / Report Bug
                            </Text>
                        </TouchableOpacity>

                        {/* Dev Tools — Testing Section */}
                        <View style={[styles.divider, { backgroundColor: colors.outline + '20', marginVertical: 16 }]} />
                        <Text style={[styles.settingLabel, { color: colors.primary, marginBottom: 12, fontSize: 12, textTransform: 'uppercase', letterSpacing: 1 }]}>Dev Tools</Text>

                        {/* Premium Toggle */}
                        <View style={styles.settingRow}>
                            <View style={styles.settingInfo}>
                                <Text style={[styles.settingLabel, { color: colors.onSurface }]}>Premium Mode</Text>
                                <Text style={[styles.settingDescription, { color: colors.onSurface + '80' }]}>
                                    {localPremium ? 'Active — all features unlocked' : 'Inactive — free version'}
                                </Text>
                            </View>
                            <Switch
                                trackColor={{ false: "#767577", true: colors.primary + '80' }}
                                thumbColor={localPremium ? colors.primary : "#f4f3f4"}
                                ios_backgroundColor="#3e3e3e"
                                onValueChange={async (value) => {
                                    await AsyncStorage.setItem('@ulbo_is_premium', value ? 'true' : 'false');
                                    setLocalPremium(value);
                                    Alert.alert(
                                        value ? 'Premium Enabled' : 'Premium Disabled',
                                        'Restart the app for changes to take full effect.',
                                    );
                                }}
                                value={localPremium}
                            />
                        </View>

                        <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
                            <TouchableOpacity
                                style={[styles.smallButton, { flex: 1, borderColor: colors.primary + '40', backgroundColor: colors.primary + '10', alignItems: 'center', paddingVertical: 12 }]}
                                onPress={() => {
                                    onClose();
                                    if (onShowOnboarding) onShowOnboarding();
                                }}
                            >
                                <Text style={[styles.smallButtonText, { color: colors.primary }]}>Onboarding</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.smallButton, { flex: 1, borderColor: colors.primary + '40', backgroundColor: colors.primary + '10', alignItems: 'center', paddingVertical: 12 }]}
                                onPress={() => {
                                    onClose();
                                    navigation.navigate('Paywall');
                                }}
                            >
                                <Text style={[styles.smallButtonText, { color: colors.primary }]}>Paywall</Text>
                            </TouchableOpacity>
                        </View>

                        {/* Bonsai Preview */}
                        <TouchableOpacity
                            style={[styles.smallButton, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10', alignSelf: 'center', width: '100%', alignItems: 'center', paddingVertical: 12, marginTop: 8 }]}
                            onPress={() => setIsBonsaiPreviewVisible(true)}
                        >
                            <Text style={[styles.smallButtonText, { color: colors.primary }]}>
                                Bonsai Growth Stages
                            </Text>
                        </TouchableOpacity>

                        {/* Bonsai Image Picker */}
                        <TouchableOpacity
                            style={[styles.smallButton, { borderColor: colors.primary + '40', backgroundColor: colors.primary + '10', alignSelf: 'center', width: '100%', alignItems: 'center', paddingVertical: 12, marginTop: 8 }]}
                            onPress={() => setIsBonsaiPickerVisible(true)}
                        >
                            <Text style={[styles.smallButtonText, { color: colors.primary }]}>
                                Bonsai Image Picker
                            </Text>
                        </TouchableOpacity>
                    </ScrollView>

                    <View style={[styles.footer, { borderTopColor: colors.outline + '20' }]}>
                        <Text style={[styles.versionText, { color: colors.onSurface + '40' }]}>ulbo. v1.0.1</Text>
                    </View>
                </View>
            </View>
            <AuthModal visible={isAuthModalVisible} onClose={() => setIsAuthModalVisible(false)} />
            <BonsaiPreviewModal visible={isBonsaiPreviewVisible} onClose={() => setIsBonsaiPreviewVisible(false)} />
            <BonsaiImagePickerModal visible={isBonsaiPickerVisible} onClose={() => setIsBonsaiPickerVisible(false)} />
        </Modal >
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
    },
    modalView: {
        width: '85%',
        maxWidth: 400,
        maxHeight: '85%',
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 24,
        borderWidth: 1,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 24,
        fontFamily: 'Caveat-Bold',
    },
    closeButton: {
        padding: 4,
    },
    divider: {
        height: 1,
        width: '100%',
        marginBottom: 20,
    },
    scrollContent: {
        flexGrow: 0,
    },
    content: {
        gap: 20,
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    settingInfo: {
        flex: 1,
        paddingRight: 16,
    },
    settingLabel: {
        fontSize: 20,
        fontFamily: 'Caveat-Medium',
    },
    settingDescription: {
        fontSize: 14,
        fontFamily: 'Carlito',
        marginTop: 4,
    },
    footer: {
        marginTop: 24,
        paddingTop: 16,
        borderTopWidth: 1,
        alignItems: 'center',
    },
    versionText: {
        fontFamily: 'Carlito',
        fontSize: 12,
    },
    exportButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        paddingHorizontal: 20,
        borderRadius: 12,
        borderWidth: 1,
        gap: 10,
    },
    exportButtonText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 18,
    },
    smallButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        borderWidth: 1,
    },
    smallButtonText: {
        fontFamily: 'Caveat-Medium',
        fontSize: 16,
    },
});
