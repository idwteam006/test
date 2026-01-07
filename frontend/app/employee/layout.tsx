import EmployeeDashboardLayout from '@/components/layout/EmployeeDashboardLayout';

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <EmployeeDashboardLayout>{children}</EmployeeDashboardLayout>;
}
