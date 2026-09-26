"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, Eye, EyeOff, ShieldAlert } from "lucide-react";
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
import { resetPassword } from "@/lib/auth-actions";
import { resetPasswordSchema } from "@/lib/validations/auth";

// Client form schema: extends the server schema with a confirmation field.
// Only the server schema's fields (token + password) are sent to the action.
const resetFormSchema = resetPasswordSchema
  .extend({
    confirmPassword: z.string().min(1, { message: "Please repeat the password." }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match.",
    path: ["confirmPassword"],
  });

type ResetFormInput = z.infer<typeof resetFormSchema>;

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetFormInput>({
    resolver: zodResolver(resetFormSchema),
    defaultValues: { token, password: "", confirmPassword: "" },
  });

  async function onSubmit(values: ResetFormInput) {
    setPending(true);
    setFormError(null);

    const formData = new FormData();
    formData.set("token", values.token);
    formData.set("password", values.password);

    const result = await resetPassword(formData);

    if (!result.ok) {
      setFormError(result.error);
      setPending(false);
      return;
    }

    router.push(result.redirectTo);
    router.refresh();
  }

  return (
    <Card className="mx-auto w-full max-w-md">
      <CardHeader>
        <CardTitle>Choose a new password</CardTitle>
        <CardDescription>
          Your reset link was accepted. Set a password with at least 8
          characters, one letter and one number.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-5">
          {formError && (
            <Alert variant="destructive" role="alert">
              <ShieldAlert className="shrink-0" aria-hidden="true" />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                className="pr-10"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : undefined}
                {...register("password")}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" aria-hidden="true" />
                ) : (
                  <Eye className="size-4" aria-hidden="true" />
                )}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-sm text-destructive">
                {errors.password.message}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm new password</Label>
            <Input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={
                errors.confirmPassword ? "confirm-error" : undefined
              }
              {...register("confirmPassword")}
            />
            {errors.confirmPassword && (
              <p id="confirm-error" className="text-sm text-destructive">
                {errors.confirmPassword.message}
              </p>
            )}
          </div>

          <Button type="submit" className="h-11 w-full" disabled={pending}>
            {pending && <Loader2 className="animate-spin" aria-hidden="true" />}
            {pending ? "Updating password…" : "Update password"}
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          <Link href="/login" className="font-medium text-primary hover:underline">
            Back to sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}