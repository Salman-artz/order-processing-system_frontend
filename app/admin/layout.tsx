"use client";

import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user } = useAuthStore();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted) {
      if (!user) {
        router.push("/login");
      }
    }
  }, [mounted, user, router]);

  if (!mounted || !user) return null;

  return (
    <div data-testid="admin-layout" className="flex flex-col h-screen w-full overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 h-[calc(100vh-3.5rem)] overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-background p-5">
          {children}
        </main>
      </div>
    </div>
  );
}
