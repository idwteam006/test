# Employee Dashboard - Schema Extensions

This document outlines additional Prisma schema models needed for the employee dashboard modules.

## ✅ Existing Models (Already in Schema)

- ✅ User
- ✅ Employee
- ✅ EmployeeProfile
- ✅ Department
- ✅ Task
- ✅ Project
- ✅ ProjectAssignment
- ✅ TimeEntry (for timesheets)
- ✅ LeaveRequest
- ✅ LeaveBalance
- ✅ Goal
- ✅ PerformanceReview
- ✅ PayrollRecord

## 📋 New Models Needed

### 1. Attendance (Clock In/Out)

```prisma
model Attendance {
  id            String          @id @default(uuid())
  tenantId      String
  employeeId    String
  userId        String
  date          DateTime        @default(now())

  // Clock in/out times
  clockIn       DateTime?
  clockOut      DateTime?
  clockInIp     String?
  clockOutIp    String?
  clockInLocation Json?         // {lat, lng, address}
  clockOutLocation Json?

  // Break times
  breaks        Json?           // Array of {startTime, endTime, duration}
  totalBreakMinutes Int?

  // Work hours
  totalHours    Float?          // Calculated
  regularHours  Float?
  overtimeHours Float?

  // Status
  status        AttendanceStatus @default(PRESENT)
  notes         String?
  approvedBy    String?
  approvedAt    DateTime?

  createdAt     DateTime        @default(now())
  updatedAt     DateTime        @updatedAt

  employee      Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  user          User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant        Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([employeeId, date])
  @@index([tenantId])
  @@index([employeeId])
  @@index([userId])
  @@index([date])
  @@index([status])
}

enum AttendanceStatus {
  PRESENT
  ABSENT
  LATE
  HALF_DAY
  WORK_FROM_HOME
  ON_LEAVE
  HOLIDAY
}
```

### 2. EmployeeDocument (Document Management)

```prisma
model EmployeeDocument {
  id              String          @id @default(uuid())
  tenantId        String
  employeeId      String
  userId          String

  // Document details
  documentType    DocumentType
  documentName    String
  documentUrl     String
  fileSize        Int?            // in bytes
  mimeType        String?

  // Metadata
  issueDate       DateTime?
  expiryDate      DateTime?
  documentNumber  String?         // Certificate number, ID number, etc.
  issuingAuthority String?

  // Status
  status          DocumentStatus  @default(PENDING)
  verifiedBy      String?         // User ID of verifier
  verifiedAt      DateTime?
  rejectionReason String?

  // Access control
  isPublic        Boolean         @default(false)  // Can employee see it?
  accessibleBy    Json?           // Array of user IDs who can access

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  employee        Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([employeeId])
  @@index([userId])
  @@index([documentType])
  @@index([status])
  @@index([expiryDate])
}

enum DocumentType {
  RESUME
  PHOTO_ID
  AADHAAR_CARD
  PAN_CARD
  PASSPORT
  DRIVING_LICENSE
  EDUCATION_CERTIFICATE
  EXPERIENCE_LETTER
  SALARY_SLIP
  BANK_PASSBOOK
  CANCELLED_CHEQUE
  ADDRESS_PROOF
  MEDICAL_CERTIFICATE
  VACCINATION_CARD
  OFFER_LETTER
  APPOINTMENT_LETTER
  INCREMENT_LETTER
  RELIEVING_LETTER
  OTHER
}

enum DocumentStatus {
  PENDING
  VERIFIED
  REJECTED
  EXPIRED
}
```

### 3. PayrollSlip (Extended from PayrollRecord)

