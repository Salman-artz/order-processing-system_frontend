"use client";

import { useState } from "react";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/client";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const login = useAuthStore((state) => state.login);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const name = formData.get("name") as string;

    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true" || true) {
        login("mock-jwt-token", { id: "1", email, name, role: "CUSTOMER" });
        router.push("/products");
        return;
      }
      
      const res = await api.post("/auth/register", { email, password, name });
      login(res.data.token, res.data.user);
      router.push("/products");
    } catch (err: any) {
      setError(err.response?.data?.message || "Registration failed");
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-panel p-8 rounded-md border border-border shadow-lg">
        <h1 className="heading text-2xl font-bold text-success mb-2">Create Account</h1>
        <p className="text-text-muted mb-6">Join OPS today</p>

        {error && <div className="mb-4 p-3 bg-failed/10 text-failed rounded-md text-sm">{error}</div>}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">Name</label>
            <input
              type="text"
              name="name"
              required
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-interactive focus:ring-1 focus:ring-interactive"
              placeholder="John Doe"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">Email</label>
            <input
              type="email"
              name="email"
              required
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-interactive focus:ring-1 focus:ring-interactive"
              placeholder="user@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-text-main">Password</label>
            <input
              type="password"
              name="password"
              required
              className="w-full bg-background border border-border rounded-md px-3 py-2 text-text-main focus:outline-none focus:border-interactive focus:ring-1 focus:ring-interactive"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            className="w-full bg-interactive text-white py-2 px-4 rounded-md font-medium hover:bg-interactive/90 transition-colors"
          >
            Register
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" className="text-interactive hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </div>
  );
}
