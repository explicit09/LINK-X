export interface OnboardingData {
  name: string;
  job: string;
  traits: string;
  learningStyle: string;
  depth: string;
  topics: string;
  interests: string;
  schedule: string;
  quizzes: boolean;
}

export interface AccountData {
  email: string;
  password: string;
}

export interface NotificationSettings {
  pushNotifications: boolean;
  emailNotifications: boolean;
  weeklyDigest: boolean;
}

export interface PrivacySettings {
  profileVisibility: boolean;
}

export interface SettingsState {
  isStudent: boolean;
  loading: boolean;
  onboarding: OnboardingData;
  account: AccountData;
  notifications: NotificationSettings;
  privacy: PrivacySettings;
}

export interface SettingsPanelProps {
  className?: string;
}

export interface AccountPanelProps extends SettingsPanelProps {
  accountData: AccountData;
  onAccountUpdate: (data: AccountData) => Promise<void>;
}

export interface NotificationPanelProps extends SettingsPanelProps {
  settings: NotificationSettings;
  onSettingsUpdate: (settings: NotificationSettings) => void;
}

export interface PrivacyPanelProps extends SettingsPanelProps {
  settings: PrivacySettings;
  onSettingsUpdate: (settings: PrivacySettings) => void;
}