```prisma
model PayrollSlip {
  id                String   @id @default(uuid())
  tenantId          String
  employeeId        String
  payrollRecordId   String?  @unique

  // Period
  month             Int      // 1-12
  year              Int
  payPeriodStart    DateTime
  payPeriodEnd      DateTime
  paymentDate       DateTime?

  // Earnings
  basicSalary       Float
  hra               Float?
  conveyanceAllowance Float?
  medicalAllowance  Float?
  specialAllowance  Float?
  otherAllowances   Json?    // Array of {name, amount}
  grossSalary       Float

  // Deductions
  providentFund     Float?
  professionalTax   Float?
  incomeTax         Float?
  esi               Float?
  otherDeductions   Json?    // Array of {name, amount}
  totalDeductions   Float

  // Net pay
  netSalary         Float

  // Additional info
  workingDays       Int?
  leaveDays         Float?
  presentDays       Int?
  paidDays          Float?

  // Status
  status            PayrollStatus @default(DRAFT)
  pdfUrl            String?

  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  employee          Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  payrollRecord     PayrollRecord? @relation(fields: [payrollRecordId], references: [id])
  tenant            Tenant   @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([employeeId, month, year])
  @@index([tenantId])
  @@index([employeeId])
  @@index([year, month])
  @@index([status])
}

enum PayrollStatus {
  DRAFT
  PROCESSED
  PAID
  ON_HOLD
}
```

### 4. ExpenseClaim (Reimbursements)

```prisma
model ExpenseClaim {
  id              String          @id @default(uuid())
  tenantId        String
  employeeId      String
  userId          String

  // Claim details
  claimNumber     String          @unique
  expenseType     ExpenseType
  expenseCategory String?         // Travel, Food, Accommodation, etc.
  amount          Float
  currency        String          @default("USD")

  // Details
  expenseDate     DateTime
  description     String
  receiptUrl      String?
  receiptUrls     Json?           // Array of receipt URLs

  // Approval
  status          ApprovalStatus  @default(PENDING)
  submittedAt     DateTime?
  reviewedBy      String?
  reviewedAt      DateTime?
  rejectionReason String?

  // Payment
  paidAmount      Float?
  paidOn          DateTime?
  paymentMethod   String?         // Bank transfer, Cash, etc.
  transactionRef  String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  employee        Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([employeeId])
  @@index([userId])
  @@index([status])
  @@index([expenseDate])
  @@index([claimNumber])
}

enum ExpenseType {
  TRAVEL
  FOOD
  ACCOMMODATION
  TRANSPORT
  OFFICE_SUPPLIES
  INTERNET
  MOBILE
  TRAINING
  MEDICAL
  OTHER
}
```

### 5. TrainingCourse (Learning & Development)

```prisma
model TrainingCourse {
  id              String          @id @default(uuid())
  tenantId        String

  // Course details
  courseCode      String          @unique
  title           String
  description     String?
  category        String?         // Technical, Soft Skills, Compliance, etc.
  provider        String?         // Internal, Udemy, Coursera, etc.

  // Content
  duration        Int?            // in hours
  format          CourseFormat    @default(ONLINE)
  courseUrl       String?
  thumbnailUrl    String?
  certificateTemplate String?

  // Requirements
  isRequired      Boolean         @default(false)
  prerequisites   Json?           // Array of course IDs
  skillLevel      String?         // Beginner, Intermediate, Advanced

  // Dates
  startDate       DateTime?
  endDate         DateTime?
  enrollmentDeadline DateTime?

  // Status
  isActive        Boolean         @default(true)
  maxParticipants Int?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  createdBy       String

  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  enrollments     TrainingEnrollment[]

  @@index([tenantId])
  @@index([courseCode])
  @@index([category])
  @@index([isActive])
}

enum CourseFormat {
  ONLINE
  CLASSROOM
  HYBRID
  WORKSHOP
  WEBINAR
}
```

### 6. TrainingEnrollment (Employee Course Progress)

```prisma
model TrainingEnrollment {
  id              String          @id @default(uuid())
  tenantId        String
  courseId        String
  employeeId      String
  userId          String

  // Enrollment
  enrolledAt      DateTime        @default(now())
  enrolledBy      String?         // User ID (self or assigned by manager)
  isRequired      Boolean         @default(false)

  // Progress
  status          EnrollmentStatus @default(NOT_STARTED)
  progress        Int             @default(0) // 0-100
  startedAt       DateTime?
  completedAt     DateTime?

  // Assessment
  quizScore       Float?
  passingScore    Float?
  attempts        Int             @default(0)

  // Certificate
  certificateUrl  String?
  certificateIssueDate DateTime?

  // Time tracking
  timeSpentMinutes Int?
  lastAccessedAt  DateTime?

  // Feedback
  rating          Int?            // 1-5
  feedback        String?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  course          TrainingCourse  @relation(fields: [courseId], references: [id], onDelete: Cascade)
  employee        Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@unique([courseId, employeeId])
  @@index([tenantId])
  @@index([courseId])
  @@index([employeeId])
  @@index([userId])
  @@index([status])
}

enum EnrollmentStatus {
  NOT_STARTED
  IN_PROGRESS
  COMPLETED
  FAILED
  EXPIRED
}
```

