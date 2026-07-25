# Genestac Mobile 🧬

A React Native mobile application built with **Expo** and **Expo Router**, featuring fitness tracking, diet management, exercise logging, referrals, and AI-powered insights — backed by **Supabase**.

---

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Setup](#setup)
- [Environment Variables](#environment-variables)
- [Running the App](#running-the-app)
- [Building the App](#building-the-app)
- [Project Structure](#project-structure)
- [Tech Stack](#tech-stack)

---

## ✅ Prerequisites

Make sure the following are installed on your machine:

| Tool | Version | Install |
|------|---------|---------|
| Node.js | >= 18.x | [nodejs.org](https://nodejs.org) |
| npm | >= 9.x | Comes with Node.js |
| Expo CLI | Latest | `npm install -g expo-cli` |
| EAS CLI | Latest | `npm install -g eas-cli` |
| Android Studio | Latest | [developer.android.com](https://developer.android.com/studio) |
| Xcode (macOS only) | Latest | Mac App Store |

For **Android** development, ensure:
- Android SDK is installed via Android Studio
- An Android Virtual Device (AVD) is set up, **or** a physical Android device is connected with USB debugging enabled
- `ANDROID_HOME` environment variable is set

---

## ⚙️ Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/genestac-mobile.git
cd genestac-mobile
```

### 2. Install dependencies

```bash
npm install --legacy-peer-deps
```

### 3. Configure environment variables

Copy the example env file and fill in your values:

```bash
cp .env.example .env
```

> See the [Environment Variables](#environment-variables) section for details on each variable.

### 4. Log in to Expo (required for builds)

```bash
npx eas-cli login
```

---

## 🔐 Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Supabase
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

# Razorpay (Payments)
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx
RAZORPAY_KEY_SECRET=your_razorpay_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxx

# Resend (Email)
RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM=Genestac <noreply@genestac.com>

# NVIDIA AI
EXPO_PUBLIC_NVIDIA_KEY=nvapi-xxxxxxxxxxxx

# Cloudinary (Media)
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=your_cloud_name
EXPO_PUBLIC_CLOUDINARY_API_KEY=your_api_key
EXPO_PUBLIC_CLOUDINARY_API_SECRET=your_api_secret
```

> ⚠️ **Never commit your `.env` file.** It is already listed in `.gitignore`.

---

## 🚀 Running the App

### Start the Metro bundler (interactive menu)

```bash
npm start
# or
npx expo start
```

---

### Android

#### Start on Android emulator or connected device

```bash
npm run android
# or
npx expo start --android
```

#### Open on a connected device (after Metro is running)

```bash
# List connected devices
adb devices

# Press 'a' in the Metro terminal to open on Android
```

> Make sure your Android emulator is running or your device is connected with USB debugging enabled.

---

### iOS (macOS only)

```bash
npm run ios
# or
npx expo start --ios
```

---

### Web

```bash
npm run web
# or
npx expo start --web
```

---

### Using Expo Go (Physical Device)

1. Install **Expo Go** from the [Play Store](https://play.google.com/store/apps/details?id=host.exp.exponent) or [App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Run `npm start`
3. Scan the QR code shown in the terminal with:
   - **Android**: Expo Go app
   - **iOS**: Native Camera app

---

## 🏗️ Building the App

Genestac Mobile uses **EAS Build** (Expo Application Services) for production builds.

### Prerequisites for EAS

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Log in to your Expo account
eas login

# Initialize EAS in the project (first time only)
eas build:configure
```

---

### Development Build

A development build is a custom version of Expo Go with your project's native code.

```bash
# Android
eas build --profile development --platform android

# iOS
eas build --profile development --platform ios

# Both platforms
eas build --profile development --platform all
```

---

### Preview Build (Internal Testing)

Suitable for sharing with testers via internal distribution.

```bash
# Android APK
eas build --profile preview --platform android

# iOS
eas build --profile preview --platform ios

# Both platforms
eas build --profile preview --platform all
```

---

### Production Build

```bash
# Android AAB (for Google Play Store)
eas build --profile production --platform android

# iOS IPA (for Apple App Store)
eas build --profile production --platform ios

# Both platforms
eas build --profile production --platform all
```

---

### Local Build (without EAS cloud)

```bash
# Android (runs locally, requires Android Studio)
npx expo run:android

# iOS (macOS only, requires Xcode)
npx expo run:ios
```

---

### Submit to Stores

```bash
# Submit to Google Play Store
eas submit --platform android

# Submit to Apple App Store
eas submit --platform ios
```

---

### OTA Update (Over-the-Air)

Push a JS-only update without a full build:

```bash
eas update --branch production --message "Your update message"
```

---

## 📁 Project Structure

```
genestac-mobile/
├── app/                        # Expo Router screens (file-based routing)
│   ├── (app)/                  # Authenticated app screens
│   │   ├── index.tsx           # Dashboard / Home
│   │   ├── diet.tsx            # Diet tracking
│   │   ├── exercise.tsx        # Exercise tracking
│   │   ├── log.tsx             # Activity log
│   │   ├── profile.tsx         # User profile
│   │   ├── referral.tsx        # Referral program
│   │   └── _layout.tsx         # App tab navigator layout
│   ├── (auth)/                 # Unauthenticated screens
│   │   ├── login.tsx           # Login screen
│   │   ├── register.tsx        # Registration screen
│   │   ├── forgot-password.tsx # Password reset
│   │   └── _layout.tsx         # Auth layout
│   ├── _layout.tsx             # Root layout
│   └── index.tsx               # Entry point / redirect
├── components/                 # Reusable UI components
│   ├── dashboard/              # Dashboard-specific components
│   └── ui/                     # Generic UI components
├── lib/                        # Core utilities & services
│   ├── supabase.ts             # Supabase client
│   ├── api.ts                  # API helper functions
│   └── types.ts                # TypeScript type definitions
├── constants/                  # App-wide constants & theme
├── assets/                     # Images, fonts, icons
├── .env                        # Environment variables (gitignored)
├── app.json                    # Expo app configuration
├── babel.config.js             # Babel configuration
├── tsconfig.json               # TypeScript configuration
└── package.json                # Dependencies & npm scripts
```

---

## 🛠️ Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | [React Native](https://reactnative.dev/) + [Expo](https://expo.dev/) ~54 |
| Navigation | [Expo Router](https://expo.github.io/router/) v6 (file-based) |
| Backend | [Supabase](https://supabase.com/) (Auth + Database + Storage) |
| Payments | [Razorpay](https://razorpay.com/) |
| Email | [Resend](https://resend.com/) |
| AI | [NVIDIA NIM API](https://build.nvidia.com/) |
| Media | [Cloudinary](https://cloudinary.com/) |
| Charts | [react-native-chart-kit](https://github.com/indiespirit/react-native-chart-kit) |
| Animations | [react-native-reanimated](https://docs.swmansion.com/react-native-reanimated/) |
| Storage | [AsyncStorage](https://react-native-async-storage.github.io/async-storage/) + [expo-secure-store](https://docs.expo.dev/versions/latest/sdk/securestore/) |
| Language | TypeScript |

---

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch: `git checkout -b feature/your-feature`
3. Commit your changes: `git commit -m 'feat: add your feature'`
4. Push to the branch: `git push origin feature/your-feature`
5. Open a Pull Request

---

## 📄 License

This project is licensed under the terms in the [LICENSE](./LICENSE) file.
