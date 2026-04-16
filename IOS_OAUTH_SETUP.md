# iOS Google OAuth Setup (Missing)

Your `.env` file is missing the iOS Client ID. Here's how to complete the setup:

## Step 1: Get iOS Bundle ID

Your app's Bundle ID will be based on your `app.json`:
```json
{
  "slug": "sankalp-app",
  "ios": { "bundleIdentifier": "com.sankalp.app" } // Or defaults to: com.sankalp.app (based on slug)
}
```

Bundle ID format: **com.sankalp.app**

---

## Step 2: Create iOS OAuth 2.0 Credential in Google Cloud

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. **APIs & Services → Credentials**
3. Click **+ CREATE CREDENTIALS → OAuth client ID**
4. Choose **iOS**
5. Fill in:
   - **Name**: Sankalp App iOS
   - **Bundle ID**: `com.sankalp.app`
   - **App Store ID**: (leave blank if not published)
   - **Team ID**: (leave blank unless you have one)
6. Click **Create**
7. Copy the **Client ID** (looks like `XXX.apps.googleusercontent.com`)

---

## Step 3: Update .env File

Add this line:
```env
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="YOUR_IOS_CLIENT_ID_HERE"
```

Example:
```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="91434556988-4otmifg2u3pqh0nfgjt7rkqlfm1cth95.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="91434556988-00000000000000000000000.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com"
```

---

## Alternative: Use Single Client ID for Both Platforms

If you prefer, you can use the same Web Client ID for both Android and iOS in development:

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID="91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com"
```

⚠️ **Note**: This is acceptable for development but NOT recommended for production.

---

## Update app.json (Optional but Recommended)

Add explicit bundle identifier:
```json
{
  "ios": {
    "bundleIdentifier": "com.sankalp.app",
    "supportsTablet": true
  }
}
```

Then restart Expo:
```bash
npx expo start --clear
```
