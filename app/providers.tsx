"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

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

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {/* Global toast container — styled to match the dark mission-control theme */}
      <Toaster
        theme="dark"
        position="bottom-right"
        toastOptions={{
          style: {
            background: "#131B2E",
            border: "1px solid #1F2A44",
            color: "#E8ECF4",
            fontFamily: "var(--font-inter), sans-serif",
            fontSize: "0.875rem",
          },
          classNames: {
            title: "font-semibold",
            description: "text-[#8B95A8] text-xs mt-0.5",
          },
        }}
      />
    </QueryClientProvider>
  );
}