### 7. TeamAnnouncement (Team Collaboration)

```prisma
model TeamAnnouncement {
  id              String          @id @default(uuid())
  tenantId        String

  // Announcement details
  title           String
  content         String          // Rich text/markdown
  category        AnnouncementCategory @default(GENERAL)
  priority        AnnouncementPriority @default(NORMAL)

  // Targeting
  isGlobal        Boolean         @default(false)
  targetDepartments Json?         // Array of department IDs
  targetEmployees Json?           // Array of employee IDs

  // Media
  attachmentUrls  Json?           // Array of file URLs
  imageUrl        String?

  // Publishing
  publishedBy     String          // User ID
  publishedAt     DateTime        @default(now())
  expiresAt       DateTime?
  isPinned        Boolean         @default(false)

  // Status
  isActive        Boolean         @default(true)

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([publishedAt])
  @@index([isActive])
  @@index([isPinned])
}

enum AnnouncementCategory {
  GENERAL
  POLICY
  EVENT
  HOLIDAY
  EMERGENCY
  CELEBRATION
  TRAINING
  IT_NOTICE
}

enum AnnouncementPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 8. EmployeeRequest (Generic Requests Module)

```prisma
model EmployeeRequest {
  id              String          @id @default(uuid())
  tenantId        String
  employeeId      String
  userId          String

  // Request details
  requestNumber   String          @unique
  requestType     RequestType
  title           String
  description     String

  // Attachments
  attachmentUrls  Json?           // Array of file URLs

  // Approval workflow
  status          ApprovalStatus  @default(PENDING)
  submittedAt     DateTime?
  reviewedBy      String?         // User ID
  reviewedAt      DateTime?
  approvalComments String?
  rejectionReason String?

  // Processing
  assignedTo      String?         // User ID (HR/IT/Admin)
  processedBy     String?
  processedAt     DateTime?
  completedAt     DateTime?

  // Priority
  priority        RequestPriority @default(NORMAL)
  dueDate         DateTime?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  employee        Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([employeeId])
  @@index([userId])
  @@index([requestType])
  @@index([status])
  @@index([requestNumber])
}

enum RequestType {
  EQUIPMENT_REQUEST        // Laptop, phone, accessories
  SOFTWARE_ACCESS          // Tool access
  LETTER_REQUEST           // Employment/Salary certificate
  WORK_FROM_HOME          // WFH request
  SHIFT_CHANGE            // Change shift timings
  TRANSFER_REQUEST        // Department/location transfer
  BUSINESS_CARD           // Business cards
  ID_CARD                 // ID card request
  PARKING_PASS            // Parking pass
  IT_SUPPORT              // IT help
  HR_QUERY                // HR related query
  FACILITY_REQUEST        // Facilities request
  OTHER
}

