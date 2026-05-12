"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { createMerchant } from "@/queries/merchant";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { signupSchema, type SignupValues } from "@/lib/zod/schemas";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = useMemo(
    () => searchParams.get("next") ?? "/",
    [searchParams],
  );

  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const envReady =
    typeof process.env.NEXT_PUBLIC_SUPABASE_URL === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_URL.length > 0 &&
    typeof process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY === "string" &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY.length > 0;

  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      displayName: "",
      email: "",
      password: "",
      confirmPassword: ""
    },
  });

  async function onSubmit(values: SignupValues) {
    form.clearErrors("root");
    setSuccessMessage(null);

    if (!envReady) {
      form.setError("root", {
        type: "server",
        message:
          "Supabase is not configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to .env.local.",
      });
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            display_name: values.displayName,
          },
        },
      });
      if (signUpError) {
        form.setError("root", {
          type: "server",
          message: signUpError.message,
        });
        return;
      }
      if (data.session && data.user) {
        const { error: merchantError } = await createMerchant(supabase, {
          id: data.user.id,
          display_name: values.displayName,
        });
        if (merchantError) {
          form.setError("root", {
            type: "server",
            message: merchantError.message,
          });
          return;
        }
        router.push(nextPath);
        router.refresh();
        return;
      }
      setSuccessMessage(
        "Account created. If email confirmation is enabled in your project, check your inbox to verify your email, then sign in.",
      );
    } catch (err) {
      form.setError("root", {
        type: "server",
        message:
          err instanceof Error ? err.message : "Something went wrong",
      });
    }
  }

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = form;

  return (
    <div className="flex min-h-full flex-1 flex-col items-center justify-center bg-zinc-50 px-4 py-16 dark:bg-black">
      <Card className="w-full max-w-sm border-zinc-200 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <CardHeader>
          <CardTitle className="text-center text-2xl font-semibold tracking-tight">
            Create account
          </CardTitle>
          <CardDescription className="text-center">
            Choose a display name, then add your email and password.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            noValidate
            onSubmit={handleSubmit(onSubmit)}
          >
            <div className="space-y-2">
              <Label htmlFor="signup-display-name">Display name</Label>
              <Input
                id="signup-display-name"
                autoComplete="name"
                type="text"
                aria-invalid={errors.displayName ? true : undefined}
                {...register("displayName")}
              />
              {errors.displayName ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.displayName.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-email">Email</Label>
              <Input
                id="signup-email"
                autoComplete="email"
                type="email"
                aria-invalid={errors.email ? true : undefined}
                {...register("email")}
              />
              {errors.email ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.email.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-password">Password</Label>
              <Input
                id="signup-password"
                autoComplete="new-password"
                type="password"
                aria-invalid={errors.password ? true : undefined}
                {...register("password")}
              />
              {errors.password ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.password.message}
                </p>
              ) : null}
            </div>
            <div className="space-y-2">
              <Label htmlFor="signup-confirm-password">Confirm password</Label>
              <Input
                id="signup-confirm-password"
                autoComplete="new-password"
                type="password"
                aria-invalid={errors.confirmPassword ? true : undefined}
                {...register("confirmPassword")}
              />
              {errors.confirmPassword ? (
                <p className="text-sm text-destructive" role="alert">
                  {errors.confirmPassword.message}
                </p>
              ) : null}
            </div>

            {errors.root ? (
              <p
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive dark:border-destructive/50 dark:bg-destructive/20"
                role="alert"
              >
                {errors.root.message}
              </p>
            ) : null}

            {successMessage ? (
              <p
                className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-900 dark:border-emerald-500/40 dark:bg-emerald-500/15 dark:text-emerald-100"
                role="status"
              >
                {successMessage}{" "}
                <Link
                  className="font-medium underline underline-offset-4"
                  href={`/login?next=${encodeURIComponent(nextPath)}`}
                >
                  Sign in
                </Link>
              </p>
            ) : null}

            <Button
              className="w-full"
              disabled={isSubmitting || !!successMessage}
              size="lg"
              type="submit"
            >
              {isSubmitting ? "Creating account…" : "Sign up"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-zinc-200 pt-6 dark:border-zinc-800 sm:flex-row sm:justify-center">
          <Button asChild variant="link">
            <Link
              href={`/login?next=${encodeURIComponent(nextPath)}`}
            >
              Already have an account? Sign in
            </Link>
          </Button>
          <Button asChild variant="link">
            <Link href="/">Back to home</Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
