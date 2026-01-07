#!/bin/bash
files=(
  "app/api/admin/invoices/[id]/route.ts"
  "app/api/admin/invoices/[id]/send/route.ts"
  "app/api/manager/leave/[id]/approve/route.ts"
  "app/api/manager/leave/[id]/reject/route.ts"
  "app/api/employee/leave/[id]/route.ts"
)

for file in "${files[@]}"; do
  if [ -f "$file" ]; then
    # Fix params type
    sed -i '' 's/{ params }: { params: { id: string } }/{ params }: { params: Promise<{ id: string }> }/g' "$file"
    # Fix params usage
    sed -i '' 's/const { id } = params;/const { id } = await params;/g' "$file"
    echo "Fixed: $file"
  fi
done
