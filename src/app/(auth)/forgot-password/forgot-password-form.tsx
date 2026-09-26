"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, MailCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requestPasswordReset } from "@/lib/auth-actions";
import {
  forgotPasswordSchema,
  type ForgotPasswordInput,
} from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [pending, setPending] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [devPreview, setDevPreview] = useState<string | undefined>(undefined);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(values: ForgotPasswordInput) {
    setPending(true);
    setFormError(null);

    const formData = new FormData();
    formData.set("email", values.email);

    const result = await requestPasswordReset(formData);

    if (!result.ok) {
      setFormError(result.error);
      setPending(false);
      return;
    }

    // Stay on this screen and show the standard "check your email" message.
    setSuccessMessage(result.message ?? "Check your inbox.");
    setDevPreview(result.preview);
    setPending(false);
  }

  // Already requested: nothing to type, just confirm and link back to login.
  if (successMessage) {
    return (
      <Card className="mx-auto w-full max-w-md">
        <CardHeader>
          <div className="mb-2 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="size-6" aria-hidden="true" />
          </div>
          <CardTitle>Check your email</CardTitle>
          <CardDescription>{successMessage}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {devPreview && (
            <Alert>
              <AlertDescription className="whitespace-pre-wrap break-all font-mono text-xs">
                {devPreview}
              </AlertDescription>
            </Alert>
          )}
          <Button asChild className="h-11 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Reset your password</CardTitle>
        <CardDescription>
          Enter the email on your account and we will send a single-use reset
          link (valid for 30 minutes).
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
              {...register("email")}
            />
            {errors.email && (
              <p id="email-error" className="text-sm text-destructive">
                {errors.email.message}
              </p>
            )}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Sending link…" : "Send reset link"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Remembered it after all?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}