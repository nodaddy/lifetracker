import { ModuleNavigator } from "@/components/navigation/module-navigator";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <ModuleNavigator />
    </>
  );
}
