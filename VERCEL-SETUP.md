# Vercel Deployment Setup Guide

## Environment Variables

Go to your Vercel project **Settings > Environment Variables** and add the following:

### Required Variables

```bash
# Database (Railway PostgreSQL - Public URL)
DATABASE_URL=postgresql://postgres:FlrOdwpwIfYJRYbKQkGmbFAgQWDxTHcZ@interchange.proxy.rlwy.net:34268/railway

# Redis (Railway Redis - Public URL)
REDIS_URL=redis://default:mzMBfKSmPmwTaqBkrzNqxvmvKRoDmaiC@shuttle.proxy.rlwy.net:14098

# JWT Secrets (CHANGE THESE - generate with: openssl rand -base64 32)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars
JWT_REFRESH_SECRET=your-super-secret-refresh-key-min-32-chars

# JWT Expiration
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

# App URL (replace with your Vercel URL)
NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Encryption Key (generate with: openssl rand -hex 32)
ENCRYPTION_KEY=your-64-char-hex-encryption-key

# Node Environment
NODE_ENV=production
```

### Email Configuration (Optional - for magic link emails)

```bash
SMTP_HOST=smtp.hostinger.com
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=noreply@your-domain.com
SMTP_PASS=your-email-password
SMTP_FROM=Zenora.ai <noreply@your-domain.com>
```

## Important Notes

### 1. Generate Secure Secrets

```bash
# Generate JWT_SECRET
openssl rand -base64 32

# Generate JWT_REFRESH_SECRET
openssl rand -base64 32

# Generate ENCRYPTION_KEY
openssl rand -hex 32
```

### 2. Database Connection

- Railway PostgreSQL is already configured
- The public URL works from Vercel
- Database has all required tables (User, Tenant, Department, etc.)

### 3. Redis Connection

- Railway Redis is deployed at `shuttle.proxy.rlwy.net:14098`
- Password: `mzMBfKSmPmwTaqBkrzNqxvmvKRoDmaiC`
- Used for: Magic link storage, session management, rate limiting

### 4. Deployment

1. Push your code to GitHub (already done)
2. Connect your GitHub repository to Vercel
3. Add all environment variables in Vercel dashboard
4. Deploy!

### 5. Post-Deployment

After deployment, your app URL will be something like:
```
https://zenora-alpha.vercel.app
```

Update the `NEXT_PUBLIC_APP_URL` environment variable with your actual Vercel URL.

## Troubleshooting

### Build Fails

If the build fails:
- Check Vercel build logs
- Verify all environment variables are set
- Ensure `ioredis` is in `dependencies` (not `devDependencies`)

### Redis Connection Issues

If Redis fails to connect:
- The app will still work (Redis is optional)
- Check Railway Redis is running
- Verify the public URL `shuttle.proxy.rlwy.net:14098` is accessible
- Check password is correct

### Database Connection Issues

If database connection fails:
- Verify Railway PostgreSQL is running
- Check the public URL in `DATABASE_URL`
- Ensure database has been migrated: `npx prisma db push`

## Testing

After deployment:

1. Visit your Vercel URL
2. Try to sign up: `/signup`
3. Try to log in: `/auth/login`
4. Check Redis connection in logs

## Current Credentials

**Database:** `interchange.proxy.rlwy.net:34268`
**Redis:** `shuttle.proxy.rlwy.net:14098`

Both are deployed on Railway and accessible from Vercel.
