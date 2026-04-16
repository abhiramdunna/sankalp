# 🚨 Android Google OAuth - Authorization Error Fix

## THE PROBLEM
You're getting an authorization error on Android when using Google sign-up/login because **your Android SHA-1 fingerprint is not configured in Google Cloud Console**.

---

## THE SOLUTION (5 minutes)

### Step 1️⃣ Get Your SHA-1 Fingerprint

**Windows (PowerShell):**
```powershell
keytool -list -v -keystore "$env:USERPROFILE\.android\debug.keystore" -alias androiddebugkey -storepass android -keypass android | Select-String "SHA1"
```

**macOS/Linux:**
```bash
keytool -list -v -keystore ~/.android/debug.keystore -alias androiddebugkey -storepass android -keypass android | grep SHA1
```

✅ You'll get something like: `SHA1: AA:BB:CC:DD:...` → Remove colons: `AABBCCDD...`

---

### Step 2️⃣ Add SHA-1 to Google Cloud Console

1. Visit: https://console.cloud.google.com/
2. **APIs & Services → Credentials**
3. Click your Android OAuth Client ID 
4. Under **Application restrictions → Android**
5. Paste:
   - **Package name**: `com.sankalp.app`
   - **SHA-1 certificate fingerprint**: (your SHA-1 from Step 1)
6. **Save**

---

### Step 3️⃣ Restart Your App

```bash
npx expo start --clear
```

Then press `a` for Android or use:
```bash
npx expo start --android --clear
```

---

## VERIFY IT WORKS

1. Open app on Android
2. Click "Sign up with Google"
3. **Check debug logs** at bottom of login screen
4. Should show: ✅ `ANDROID_CLIENT_ID: SET ✓`

---

## IF STILL NOT WORKING

Check the error message in debug logs:

| Debug Log Message | Cause | Fix |
|---|---|---|
| `ANDROID_CLIENT_ID: ❌ MISSING` | .env not reloading | Run `npx expo start --clear` |
| `"invalid_client"` | SHA-1 mismatch | Verify your fingerprint is correct |
| `"unauthorized_client"` | Package name mismatch | Check package is exactly `com.sankalp.app` |
| `"invalid_grant"` | Supabase config issue | See: OAUTH_SETUP_CHECKLIST.md Step 3 |

---

## DETAILED GUIDES CREATED

I've created 3 comprehensive guides in your project:

1. **➡️ ANDROID_OAUTH_QUICK_FIX.md** ← **Start here!**
   - 5-minute fix walkthrough
   - PowerShell command
   - Error troubleshooting

2. **OAUTH_SETUP_CHECKLIST.md** (Advanced)
   - Full 6-step verification
   - Supabase provider config
   - Deep linking setup

3. **IOS_OAUTH_SETUP.md** (Bonus)
   - iOS configuration (currently missing from your .env)
   - Bundle ID setup
   - How to add iOS Client ID

---

## YOUR CURRENT SETUP

✅ **Good:**
- Google Android Client ID is configured in .env
- Google Web Client ID is configured
- Package name matches: `com.sankalp.app`
- Supabase URL and key are set
- Login component looks correct

❌ **Missing:**
- Android SHA-1 fingerprint in Google Cloud Console
- iOS Client ID in .env (not critical for Android, but good to have)

---

## QUICK REFERENCE: Your IDs

```env
EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID=91434556988-4otmifg2u3pqh0nfgjt7rkqlfm1cth95.apps.googleusercontent.com
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=91434556988-fribkfk8bimfo75318rldjsq7g4hh8kc.apps.googleusercontent.com
EXPO_PUBLIC_SUPABASE_URL=https://iwpcshjzfrvqpmlzmevj.supabase.co
```

App Package: `com.sankalp.app`

---

## BEFORE YOU START

⚠️ **Make sure you have:**
- ✅ Android SDK installed (comes with Android Studio)
- ✅ `keytool` in your PATH (Java/JDK)
- ✅ Access to Google Cloud Console
- ✅ Your debug.keystore exists at `~/.android/debug.keystore`

---

## TL;DR
1. Get SHA-1: Run PowerShell command above
2. Add to Google Cloud: Paste it in Android application restrictions
3. Restart: `npx expo start --clear`
4. Test: Android should now work!

🚀 **Go to ANDROID_OAUTH_QUICK_FIX.md for detailed steps!**
