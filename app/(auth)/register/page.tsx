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
/*  Zod schema — full edge-case coverage                                       */
/* -------------------------------------------------------------------------- */
const schema = z.object({
  name: z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(100, "Name is too long")
    .regex(/^[a-zA-Z\s'-]+$/, "Name can only contain letters, spaces, hyphens, and apostrophes"),

  email: z
    .string()
    .min(1, "Email is required")
    .email("Enter a valid email address")
    .max(254, "Email is too long")
    .toLowerCase(),

  password: z
    .string()
    .min(8, "Password must be at least 8 characters")
    .max(128, "Password must be at most 128 characters")
    .regex(/[a-z]/, "Password must include a lowercase letter")
    .regex(/[A-Z]/, "Password must include an uppercase letter")
    .regex(/[0-9]/, "Password must include a number"),

  confirmPassword: z.string().min(1, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  path: ["confirmPassword"],
  message: "Passwords do not match",
});

type FormData = z.infer<typeof schema>;

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */
export default function RegisterPage() {
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
        loginStore("mock-jwt-token", {
          id: "1",
          email: data.email,
          name: data.name,
          role: "customer",
        });
        toast.success("Account created!", { description: `Welcome, ${data.name}` });
        router.push("/customer/products");
        return;
      }

      const res = await api.post("/auth/register", {
        email: data.email,
        password: data.password,
        role: "customer", // Send customer role by default
      });
      toast.success("Account created!", { description: `Please sign in to continue.` });
      router.push("/login");
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Registration failed. Please try again.";
      toast.error("Registration failed", { description: msg });
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-background p-4">
      <div className="w-full max-w-md bg-panel p-8 rounded-md border border-border">
        <h1 className="heading text-2xl font-bold text-success mb-1">Create Account</h1>
        <p className="text-text-muted text-sm mb-6">Join the Order Processing System</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Name */}
          <Field label="Full Name" error={errors.name?.message} testId="error-name">
            <input
              {...register("name")}
              type="text"
              data-testid="input-name"
              autoComplete="name"
              placeholder="Jane Doe"
              className={inputClass(!!errors.name)}
            />
          </Field>

          {/* Email */}
          <Field label="Email" error={errors.email?.message} testId="error-email">
            <input
              {...register("email")}
              type="email"
              data-testid="input-email"
              autoComplete="email"
              placeholder="jane@example.com"
              className={inputClass(!!errors.email)}
            />
          </Field>

          {/* Password */}
          <Field label="Password" error={errors.password?.message} testId="error-password">
            <input
              {...register("password")}
              type="password"
              data-testid="input-password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass(!!errors.password)}
            />
          </Field>

          {/* Confirm Password */}
          <Field label="Confirm Password" error={errors.confirmPassword?.message} testId="error-confirm-password">
            <input
              {...register("confirmPassword")}
              type="password"
              data-testid="input-confirm-password"
              autoComplete="new-password"
              placeholder="••••••••"
              className={inputClass(!!errors.confirmPassword)}
            />
          </Field>

          <button
            type="submit"
            data-testid="btn-submit"
            disabled={isSubmitting}
            className="w-full bg-interactive text-white py-2 px-4 rounded-md font-medium
                       hover:bg-interactive/90 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-interactive focus:ring-offset-2 focus:ring-offset-panel
                       disabled:opacity-50 disabled:cursor-not-allowed mt-2"
          >
            {isSubmitting ? "Creating account…" : "Register"}
          </button>
        </form>

        <p className="mt-5 text-center text-sm text-text-muted">
          Already have an account?{" "}
          <Link href="/login" data-testid="link-login" className="text-interactive hover:underline focus:underline focus:outline-none">
            Sign In
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
  testId,
  children,
}: {
  label: string;
  error?: string;
  testId?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1 text-text-main">{label}</label>
      {children}
      {error && (
        <p role="alert" data-testid={testId} className="mt-1 text-xs text-failed">
          {error}
        </p>
      )}
    </div>
  );
}
