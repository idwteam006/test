# Debug: Calendar Not Showing Entries

## Issue
Calendar shows "No entries" for December 8, 2025 (Monday), but database confirms entry exists.

## Confirmed Facts
✅ Entry exists in database for 2025-12-08
✅ Entry is in DRAFT status
✅ Entry belongs to vijay.n@idwteam.com
✅ API query range includes Dec 8 (2025-12-08 to 2025-12-14)
✅ Frontend filtering logic is correct

## Possible Causes

### 1. **API Not Returning Normalized Date** (Most Likely)
If the page loaded before the recent fix was applied, the API might still be returning:
```json
{
  "workDate": "2025-12-08T00:00:00.000Z"  // ← Old format
}
```

Instead of:
```json
{
  "workDate": "2025-12-08"  // ← New format (after fix)
}
```

**Solution**: Hard refresh the page (Ctrl+Shift+R or Cmd+Shift+R)

### 2. **Frontend Cache Issue**
Browser might have cached the old JavaScript code before the fix.

**Solution**:
- Clear browser cache
- Hard refresh (Ctrl+Shift+R)
- Or open in incognito mode

### 3. **API Server Not Restarted**
The Next.js server might be running old code before our changes.

**Solution**: Restart the development server
```bash
# Stop the server (Ctrl+C)
# Then restart:
npm run dev
# or
yarn dev
```

### 4. **Session/State Issue**
The frontend `entries` state might be empty or not populated.

**Solution**: Check browser console for errors

## Debugging Steps

### Step 1: Check Browser Console
1. Open DevTools (F12)
2. Go to Console tab
3. Look for any errors (red text)
4. Look for API calls in Network tab

### Step 2: Check API Response
Open browser console and run:
```javascript
fetch('/api/employee/timesheets?startDate=2025-12-08&endDate=2025-12-14')
  .then(r => r.json())
  .then(data => {
    console.log('✓ API Response:', data);
    console.log('✓ Number of entries:', data.entries?.length);
    console.log('✓ First entry:', data.entries?.[0]);
    console.log('✓ WorkDate format:', data.entries?.[0]?.workDate);
    console.log('✓ Has T character?', data.entries?.[0]?.workDate?.includes('T'));
  });
```

**Expected Output:**
```
✓ API Response: {success: true, entries: [...], totals: {...}}
✓ Number of entries: 1
✓ First entry: {id: "...", workDate: "2025-12-08", ...}
✓ WorkDate format: 2025-12-08
✓ Has T character? false  ← Should be false!
```

**If output shows**:
- `workDate: "2025-12-08T00:00:00.000Z"` → API fix not applied yet
- `Has T character? true` → API fix not applied yet
- Server needs restart or code needs redeployment

### Step 3: Check Frontend State
In browser console:
```javascript
// This will only work if you add a debug line to the component
// But you can check React DevTools instead
```

Or use React DevTools:
1. Install React Developer Tools extension
2. Open Components tab
3. Find TimesheetsPage component
4. Check `entries` state
5. Should see array with 1 entry

### Step 4: Check Network Tab
1. Open DevTools (F12)
2. Go to Network tab
3. Refresh page
4. Find the request to `/api/employee/timesheets?startDate=...`
5. Click on it
6. Check the Response tab
7. Verify `workDate` format in the JSON

## Quick Fixes to Try

### Fix 1: Hard Refresh (Fastest)
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### Fix 2: Clear Cache and Reload
```
1. DevTools (F12) → Network tab
2. Right-click → "Clear browser cache"
3. Or: Chrome Settings → Privacy → Clear browsing data
4. Reload page
```

### Fix 3: Restart Dev Server
```bash
# In terminal where server is running:
1. Press Ctrl+C to stop
2. Run: npm run dev
3. Wait for "Ready on http://localhost:3000"
4. Refresh browser
```

### Fix 4: Rebuild Next.js
```bash
cd frontend
rm -rf .next
npm run dev
```

### Fix 5: Check Environment
```bash
# Make sure you're in the right directory
cd /Volumes/E/zenora/frontend

# Check git status
git log --oneline -1
# Should show: "5d6e8a5 Fix: Timezone-safe timesheet dates..."

# Check if API file has the fix
grep "toISOString().split" app/api/employee/timesheets/route.ts
# Should show the normalization code
```

## Verification After Fix

Once you apply a fix, verify:

1. **Page loads without errors**
2. **Console shows no red errors**
3. **Network tab shows API called**
4. **API response has** `"workDate": "2025-12-08"` (not with `T00:00:00.000Z`)
5. **Entry appears in Monday, Dec 8 column**
6. **"No entries" text disappears**

## Test Command

Run this to see what the API should return:
```bash
cd frontend
curl "http://localhost:3000/api/employee/timesheets?startDate=2025-12-08&endDate=2025-12-14" \
  -H "Cookie: $(grep -o 'session=[^;]*' ~/.cookies 2>/dev/null || echo 'session=your-session-id')" \
  | jq '.entries[0].workDate'
```

Should output: `"2025-12-08"` (without timezone)

## Still Not Working?

If none of the above work, there might be an issue with:
1. **Authentication**: Session might be expired
2. **Server Error**: Check server terminal logs
3. **Database Connection**: Check if Prisma can connect
4. **Tenant Filter**: Entry might be filtered out by tenant

Check server logs for errors:
```bash
# In the terminal running npm run dev
# Look for any error messages when page loads
```

## Contact Support

If issue persists after trying all fixes:
1. Provide screenshot of browser console
2. Provide screenshot of Network tab (API response)
3. Provide server terminal output
4. Run: `npx tsx scripts/check-current-week-entries.ts` and share output
