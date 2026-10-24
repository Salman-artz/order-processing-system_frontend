"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { Toaster } from "sonner";
import { useThemeStore } from "@/lib/store/useThemeStore";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  const { theme, setTheme } = useThemeStore();

  useEffect(() => {
    const saved = localStorage.getItem('ops_theme') as 'dark' | 'light' | null;
    if (saved) {
      setTheme(saved);
      document.documentElement.classList.toggle('light', saved === 'light');
      document.documentElement.classList.toggle('dark', saved === 'dark');
    } else {
      document.documentElement.classList.add('dark');
    }
  }, [setTheme]);

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      <Toaster
        theme={theme}
        position="bottom-right"
        toastOptions={{
          style: {
            background: "var(--bg-panel)",
            border: "1px solid var(--border-color)",
            color: "var(--text-main)",
            fontFamily: "var(--font-sans), sans-serif",
            fontSize: "0.875rem",
          },
          classNames: {
            title: "font-semibold",
            description: "text-text-muted text-xs mt-0.5",
          },
        }}
      />
    </QueryClientProvider>
  );
}
