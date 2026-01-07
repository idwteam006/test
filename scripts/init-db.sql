-- Initialize Zenora Database with Row-Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable Row-Level Security extension
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Set timezone
SET timezone = 'UTC';

-- This file will be populated with RLS policies after Prisma migrations
-- Example RLS policy (to be added after tables are created):

-- ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE users FORCE ROW LEVEL SECURITY;

-- CREATE POLICY tenant_isolation_policy ON users
--   USING (tenant_id = current_setting('app.current_tenant')::text);

-- Create indexes for performance (after Prisma migrations)
-- Additional indexes beyond Prisma defaults can be added here

COMMENT ON DATABASE zenora IS 'Zenora.ai Employee Management System - Multi-tenant SaaS';
