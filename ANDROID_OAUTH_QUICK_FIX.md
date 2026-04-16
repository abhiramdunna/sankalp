# 🚀 Quick Fix Guide - Android Authorization Error

## Most Likely Cause
**Android SHA-1 Fingerprint Mismatch** - This causes ~90% of Android OAuth failures in Expo.

---

## 5-Minute Quick Fix

### Step 1: Get Your Debug Key SHA-1 (Windows)
Open PowerShell and run:
```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | Select-String "SHA1"
```

**Output will look like:**
```
SHA1: AA:BB:CC:DD:EE:FF:00:11:22:33:44:55:66:77:88:99:AA:BB:CC:DD
```

**Remove colons to get:** `AABBCCDDEEFF00112233445566778899AABBCCDD`

---

### Step 2: Add to Google Cloud Console (2 minutes)

1. Go to https://console.cloud.google.com/
2. Select your project
3. Go to **APIs & Services → Credentials**
4. Find and click your **Android OAuth Client ID** (the one with value: `91434556988-4otmifg2u3pqh0nfgjt7rkqlfm1cth95.apps.googleusercontent.com`)
5. Scroll down to **Application restrictions**
6. Select **Android**
7. Enter:
   - **Package name**: `com.sankalp.app`
   - **SHA-1 certificate fingerprint**: `AABBCCDDEEFF00112233445566778899AABBCCDD` (paste your fingerprint here)
8. Click **Save** (top right)

---

### Step 3: Restart Expo (1 minute)

```bash
npx expo start --clear
```

Then press `a` to rebuild Android or use:
```bash
npx expo start --android --clear
```

---

## Testing

Once Expo restarts:
1. Open the app on Android
2. Click "Sign up with Google"
3. Watch the **debug logs** at the bottom of the login screen
4. You should see:
   - ✅ `ANDROID_CLIENT_ID: SET ✓`
   - If you see ❌ `MISSING`, reload the app or run `npx expo start --clear` again

---

## Still Getting Authorization Error?

### Check debug logs for specific error message:

**Error: `"invalid_client"`**
- ❌ SHA-1 fingerprint is wrong
- ✅ Solution: Double-check your fingerprint in step 1

**Error: `"invalid_grant"`**
- ❌ Supabase redirect URI not configured
- ✅ Solution: See [OAUTH_SETUP_CHECKLIST.md → Step 3.2](./OAUTH_SETUP_CHECKLIST.md)

**Error: `"unauthorized_client"`**
- ❌ Package name or client ID mismatch
- ✅ Solution: Verify package name is exactly `com.sankalp.app` in:
  - app.json
  - Google Cloud Console
  - AndroidManifest.xml (auto-generated)

**Error: `"authorization_denied"` or User cancels**
- ✅ This is normal - user just cancelled the Google login popup

---

## Alternative: If Above Doesn't Work

Try using the Web Client ID for Android temporarily (for testing only):

### Update app/login.tsx:
Find this line (around line 42):
```typescript
androidClientId: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
```

And temporarily change to:
```typescript
androidClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
```

**Then:**
```bash
npx expo start --clear
npx expo start --android
```

⚠️ **Important**: This is ONLY for testing. Change it back to use the Android Client ID.

If this works, it confirms the SHA-1 fingerprint is the issue.

If this still fails, there's likely a Supabase configuration issue.

---

## Check All Your IDs Match

### In Google Cloud Console:
- Android Client ID: ✅ `91434556988-4otmifg2u3pqh0nfgjt7rkqlfm1cth95.apps.googleusercontent.com`
- Web Client ID: ✅ `91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com`

### In your .env file:
Both should have values and not be placeholders.

### In app.json:
- Package: ✅ `com.sankalp.app`
- Scheme: ✅ `sankalpapp`

---

## Can't find SHA1? Regenerate Debug Key

If you can't find your debug key or want to regenerate:

```bash
cd %USERPROFILE%\.android
keytool -genkey -v -keystore debug.keystore -alias androiddebugkey -storepass android -keypass android -keyalg RSA -keysize 2048 -validity 10000 -dname "CN=Android Debug,O=Android,C=US"
```

Then re-run the command from Step 1 to get the new SHA-1.

---

## References
- Debug key location: `~/.android/debug.keystore` (macOS/Linux) or `%USERPROFILE%\.android\debug.keystore` (Windows)
- Default password: `android`
- Default alias: `androiddebugkey`
