# Ulbo 🌟

A daily reflection app with wisdom from your future self, drawing, journaling, positivity hunt, and community.

## What is Ulbo?

Ulbo delivers daily prompts for self-reflection—wisdom framed as messages from your wiser, future self. Draw on the canvas, journal your thoughts, complete the daily positivity hunt, and optionally share with the community. Progress is tracked with XP, levels, and streaks.

## Features

### 🏠 Hub
- Dashboard with today’s quote, streak, and XP/level
- Daily actions checklist (open app, read quote, write reflection, save canvas, complete hunt)
- Notifications, export journal, feedback, settings

### ✏️ Canvas
- Daily quote with category filter (All, Resilience, Action, Mindset, etc.)
- Full-screen drawing with undo/redo, color palette
- Draggable text boxes and journal reflection
- Save and share creations; calendar to browse past entries

### 🔍 Positivity Hunt
- Daily challenge: add 3 positive things
- XP rewards; same daily quote for context

### 📝 Journal
- List and history of reflections
- Entries saved locally and synced to Supabase when signed in

### 🌐 Community
- Shared reflections (Supabase)
- Like and browse others’ posts (when signed in)

### 🔐 Auth & Monetization
- Sign in / sign up (Supabase)
- Premium paywall (RevenueCat): monthly/annual

### 🎨 Themes
- Light and dark mode
- Theme persists across restarts

## Getting Started

### Prerequisites
- Node.js 18+
- npm or yarn
- Expo Go app on your device

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/ulbo-app.git
cd ulbo-app

# Install dependencies
npm install

# Start the development server
npx expo start
```

### Running the App

1. Run: `npx expo start`
2. Scan the QR code with your device
3. Open in Expo Go

## Project Structure

```
/src
  /components     # CanvasHeader, CanvasFooter, PaperCanvas, JournalInput,
                  # CategoryPicker, DraggableTextBox, XPBar, XPToast, LevelModal,
                  # SettingsModal, StreakModal, FeedbackModal, CalendarModal,
                  # OnboardingModal, AuthModal, ThemeToggle, Mascot, etc.
  /context        # ThemeContext, AuthContext, PurchaseContext, AnalyticsProvider
  /data           # quotes.json, progressionConfig.ts
  /hooks          # useDailyQuote, useMascotState
  /lib            # supabase, analytics
  /screens        # HubScreen, HomeScreen (Canvas), HuntScreen, JournalScreen,
                  # CommunityScreen, PaywallScreen, DrawScreen
  /types          # index.ts (Quote, Theme, Stroke, UserProgress, etc.)
  /utils          # storage, journalStorage, progressionStorage, communityStorage,
                  # dateHelpers, notifications, etc.
```

## Quote Style

Prompts are written in “Future-Self” voice—warm, direct, second-person messages:

> "You made it to another day. That matters more than you think."

> "That voice of doubt? It's just trying to protect you. Acknowledge it, thank it, then do the thing anyway."

## Building for Production

### Android APK
```bash
npm install -g eas-cli
eas login
eas build -p android --profile preview
```

### Android Production
```bash
eas build -p android --profile production
```

### iOS (requires Apple Developer account)
```bash
eas build -p ios --profile production
```

## Tech Stack

- **Framework**: React Native + Expo (TypeScript)
- **Navigation**: React Navigation (bottom tabs + native stack)
- **Drawing**: react-native-svg + touch gestures
- **Storage**: AsyncStorage, Expo FileSystem, Supabase (auth + sync)
- **State**: React Context (Theme, Auth, Purchase, Analytics)
- **Monetization**: RevenueCat (react-native-purchases)
- **Analytics**: PostHog

## License

MIT License

## Contributing

1. Fork the repository
2. Create your feature branch
3. Commit your changes
4. Push and open a Pull Request
