// Quote types
export interface Quote {
  id: number;
  text: string;
  author?: string;
  date?: string;
  category: string;
}

// Theme types
export type ThemeMode = 'light' | 'dark';

export interface ThemeColors {
  background: string;
  text: string;
  accent: string;
  primary: string;
  border: string;
  toolbar: string;
  toolbarText: string;
  paper: string;
  error: string;
}

export interface Theme {
  mode: ThemeMode;
  colors: ThemeColors;
}

// Navigation types
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';

export type RootStackParamList = {
  Tabs: undefined;
  Paywall: undefined;
  Analytics: undefined;
  VisionBoard: undefined;
  ReminderSettings: undefined;
};

export type RootTabParamList = {
  Home: undefined;
  Canvas: undefined;
  Journal: undefined;
  History: undefined;
  Vision: undefined;
};

/** Use from tab screens to get typed navigation (tabs + root stack e.g. Paywall). */
export type TabScreenNavigationProp<T extends keyof RootTabParamList> = CompositeNavigationProp<
  BottomTabNavigationProp<RootTabParamList, T>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Progression types
export type XPAction =
  | 'openApp'
  | 'readQuote'
  | 'completeHunt'
  | 'drawReflection'
  | 'writeReflection'
  | 'saveCanvas'
  | 'shareReflection'
  | 'streak7Day'
  | 'streak30Day';

export interface LevelTier {
  level: number;
  title: string;
  xpRequired: number;
}

export interface DailyActions {
  date: string; // YYYY-MM-DD
  openApp: boolean;
  readQuote: boolean;
  drewReflection: boolean;
  wroteReflection: boolean;
  savedCanvas: boolean;
  sharedReflection: boolean;
  completedHunt: boolean;
  streak7Claimed: boolean;
  streak30Claimed: boolean;
}

export interface UserProgress {
  totalXP: number;
  level: number;
  dailyActions: DailyActions;
  lastUpdated: string; // ISO timestamp
}

export interface PositivityHuntEntry {
  text: string;
  completedAt: string; // ISO timestamp
}

export interface DailyHunt {
  date: string; // YYYY-MM-DD
  entries: PositivityHuntEntry[];
  completed: boolean;
  xpAwarded: boolean;
}

// Plant (potato mascot) types
export interface PlantState {
  health: number;          // 0-100
  growthStage: number;     // 1-10, synced from progression level
  lastTendedDate: string;  // YYYY-MM-DD
  lastActiveDate: string;  // last day any action was done
  totalWaterings: number;
  wateredToday: boolean;
}

export type PlantAnimationTrigger =
  | 'water'
  | 'tend'
  | 'journal'
  | 'hunt'
  | 'canvas'
  | 'quote'
  | 'levelUp'
  | null;

