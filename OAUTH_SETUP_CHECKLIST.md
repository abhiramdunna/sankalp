# 🔐 Google OAuth Setup Checklist for Android

## Issues Found:
1. ❌ **Missing iOS Client ID** - Your `.env` has Android & Web IDs but no iOS ID
2. ❌ **Android SHA-1 Fingerprint Not Configured** - Most common cause of Android OAuth failures
3. ❌ **Potential Deep Link Redirect URI Mismatch**
4. ⚠️  **Package Name Verification Needed**

---

## ✅ Step 1: Get Your Android Signing Key SHA-1 Fingerprint

### For Development (Debug Key):
```bash
# Windows
keytool -list -v -keystore "%USERPROFILE%\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android

# MacOS/Linux
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android
```

**You'll see output like:**
```
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
```

Copy this fingerprint (without colons): `AABBCCDDEEFF00112233445566778899AABBCCDD`

### For Production (Release Key):
```bash
keytool -list -v -keystore path/to/your/release.keystore -alias your-key-alias -storepass your-password -keypass your-password
```

---

## ✅ Step 2: Configure Google Cloud Console

### 2.1: Add Android SHA-1 to OAuth Credential
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to **APIs & Services → Credentials**
4. Click on your **Android OAuth 2.0 Client ID** (or create one if missing)
5. Under "Application restrictions", select **Android**
6. Add your package name: `com.sankalp.app` (matches your app.json)
7. Add the SHA-1 fingerprint you got from Step 1
8. **Save**

### 2.2: Verify Your Android Client ID
- In Credentials, you should see: `XXX.apps.googleusercontent.com` for Android
- This should match `EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID` in your `.env`

---

## ✅ Step 3: Configure Supabase Google Provider

### 3.1: Go to Supabase Dashboard
1. Open [Supabase Dashboard](https://app.supabase.com/)
2. Select your project: `iwpcshjzfrvqpmlzmevj`
3. Go to **Authentication → Providers**
4. Click **Google**
5. Enable it and add:
   - **Client ID**: Same as Android Client ID
   - **Client Secret**: Get from Google Cloud Console (OAuth 2.0 Credentials)

### 3.2: Configure Authorized Redirect URIs
In Supabase Google provider settings, add these redirect URIs:
```
https://iwpcshjzfrvqpmlzmevj.supabase.co/auth/v1/callback
com.sankalp.app://home
expo+sankalpapp://home
```

### 3.3: Also Configure in Google Cloud Console
1. In **Google Cloud Console → Credentials → OAuth 2.0 Credentials**
2. Add authorized redirect URIs:
```
https://iwpcshjzfrvqpmlzmevj.supabase.co/auth/v1/callback
com.sankalp.app://home
expo+sankalpapp://home
```

---

## ✅ Step 4: Update Your .env File

**Current Status:**
```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID="91434556988-4otmifg2u3pqh0nfgjt7rkqlfm1cth95.apps.googleusercontent.com"
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID="91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com"
❌ MISSING iOS Client ID
```

**Add Missing iOS Client ID**: Go to Google Cloud Console → Create iOS OAuth 2.0 credential with Bundle ID matching your app

---

## ✅ Step 5: Verify app.json Configuration

Current setup looks good:
```json
{
  "scheme": "sankalpapp",
  "android": {
    "package": "com.sankalp.app"
  }
}
```

✅ Package name matches Google Cloud config

---

## ✅ Step 6: Testing the Fix

### After updating everything:

1. **Clear cached modules:**
   ```bash
   npx expo start --clear
   ```

2. **In Expo Go (Android):**
   - Rebuild the app by pressing `r` or rebuilding from Android Studio

3. **Check debug logs:**
   - The login screen shows debug logs at the bottom
   - Look for: `ANDROID_CLIENT_ID: SET ✓`
   - If still showing `❌ MISSING`, your `.env` isn't being read properly

4. **If still failing:**
   - Check the debug log message for the actual error
   - Common errors:
     - `"invalid_client"` → SHA-1 fingerprint mismatch
     - `"invalid_grant"` → Supabase redirect URI not matching
     - `"unauthorized_client"` → package name mismatch

---

## 🔍 Debugging Checklist

- [ ] Android SHA-1 fingerprint added to Google Cloud Console
- [ ] Package name `com.sankalp.app` matches Google Cloud config
- [ ] Supabase Google provider is enabled
- [ ] Redirect URIs configured in both Supabase and Google Cloud
- [ ] `.env` file has both ANDROID and WEB client IDs
- [ ] iOS Client ID added to `.env` (if planning iOS)
- [ ] Run `npx expo start --clear` after changes
- [ ] Debug log shows all client IDs as "SET ✓"

---

## Common Error Messages & Fixes

| Error | Cause | Fix |
|-------|-------|-----|
| `invalid_client` | SHA-1 mismatch | Verify debug fingerprint in Google Cloud |
| `invalid_grant` | Redirect URI mismatch | Check Supabase callback URL |
| `authorization_pending` | Using wrong client ID | Verify EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID in .env |
| Authorization error on signup | Package name mismatch | Check app.json has correct `package: "com.sankalp.app"` |

---

## References
- [Expo Google Auth Documentation](https://docs.expo.dev/guides/google-authentication/)
- [Supabase Google OAuth Setup](https://supabase.com/docs/guides/auth/oauth2/google)
- [Android Debug Keystore Info](https://developer.android.com/studio/publish/app-signing)
