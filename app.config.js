module.exports = {
  expo: {
    name: 'ulbo',
    slug: 'ulbo',
    version: '1.0.1',
    orientation: 'portrait',
    icon: './assets/mascot/potato_levels/level_1_potato.png',
    userInterfaceStyle: 'light',
    newArchEnabled: true,
    splash: {
      image: './assets/mascot/potato_levels/level_1_potato.png',
      resizeMode: 'contain',
      backgroundColor: '#FCFAF5',
    },
    ios: {
      supportsTablet: true,
      bundleIdentifier: 'com.ulbo.app',
      infoPlist: {
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: './assets/mascot/potato_levels/level_1_potato.png',
        backgroundColor: '#ffffff',
      },
      edgeToEdgeEnabled: true,
      predictiveBackGestureEnabled: false,
      package: 'com.ulbo.app',
      usesCleartextTraffic: false,
      permissions: [
        'android.permission.CAMERA',
        'android.permission.RECORD_AUDIO',
        'android.permission.MODIFY_AUDIO_SETTINGS',
        'android.permission.READ_MEDIA_IMAGES',
        'android.permission.WRITE_EXTERNAL_STORAGE',
      ],
    },
    plugins: [
      'expo-font',
      'expo-asset',
      'expo-localization',
      [
        'expo-av',
        {
          microphonePermission:
            'Allow Ulbo to access your microphone to record your reflections.',
        },
      ],
      'expo-secure-store',
      [
        'expo-media-library',
        {
          photosPermission: 'Allow Ulbo to save your vision board to Photos.',
          savePhotosPermission:
            'Allow Ulbo to save your vision board to your photo library.',
          isAccessMediaLocationEnabled: false,
        },
      ],
    ],
    extra: {
      supabaseUrl:     process.env.SUPABASE_URL,
      supabaseAnonKey: process.env.SUPABASE_ANON_KEY,
      unsplashKey:     process.env.UNSPLASH_KEY,
      posthogKey:      process.env.POSTHOG_KEY,
      revenueCatIos:   process.env.REVENUECAT_IOS_KEY,
      revenueCatAndroid: process.env.REVENUECAT_ANDROID_KEY,
      eas: {
        projectId: 'e51f1bb6-3814-4f9d-b01e-62486e320233',
      },
    },
  },
};
