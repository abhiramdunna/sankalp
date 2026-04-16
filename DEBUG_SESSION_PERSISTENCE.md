# Session Persistence Debugging Guide

## What We're Testing
Whether session tokens are being saved to AsyncStorage during login, and whether they can be restored on app restart.

## Test Steps

### Step 1: Clear Everything and Rebuild
```bash
# Clear app cache and storage
adb shell pm clear com.sankalp

# Clear Metro bundler cache
npm run reset-project

# Start fresh
npx expo start --clear
```

### Step 2: Monitor Console During Login
Watch the console for these log sequences:

**During Login:**
```
✅ Authentication successful, user: your@email.com
✅ Profile data: {"business_name": "...", "city": "..."}
💤 Waiting for Supabase to persist session automatically...
🔹 Checking AsyncStorage after auth...
📦 All keys after auth: [...]
  📦 (for each key, shows first 150 chars)
🔹 Getting current session to verify...
🔹 Current session available? true/false
```

**Critical Values to Note:**
- `Current session available?` → Should be `true`
- What keys show up in AsyncStorage → Look for key containing "access_token"
- The content of those keys → Should be valid JSON with tokens

### Step 3: Close App Completely and Reopen

**On App Restart, Watch For:**
```
🔍 ========== STARTUP SESSION CHECK START ==========
🔹 Checking all AsyncStorage keys...
📦 All AsyncStorage keys: [...]
  📦 (keys and their content)
🔹 Step A: Trying getUser()...
🔹 Step B: Trying getSession()...
```

**Possible Outcomes:**
1. ✅ Session found → Goes to home screen
2. ⚠️ No session but user found → Should still work
3. ❌ Nothing found → Loop back to login screen

## What To Share
Please copy and paste the **FULL console output** for:
1. Login flow (from authentication to navigation)
2. App restart (from splash to final navigation)

## Key Questions
- What keys ARE in AsyncStorage after login?
- Does `getSession()` return anything on startup?
- What's the exact error if any occurs?
