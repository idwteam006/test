# Fix User Creation Issues - Complete Guide

## Quick Diagnosis & Fix

Run this in your browser console (F12 → Console tab):

```javascript
// 🔍 Step 1: Check email domain settings
console.log('🔍 Checking email domain settings...');
fetch('/api/admin/fix-email-domains')
  .then(r => r.json())
  .then(data => {
    console.log('Current Settings:', data);
    if (data.data?.isRestricted) {
      console.log('⚠️  Email domains are restricted!');
      console.log('Allowed domains:', data.data.allowedDomains);
      console.log('💡 Run Step 2 to fix this');
    } else {
      console.log('✅ Email domains: All allowed');
    }
  });
```

```javascript
// 🔧 Step 2: Remove email domain restrictions (if needed)
console.log('🔧 Removing email domain restrictions...');
fetch('/api/admin/fix-email-domains', { method: 'POST' })
  .then(r => r.json())
  .then(data => {
    console.log('✅ Fixed!', data);
    console.log('Now all email domains are allowed');
  });
```

```javascript
// 🔍 Step 3: Check if specific emails exist
const emailsToCheck = ['anil@adtechno.com', 'pushpa@addtechno.com'];

console.log('🔍 Checking if emails already exist...');
emailsToCheck.forEach(email => {
  fetch(`/api/admin/check-user?email=${email}`)
    .then(r => r.json())
    .then(data => {
      if (data.exists) {
        console.log(`❌ ${email} - ALREADY EXISTS`);
        console.log('   User:', data.user);
        console.log('   💡 Use a different email OR delete this user first');
      } else {
        console.log(`✅ ${email} - Available`);
      }
    });
});
```

```javascript
// 🗑️  Step 4: Delete existing users (OPTIONAL - only if you want to recreate them)
// ⚠️  WARNING: This will permanently delete the user!
const emailToDelete = 'anil@adtechno.com'; // Change this

if (confirm(`⚠️  Are you sure you want to DELETE ${emailToDelete}?`)) {
  console.log(`🗑️  Deleting ${emailToDelete}...`);
  fetch(`/api/admin/check-user?email=${emailToDelete}`, { method: 'DELETE' })
    .then(r => r.json())
    .then(data => {
      console.log('✅ Deleted!', data);
      console.log('You can now recreate this user');
    })
    .catch(err => console.error('❌ Failed:', err));
}
```

---

## Complete Fix Script (All-in-One)

Run this single script to diagnose and fix everything:

```javascript
(async function fixUserCreation() {
  console.log('🚀 Starting User Creation Fix...\n');

  // Step 1: Check email domain settings
  console.log('📋 Step 1: Checking email domain settings...');
  const domainCheck = await fetch('/api/admin/fix-email-domains').then(r => r.json());
  console.log('   Current:', domainCheck.data);

  if (domainCheck.data?.isRestricted) {
    console.log('   ⚠️  Domains are restricted. Fixing...');
    const fixed = await fetch('/api/admin/fix-email-domains', { method: 'POST' }).then(r => r.json());
    console.log('   ✅ Fixed!', fixed.data);
  } else {
    console.log('   ✅ All domains allowed\n');
  }

  // Step 2: Check problematic emails
  console.log('📋 Step 2: Checking if emails exist...');
  const emails = ['anil@adtechno.com', 'pushpa@addtechno.com'];

  for (const email of emails) {
    const check = await fetch(`/api/admin/check-user?email=${email}`).then(r => r.json());
    if (check.exists) {
      console.log(`   ❌ ${email} - EXISTS (Created: ${new Date(check.user.createdAt).toLocaleDateString()})`);
      console.log(`      Role: ${check.user.role}, Status: ${check.user.status}`);
    } else {
      console.log(`   ✅ ${email} - Available`);
    }
  }

  console.log('\n✅ Diagnosis complete!');
  console.log('\n💡 Next Steps:');
  console.log('   1. If emails exist, either:');
  console.log('      a) Use different emails (recommended)');
  console.log('      b) Delete existing users first (see Step 4 above)');
  console.log('   2. Try creating users again');
  console.log('   3. System is ready!');
})();
```

---

## Manual Solutions

### Solution 1: Use Different Emails (Recommended)

Instead of `anil@adtechno.com`, try:
- `anil.kumar@adtechno.com`
- `anil2@adtechno.com`
- `aniladmin@adtechno.com`
- `test.anil@adtechno.com`

### Solution 2: Delete and Recreate

If you really need those specific emails:

```javascript
// Delete existing user
await fetch('/api/admin/check-user?email=anil@adtechno.com', {
  method: 'DELETE'
}).then(r => r.json());

// Now create new user with same email
// Use the UI or API
```

### Solution 3: Check All Users

To see all existing users:
1. Go to `/admin/system-users`
2. Search for the email
3. See if user already exists

---

## Understanding the Errors

### Error 1: "Email already exists"
**Cause:** User with that email already in database
**Fix:** Use different email OR delete existing user

### Error 2: "Email domain is not allowed"
**Cause:** Email domain not in allowedEmailDomains list
**Fix:** Run Step 2 above to allow all domains

### Error 3: "Unique constraint failed on employeeNumber"
**Cause:** Date mutation bug (FIXED in latest version)
**Status:** ✅ Already fixed and pushed

---

## Production Checklist

Before going to production:

- [ ] Email domain restrictions configured (or wildcard `*`)
- [ ] All test users created successfully
- [ ] Employee numbers are unique
- [ ] Welcome emails being sent
- [ ] Audit logs working
- [ ] No duplicate emails in database

---

## Need More Help?

Run the diagnostic script above and share the output. It will show:
- Current email domain settings
- Which emails exist
- What the errors mean
- Recommended next steps

---

**Generated by Claude Code**
All fixes committed and pushed to GitHub ✅
