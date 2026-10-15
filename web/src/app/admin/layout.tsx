import type { Metadata } from "next";
import AdminHeader from "./AdminHeader";

export const metadata: Metadata = {
  title: "Nancy Motorcycle Spares Admin",
  description: "Admin dashboard for Nancy Motorcycle Spares"
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div>
      <AdminHeader />
      {children}
    </div>
  );
}
