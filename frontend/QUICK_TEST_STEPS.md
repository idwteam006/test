# Quick Timezone Testing - 10 Minutes

## 🚀 Fastest Way to Test (Using Chrome DevTools)

### Step 1: Open DevTools Sensors (30 seconds)
```
1. Open your app in Chrome/Edge
2. Press F12
3. Click ⋮ (three dots) in DevTools
4. More tools → Sensors
5. Find "Timezone" dropdown in Location section
```

### Step 2: Test Canada Timezone (3 minutes)
```
1. Select: America/Toronto
2. Press F5 to refresh page
3. Go to Timesheets → Add Time Entry
4. Look at Date field: Shows "12/09/2025" (MM/DD/YYYY)
5. Fill:
   - Hours: 8
   - Description: "Test from Canada"
6. Click Save Entry
7. ✓ Check: Entry appears in Dec 9 column
```

### Step 3: Test UK Timezone (3 minutes)
```
1. Select: Europe/London
2. Press F5 to refresh
3. Go to Timesheets → Add Time Entry
4. Look at Date field: Shows "09/12/2025" (DD/MM/YYYY) ← Different!
5. Fill:
   - Hours: 8
   - Description: "Test from UK"
6. Click Save Entry
7. ✓ Check: Entry appears in Dec 9 column (same as Canada entry)
```

### Step 4: Verify in India Timezone (2 minutes)
```
1. Select: Asia/Kolkata (your current timezone)
2. Press F5 to refresh
3. View calendar
4. ✓ Check: Both entries (Canada and UK) visible on Dec 9
5. ✓ Check: No entries on Dec 8 or Dec 10
```

### Step 5: Verify with Console (1 minute)
```
Press F12 → Console tab, paste and run:

fetch('/api/employee/timesheets?startDate=2025-12-01&endDate=2025-12-31')
  .then(r => r.json())
  .then(data => {
    const entry = data.entries[0];
    console.log('✓ WorkDate:', entry.workDate);
    console.log('✓ Format:', entry.workDate.includes('T') ? '❌ Has timezone' : '✅ Clean YYYY-MM-DD');
  });

Expected output:
✓ WorkDate: 2025-12-09
✓ Format: ✅ Clean YYYY-MM-DD
```

---

## 🎯 What You're Testing

| What | Canada | UK | India | Result |
|------|---------|-----|-------|--------|
| **Display Format** | 12/09/2025 | 09/12/2025 | 09/12/2025 | Different ✓ |
| **Internal Value** | 2025-12-09 | 2025-12-09 | 2025-12-09 | Same ✓ |
| **Calendar Column** | Dec 9 | Dec 9 | Dec 9 | Same ✓ |
| **API Response** | "2025-12-09" | "2025-12-09" | "2025-12-09" | Same ✓ |

---

## ✅ Success Indicators

You'll know it's working if:
1. Date input **displays** differently (12/09 vs 09/12) based on timezone ✓
2. Entry **appears** in calendar on same date regardless of timezone ✓
3. API **returns** just `"2025-12-09"` not `"2025-12-09T00:00:00.000Z"` ✓
4. Console shows **no errors** ✓

---

## ❌ Failure Indicators

It's NOT working if:
- Entry created for Dec 9 appears on Dec 8 or Dec 10
- API returns ISO timestamp with "T" and timezone
- Entry disappears when switching timezones
- Console shows date parsing errors

---

## 📊 Quick Database Check

Run this to see database values:
```bash
cd frontend
npx tsx scripts/check-vijay-timesheets.ts
```

Look for:
```
Latest Timesheet Entry:
  Work Date: 2025-12-09  ← Should be the date you entered
```

---

## 🎬 Test Video Checklist

If recording test video for client/team:

1. [ ] Show DevTools Sensors tab
2. [ ] Show timezone selection dropdown
3. [ ] Show current timezone in console: `Intl.DateTimeFormat().resolvedOptions().timeZone`
4. [ ] Show date input format for timezone 1
5. [ ] Create entry and show it appears in calendar
6. [ ] Switch to timezone 2
7. [ ] Show date input format changed
8. [ ] Create another entry
9. [ ] Show both entries visible on correct dates
10. [ ] Show API response in console (normalized dates)
11. [ ] Switch back to India timezone
12. [ ] Show all entries still correct

---

## 🔧 Timezone Options for Testing

**Must Test (Minimum 2):**
- `America/Toronto` (Canada EST, UTC-5)
- `Asia/Kolkata` (India IST, UTC+5:30)

**Good to Test:**
- `Europe/London` (UK GMT, UTC+0)
- `America/Los_Angeles` (USA PST, UTC-8)

**Edge Cases:**
- `Pacific/Auckland` (New Zealand, UTC+13) - Furthest ahead
- `America/Anchorage` (Alaska, UTC-9) - Far behind

---

## 💡 Pro Tips

1. **Always refresh** (F5) after changing timezone
2. **Use Console** to verify: `console.log(new Date())`
3. **Check API** response format using fetch commands
4. **Compare entries** created in different timezones
5. **Test at midnight** (23:00-01:00) to catch edge cases

---

## 📱 Mobile Testing (Optional)

To test on mobile/tablet:
1. Use Chrome Remote Debugging
2. Or deploy to test server
3. Access from devices in different locations
4. Or use VPN + timezone change on device

---

## Summary

**5-Minute Test:**
1. DevTools → Sensors → Set Canada timezone
2. Add entry, verify appears correctly
3. Switch to UK timezone, verify still correct
4. Done! ✓

**10-Minute Full Test:**
1. Test 3 timezones (Canada, UK, India)
2. Create entry in each
3. Verify all show on correct dates
4. Check console for API response format
5. Run database check script
6. Done! ✓✓✓

The fix is working if entries always appear on the date you entered them for, regardless of which timezone you're testing from!