enum RequestPriority {
  LOW
  NORMAL
  HIGH
  URGENT
}
```

### 9. EmployeeAsset (Asset Management)

```prisma
model EmployeeAsset {
  id              String          @id @default(uuid())
  tenantId        String
  employeeId      String
  userId          String

  // Asset details
  assetType       AssetType
  assetNumber     String          @unique
  assetName       String
  brand           String?
  model           String?
  serialNumber    String?

  // Value
  purchaseDate    DateTime?
  purchaseValue   Float?
  currentValue    Float?

  // Assignment
  assignedDate    DateTime        @default(now())
  returnDate      DateTime?
  status          AssetStatus     @default(ASSIGNED)

  // Condition
  conditionOnAssignment String?    // New, Good, Fair, Poor
  conditionOnReturn     String?

  // Documents
  assignmentDocUrl String?
  returnDocUrl    String?
  photos          Json?           // Array of photo URLs

  // Maintenance
  warrantyExpiryDate DateTime?
  lastServiceDate    DateTime?
  nextServiceDate    DateTime?

  // Additional info
  notes           String?
  accessories     Json?           // Array of accessories

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  employee        Employee        @relation(fields: [employeeId], references: [id], onDelete: Cascade)
  user            User            @relation(fields: [userId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([employeeId])
  @@index([userId])
  @@index([assetNumber])
  @@index([assetType])
  @@index([status])
}

enum AssetType {
  LAPTOP
  DESKTOP
  MONITOR
  KEYBOARD
  MOUSE
  HEADSET
  MOBILE_PHONE
  TABLET
  CHARGER
  DOCKING_STATION
  ACCESS_CARD
  PARKING_CARD
  ID_CARD
  OFFICE_KEY
  LOCKER_KEY
  CALCULATOR
  CHAIR
  DESK
  OTHER
}

enum AssetStatus {
  ASSIGNED
  RETURNED
  DAMAGED
  LOST
  UNDER_REPAIR
  DECOMMISSIONED
}
```

### 10. Recognition (Peer Recognition & Rewards)

```prisma
model Recognition {
  id              String          @id @default(uuid())
  tenantId        String

  // From/To
  fromUserId      String          // Who gave the recognition
  fromEmployeeId  String
  toUserId        String          // Who received it
  toEmployeeId    String

  // Recognition details
  recognitionType RecognitionType
  title           String?
  message         String

  // Points/Badge
  points          Int?            // Gamification points
  badgeId         String?

  // Visibility
  isPublic        Boolean         @default(true)

  // Manager approval
  requiresApproval Boolean        @default(false)
  approvedBy      String?
  approvedAt      DateTime?

  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt

  fromEmployee    Employee        @relation("RecognitionsGiven", fields: [fromEmployeeId], references: [id], onDelete: Cascade)
  toEmployee      Employee        @relation("RecognitionsReceived", fields: [toEmployeeId], references: [id], onDelete: Cascade)
  tenant          Tenant          @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
  @@index([fromEmployeeId])
  @@index([toEmployeeId])
  @@index([recognitionType])
  @@index([createdAt])
}

enum RecognitionType {
  KUDOS
  THANK_YOU
  GREAT_WORK
  TEAM_PLAYER
  INNOVATIVE_IDEA
  CUSTOMER_SERVICE
  LEADERSHIP
  GOING_EXTRA_MILE
  QUALITY_WORK
  HELPING_HAND
}
```

## 🔄 Model Relationships to Add

Add these relationships to existing models:

### User Model
```prisma
model User {
  // ... existing fields
  attendances      Attendance[]
  documents        EmployeeDocument[]
  expenseClaims    ExpenseClaim[]
  trainings        TrainingEnrollment[]
  requests         EmployeeRequest[]
  assets           EmployeeAsset[]
}
```

### Employee Model
```prisma
model Employee {
  // ... existing fields
  attendances      Attendance[]
  documents        EmployeeDocument[]
  payrollSlips     PayrollSlip[]
  expenseClaims    ExpenseClaim[]
  trainings        TrainingEnrollment[]
  requests         EmployeeRequest[]
  assets           EmployeeAsset[]
  recognitionsGiven     Recognition[] @relation("RecognitionsGiven")
  recognitionsReceived  Recognition[] @relation("RecognitionsReceived")
}
```

### Tenant Model
```prisma
model Tenant {
  // ... existing fields
  attendances      Attendance[]
  documents        EmployeeDocument[]
  payrollSlips     PayrollSlip[]
  expenseClaims    ExpenseClaim[]
  trainingCourses  TrainingCourse[]
  trainings        TrainingEnrollment[]
  announcements    TeamAnnouncement[]
  requests         EmployeeRequest[]
  assets           EmployeeAsset[]
  recognitions     Recognition[]
}
```

## 📝 Notes

1. **Existing Models to Use:**
   - `TimeEntry` for timesheets
   - `Task` for task management
   - `LeaveRequest` and `LeaveBalance` for leave management
   - `Goal` for performance goals
   - `PerformanceReview` for reviews
   - `PayrollRecord` (extend with PayrollSlip for detailed slips)

2. **Next Steps:**
   - Apply these schema changes to `schema.prisma`
   - Run `prisma db push` to update database
   - Generate Prisma client
   - Create API routes for each module
   - Build UI components

3. **Migration Strategy:**
   - Add models incrementally
   - Test each module before moving to next
   - Start with: Attendance → Documents → Expenses
