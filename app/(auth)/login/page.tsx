"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAuthStore } from "@/lib/store/useAuthStore";
import { useRouter } from "next/navigation";
import Link from "next/link";
import api from "@/lib/api/client";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*  Schema                                                                      */
/* -------------------------------------------------------------------------- */
const schema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .toLowerCase(),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type FormData = z.infer<typeof schema>;

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */
export default function LoginPage() {
  const loginStore = useAuthStore((s) => s.login);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: FormData) => {
    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        const role = data.email.includes("admin") ? "admin" : "customer";
        loginStore("mock-jwt-token", { id: "1", email: data.email, role });
        toast.success("Signed in!", { description: `Welcome back, ${data.email}` });
        router.push(role === "admin" ? "/admin/dashboard" : "/customer/products");
        return;
      }

      const res = await api.post("/auth/login", {
        email: data.email,
        password: data.password,
      });
      
      const token = res.data.token;
      
      // Decode JWT to get user details
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const payload = JSON.parse(atob(base64));
      
      const user = {
        id: payload.user_id,
        email: payload.email,
        role: payload.role === "admin" ? "ADMIN" : "CUSTOMER",
      };

      loginStore(token, user);
      toast.success("Signed in!", { description: `Welcome back` });
      router.push(user.role === "ADMIN" ? "/admin/dashboard" : "/customer/products");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Invalid email or password.";
      toast.error("Sign in failed", { description: msg });
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-panel p-8 rounded-md border border-border">
        <h1 className="heading text-2xl font-bold text-success mb-1">Welcome Back</h1>
        <p className="text-text-muted text-sm mb-6">Sign in to Order Processing System</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          <Field label="Email" error={errors.email?.message}>
            <input
              {...register("email")}
              type="email"
              autoComplete="email"
              placeholder="user@example.com"
              className={inputClass(!!errors.email)}
            />
          </Field>

          <Field label="Password" error={errors.password?.message}>
            <input
              {...register("password")}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              className={inputClass(!!errors.password)}
            />
          </Field>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full bg-interactive text-white py-2 px-4 rounded-md font-medium
                       hover:bg-interactive/90 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-interactive focus:ring-offset-2 focus:ring-offset-panel
                       disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? "Signing in…" : "Sign In"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="text-interactive hover:underline focus:underline focus:outline-none">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                     */
/* -------------------------------------------------------------------------- */
function inputClass(hasError: boolean) {
  return [
    "w-full bg-background border rounded-md px-3 py-2 text-text-main",
    "placeholder:text-text-muted/50",
    "focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-offset-panel transition-colors",
    hasError
      ? "border-failed focus:border-failed focus:ring-failed/40"
      : "border-border focus:border-interactive focus:ring-interactive/40",
  ].join(" ");
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-text-main">{label}</label>
      {children}
      {error && (
        <p role="alert" className="mt-1 text-xs text-failed">
          {error}
        </p>
      )}
    </div>
  );
}
