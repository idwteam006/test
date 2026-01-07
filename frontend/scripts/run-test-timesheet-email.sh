#!/bin/bash
set -a
source /Volumes/E/zenora/frontend/.env.local
set +a
/usr/local/bin/node --import tsx /Volumes/E/zenora/frontend/scripts/test-timesheet-email.ts
