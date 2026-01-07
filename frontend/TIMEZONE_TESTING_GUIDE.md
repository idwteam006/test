# Timezone Testing Guide - Step by Step

## Prerequisites
- Application running locally or on development server
- Chrome or Edge browser (recommended for best DevTools support)
- Admin/employee access to timesheets module

---

## Method 1: Browser DevTools (Recommended - No System Changes)

### ✅ Advantages
- No need to change system settings
- Quick switching between timezones
- Safe - doesn't affect your computer
- Can test multiple timezones in minutes

### 📋 Step-by-Step Instructions

#### Step 1: Open Developer Tools
1. Open your application in **Chrome** or **Edge**
2. Press **F12** (or **Ctrl+Shift+I** on Windows, **Cmd+Option+I** on Mac)
3. DevTools panel opens at bottom or side

#### Step 2: Open Sensors Panel
1. In DevTools, click the **3-dot menu** (⋮) in the top-right corner
2. Select **More tools** → **Sensors**
3. The Sensors tab opens

#### Step 3: Change Timezone
1. In the Sensors panel, scroll to find **Location** section
2. Find the **Timezone** dropdown
3. Select a timezone from the list:

**Test These Key Timezones:**
```
✓ America/Toronto        (Canada EST, UTC-5)
✓ America/New_York       (USA EST, UTC-5)
✓ America/Los_Angeles    (USA PST, UTC-8)
✓ Europe/London          (UK GMT, UTC+0)
✓ Asia/Kolkata           (India IST, UTC+5:30)
✓ Asia/Tokyo             (Japan JST, UTC+9)
```

#### Step 4: Refresh and Test
1. **Refresh the page** (Ctrl+R or F5) - Important!
2. The browser now behaves as if it's in that timezone
3. Verify in console:
   ```javascript
   // Type this in Console tab:
   console.log(Intl.DateTimeFormat().resolvedOptions().timeZone);
   console.log(new Date().toString());
   ```

---

## Method 2: Testing Script (Simulation)

### Run the Timezone Display Test

```bash
cd frontend
npx tsx scripts/test-timezone-display.ts
```

This script shows:
- ✓ How dates appear in different timezones
- ✓ Database stored value vs displayed value
- ✓ Comparison with and without our fix
- ✓ Verification that normalized dates work correctly

### Expected Output:
```
TIMEZONE DISPLAY SIMULATION TEST
================================================================================

Testing Entry:
  ID: 2d15ce4f-aa6b-4107-803c-423de2d680be
  Description: total worked hours are 8.
  Hours: 8

DATABASE VALUE:
  Stored as: 2025-12-08T00:00:00.000Z
  Normalized: 2025-12-08

HOW IT APPEARS IN DIFFERENT TIMEZONES:
  India (IST)              UTC+5:30   → 12/08/2025, 05:30:00
  Canada East (EST)        UTC-5      → 12/07/2025, 19:00:00  ← WRONG DAY!
  USA East (EST)           UTC-5      → 12/07/2025, 19:00:00  ← WRONG DAY!
  UK (GMT)                 UTC+0      → 12/08/2025, 00:00:00

WITH NORMALIZED DATE (Our Fix):
  API Returns: "2025-12-08"
  Result: ✓ MATCH - Works in all timezones!
```

---

## Method 3: Complete User Journey Test

### Test Scenario: Add Timesheet Entry from Different Timezones

#### Test 1: Canada Timezone

1. **Set timezone** to `America/Toronto` (DevTools Sensors)
2. **Refresh page**
3. **Navigate** to Timesheets page
4. **Click** "Add Time Entry"
5. **Observe** the date input:
   - Should show: `12/09/2025` (MM/DD/YYYY format)
   - Hover over field to see internal value: `2025-12-09`

6. **Fill form**:
   ```
   Date: December 9, 2025 (leave as default or select)
   Hours: 8
   Activity: Development
   Description: Testing from Canada timezone
   ```

7. **Submit** the form
8. **Verify**:
   - ✓ Success toast appears
   - ✓ Entry appears in calendar on **December 9** column
   - ✓ No error in browser console (F12 → Console)

9. **Check database**:
   ```bash
   npx tsx scripts/check-vijay-timesheets.ts
   ```
   Verify the latest entry shows `Work Date: 2025-12-09`

#### Test 2: UK Timezone

1. **Change timezone** to `Europe/London`
2. **Refresh page**
3. **Navigate** to Timesheets page
4. **Click** "Add Time Entry"
5. **Observe** date input:
   - Should show: `09/12/2025` (DD/MM/YYYY format) ← Different display!
   - Internal value still: `2025-12-09`

6. **Fill and submit** form (same as Test 1)
7. **Verify** entry appears on **December 9** (same date as Test 1)

#### Test 3: US West Coast

1. **Change timezone** to `America/Los_Angeles` (UTC-8)
2. **Refresh page**
3. **Add entry** for today's date
4. **Verify** it appears on correct date in calendar

#### Test 4: India (Your Current Timezone)

1. **Change back** to `Asia/Kolkata`
2. **Refresh page**
3. **View all entries** created in Tests 1-3
4. **Verify** all entries show on their correct dates
5. **All three entries** should be visible and on the dates they were created for

---

## Method 4: Multi-Browser Testing

### Test with Different Browser Locales

**Chrome Profile Method:**

1. **Create Test Profiles**:
   - Chrome → Profile icon → Add profile
   - Create: "Test Canada", "Test UK", "Test USA"

2. **Set Language/Region**:
   - Settings → Languages
   - Add appropriate region:
     - Canada: English (Canada)
     - UK: English (United Kingdom)
     - USA: English (United States)

