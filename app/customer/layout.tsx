"use client";

import Sidebar from "@/components/Sidebar";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
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
      } else if (user.role === "ADMIN") {
        router.push("/admin/dashboard");
      }
    }
  }, [mounted, user, router]);

  if (!mounted || !user || user.role === "ADMIN") return null;

  return (
    <div data-testid="customer-layout" className="flex h-screen w-full overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-background p-6">
        {children}
      </main>
    </div>
  );
}
