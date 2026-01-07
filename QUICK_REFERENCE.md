# 🚀 Zenora.ai - Quick Reference Card

**Last Updated**: 2025-10-09

---

## ⚡ Essential Commands

### Development
```bash
# Start dev server
npm run dev                      # http://localhost:3000

# View database
npx prisma studio                # http://localhost:5555

# Generate Prisma Client
npx prisma generate

# Update database schema
npx prisma db push

# Test connections
node scripts/test-db-connection.js
node scripts/test-redis-connection.js
```

---

## 🔐 Environment Variables

```bash
# Database (Railway)
DATABASE_URL="postgresql://postgres:FlrOdwpwIfYJRYbKQkGmbFAgQWDxTHcZ@interchange.proxy.rlwy.net:34268/railway"

# Redis (Railway)
REDIS_URL="redis://default:mzMBfKSmPmwTaqBkrzNqxvmvKRoDmaiC@shuttle.proxy.rlwy.net:14098"

# AWS S3
AWS_REGION="eu-north-1"
AWS_ACCESS_KEY_ID="AKIAZKITO5EZU2G3AEUS"
S3_BUCKET_NAME="medical-storage-prod"

# JWT
JWT_SECRET="[64-char-secret]"
JWT_REFRESH_SECRET="[64-char-secret]"
```

---

## 📊 Database Info

| Property | Value |
|----------|-------|
| **Type** | PostgreSQL 17.6 |
| **Host** | interchange.proxy.rlwy.net:34268 |
| **Database** | railway |
| **Tables** | 20 |
| **Provider** | Railway |

---

## 🗄️ Redis Info

| Property | Value |
|----------|-------|
| **Type** | Redis 8.2.1 |
| **Host** | shuttle.proxy.rlwy.net:14098 |
| **Mode** | Standalone |
| **Provider** | Railway |

---

## 📦 Key Models

```typescript
// Import Prisma Client
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Create Tenant
await prisma.tenant.create({
  data: { name: 'Acme Corp', slug: 'acme' }
});

// Create User
await prisma.user.create({
  data: {
    tenantId: tenant.id,
    email: 'user@acme.com',
    name: 'John Doe',
    role: 'ADMIN'
  }
});

// Upload File
await prisma.fileUpload.create({
  data: {
    tenantId: tenant.id,
    uploadedById: user.id,
    fileName: 'document.pdf',
    fileUrl: 's3-url',
    s3Key: 'tenant/category/file.pdf',
    fileSize: 102400,
    mimeType: 'application/pdf',
    category: 'EMPLOYEE_DOCUMENT'
  }
});
```

---

## 🔧 S3 Upload

```typescript
import { uploadFileToS3, generateS3Key } from '@/lib/s3';

// Upload file
const s3Key = generateS3Key(tenantId, 'employees/documents', file.name);
const url = await uploadFileToS3(buffer, s3Key, file.type);

// Generate presigned URL
const downloadUrl = await generatePresignedUrl(s3Key, 3600);

// Delete file
await deleteFileFromS3(s3Key);
```

---

## 🌐 API Routes

```typescript
// GET /api/employees
// POST /api/employees
// GET /api/employees/[id]
// PUT /api/employees/[id]
// DELETE /api/employees/[id]

// POST /api/upload (file upload)
// DELETE /api/upload?key=xxx (file delete)
```

---

## 🧪 Testing

```bash
# Unit tests
npm test

# E2E tests
npm run test:e2e

# Coverage
npm run test:coverage
```

---

## 📁 Project Structure

```
frontend/
├── app/                 # Next.js App Router
│   ├── api/            # API routes
│   └── (auth)/         # Auth pages
├── components/          # React components
├── lib/                 # Utilities
│   ├── s3.ts           # S3 functions
│   └── prisma.ts       # Prisma client
├── prisma/
│   └── schema.prisma   # Database schema
└── scripts/            # Helper scripts
```

---

## 🎯 FileCategory Enum

```typescript
enum FileCategory {
  EMPLOYEE_DOCUMENT      // Contracts, IDs
  EMPLOYEE_PHOTO         // Profile pictures
  INVOICE                // Client invoices
  PAYROLL                // Payroll docs
  PERFORMANCE_REVIEW     // Reviews
  CONTRACT               // Employment contracts
  RECEIPT                // Expense receipts
  REPORT                 // Generated reports
  OTHER                  // Miscellaneous
}
```

---

## 🚀 Git Commands

```bash
# Status
git status

# Add all
git add .

# Commit
git commit -m "feat: add feature"

# Push
git push origin main

# Pull
git pull origin main
```

---

## 🔗 Important Links

- **GitHub**: https://github.com/nbhupathi/zenora
- **Railway**: https://railway.app/dashboard
- **AWS S3**: https://s3.console.aws.amazon.com/s3/buckets/medical-storage-prod
- **Prisma Studio**: http://localhost:5555 (when running)

---

## 🆘 Quick Fixes

### Can't connect to database
```bash
# Check DATABASE_URL
echo $DATABASE_URL

# Regenerate client
npx prisma generate
```

### Can't connect to Redis
```bash
# Check REDIS_URL
echo $REDIS_URL

# Test connection
node scripts/test-redis-connection.js
```

### File upload fails
```bash
# Check AWS credentials
echo $AWS_ACCESS_KEY_ID
echo $S3_BUCKET_NAME

# Install dependencies
npm install @aws-sdk/client-s3
```

### Prisma errors
```bash
# Reset and regenerate
npx prisma generate
npx prisma db push --force-reset
```

---

## 📞 Need Help?

1. Check `SETUP_COMPLETE.md` for detailed setup
2. Check `docs/S3_SETUP.md` for S3 usage
3. Check `.orchestrator/COMPLETE_AGENT_SYSTEM.md` for agents
4. Check module specs in `modules/` folder

---

**Quick Start**: `cd frontend && npm run dev` 🚀