3. **For each profile**:
   - Use DevTools to set timezone
   - Test entry creation
   - Verify calendar display

---

## Testing Checklist

### ✓ Basic Functionality Tests

- [ ] Date input shows correct format for locale
- [ ] Date input internal value is YYYY-MM-DD
- [ ] Form submits successfully
- [ ] Success toast appears
- [ ] Entry appears in calendar immediately
- [ ] Entry appears in correct date column
- [ ] No console errors

### ✓ Timezone-Specific Tests

**For Each Timezone (Canada, UK, USA West, India):**

- [ ] **Create Entry**: Add new timesheet for today
- [ ] **Verify Display**: Entry shows on correct date
- [ ] **Check Format**: Date displays in local format (MM/DD or DD/MM)
- [ ] **API Response**: Console shows normalized date (YYYY-MM-DD)
- [ ] **Calendar Match**: Entry appears in calendar for correct day
- [ ] **Database Check**: Run script to verify stored date

### ✓ Edge Cases

- [ ] **Midnight Entry**: Create entry for date at 23:59 in one timezone
- [ ] **Date Boundary**: Test around date change (11:30 PM → 12:30 AM)
- [ ] **Past Week**: Switch week view, verify entries persist correctly
- [ ] **Refresh Test**: Refresh page, verify all entries still correct
- [ ] **Multiple Entries**: Create 3 entries same day different timezones

---

## Verification Commands

### Check Browser Timezone
```javascript
// In Browser Console (F12)
console.log('Timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
console.log('Date:', new Date().toString());
console.log('Offset:', new Date().getTimezoneOffset());
```

### Check Database Entries
```bash
cd frontend
npx tsx scripts/check-vijay-timesheets.ts
```

### Test API Response
```javascript
// In Browser Console
fetch('/api/employee/timesheets?startDate=2025-12-01&endDate=2025-12-31')
  .then(r => r.json())
  .then(data => {
    console.log('Entries:', data.entries);
    console.log('First entry workDate:', data.entries[0]?.workDate);
    console.log('Type:', typeof data.entries[0]?.workDate);
    console.log('Format check:', data.entries[0]?.workDate.includes('T') ? '❌ ISO timestamp' : '✓ YYYY-MM-DD');
  });
```

---

## Expected Results

### ✅ What Should Work

| Test | Canada (EST) | UK (GMT) | India (IST) | Expected Result |
|------|-------------|---------|-------------|-----------------|
| Date Display | 12/09/2025 | 09/12/2025 | 09/12/2025 | Different formats, same date |
| Internal Value | 2025-12-09 | 2025-12-09 | 2025-12-09 | Always YYYY-MM-DD |
| API Response | "2025-12-09" | "2025-12-09" | "2025-12-09" | Normalized string |
| Calendar Show | Dec 9 column | Dec 9 column | Dec 9 column | Same position |
| Database Store | 2025-12-09T00:00:00.000Z | Same | Same | UTC timestamp |

### ❌ What Should NOT Happen

- ❌ Entry created for Dec 9 appearing on Dec 8 or Dec 10
- ❌ API returning `"2025-12-09T00:00:00.000Z"` with timezone
- ❌ Calendar showing entry in wrong date column
- ❌ Console errors about date parsing
- ❌ Date shifting when switching timezones
- ❌ Entry disappearing after refresh

---

## Troubleshooting

### Issue: Date shows in wrong column

**Cause**: API might be returning ISO timestamp instead of normalized date

**Fix Check**:
1. Open Console (F12)
2. Check API response:
   ```javascript
   fetch('/api/employee/timesheets?startDate=2025-12-01&endDate=2025-12-31')
     .then(r => r.json())
     .then(data => console.log(data.entries[0]?.workDate));
   ```
3. Should show: `"2025-12-09"` (just date)
4. Should NOT show: `"2025-12-09T00:00:00.000Z"` (with time)

### Issue: DevTools timezone not changing

**Solution**:
1. Make sure you're in the **Sensors** tab (not Console)
2. Select timezone from dropdown
3. **Must refresh page** (F5) after changing
4. Verify with: `console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)`

### Issue: Date format looks wrong

**This is NORMAL!** Different regions show dates differently:
- USA/Canada: 12/09/2025 (MM/DD/YYYY)
- UK/India: 09/12/2025 (DD/MM/YYYY)
- Internal value is always: 2025-12-09 (YYYY-MM-DD)

---

## Quick Test (5 Minutes)

1. **Open DevTools** (F12) → Sensors tab
2. **Set timezone**: America/Toronto
3. **Refresh page**
4. **Add entry**: Any date, 8 hours, "Test"
5. **Verify**: Entry shows in calendar on correct date
6. **Change timezone**: Asia/Kolkata
7. **Refresh page**
8. **Verify**: Same entry still shows on correct date
9. **Result**: ✓ Timezone fix working!

---

## Video Tutorial (Steps)

If you want to record a test video:

1. Start screen recording
2. Show browser timezone: Console → `console.log(Intl.DateTimeFormat().resolvedOptions().timeZone)`
3. Show current date display in form
4. Fill and submit form
5. Show entry appearing in calendar
6. Switch to different timezone
7. Refresh and verify entry still correct
8. Repeat for 2-3 timezones
9. End recording

---

## Summary

**You've successfully tested if**:
✅ Entries appear on correct date regardless of timezone
✅ Date display adapts to regional format (MM/DD or DD/MM)
✅ API returns normalized dates (YYYY-MM-DD)
✅ Calendar comparison works across timezones
✅ No date shifting when switching timezones

**Testing complete!** The timezone fix ensures consistent behavior worldwide.
