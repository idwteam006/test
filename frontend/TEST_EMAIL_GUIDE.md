# Test Email Guide

I've created a test email endpoint for you to send a welcome email to nbhupathi@gmail.com.

## Method 1: Using cURL (Command Line)

```bash
curl -X POST http://localhost:3000/api/test-email \
  -H "Content-Type: application/json" \
  -d '{
    "email": "nbhupathi@gmail.com",
    "firstName": "Naresh",
    "companyName": "AddTechno.com"
  }'
```

## Method 2: Using the Browser Console

1. Make sure your Next.js dev server is running (`npm run dev`)
2. Open your browser to `http://localhost:3000`
3. Open the browser console (F12)
4. Paste and run this code:

```javascript
fetch('/api/test-email', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'nbhupathi@gmail.com',
    firstName: 'Naresh',
    companyName: 'AddTechno.com'
  })
})
.then(r => r.json())
.then(data => {
  console.log('✅ Result:', data);
  if (data.success) {
    console.log('📧 Email sent successfully!');
    console.table(data.details);
  } else {
    console.error('❌ Failed:', data.error);
  }
});
```

## Method 3: Using Postman or Insomnia

**Endpoint:** `POST http://localhost:3000/api/test-email`

**Headers:**
```
Content-Type: application/json
```

**Body (JSON):**
```json
{
  "email": "nbhupathi@gmail.com",
  "firstName": "Naresh",
  "companyName": "AddTechno.com"
}
```

## Expected Response

**Success:**
```json
{
  "success": true,
  "message": "Welcome email sent successfully to nbhupathi@gmail.com",
  "details": {
    "to": "nbhupathi@gmail.com",
    "firstName": "Naresh",
    "companyName": "AddTechno.com",
    "template": "Welcome Email"
  }
}
```

**Error:**
```json
{
  "success": false,
  "error": "Failed to send email. Check Resend API configuration."
}
```

## Email Template Preview

The email that will be sent uses the **Welcome Email template** from the system:

- **Subject:** Welcome to AddTechno.com - Zenora.ai
- **Content:**
  - Welcome greeting with user's first name (Naresh)
  - Company name (AddTechno.com)
  - Information about passwordless authentication
  - Login button linking to the app
  - Beautiful gradient design (purple theme)

## What's Included in the Email

✅ Personalized greeting ("Hi Naresh,")  
✅ Welcome message from AddTechno.com  
✅ Information about getting started  
✅ Secure passwordless authentication explanation  
✅ Login button (links to http://localhost:3000/login)  
✅ Professional branding and styling  
✅ Year and copyright information  

## Troubleshooting

If the email fails to send:

1. **Check Environment Variables:**
   - `RESEND_API_KEY` must be set in `.env`
   - `RESEND_FROM_EMAIL` must be set (e.g., "Zenora <noreply@zenora.ai>")
   - `NEXT_PUBLIC_APP_URL` should be set

2. **Check Resend Configuration:**
   - Domain must be verified in Resend dashboard
   - API key must be valid and active
   - Check Resend dashboard for any errors

3. **Check Server Logs:**
   - Look at your Next.js terminal for error messages
   - The API will log email sending attempts

## Files Created

1. **API Endpoint:** `/app/api/test-email/route.ts`
2. **Test Script:** `/scripts/send-test-email.ts` (for future use with Node.js)
3. **This Guide:** `/TEST_EMAIL_GUIDE.md`

---

**Ready to send?** Just run one of the methods above while your dev server is running!
