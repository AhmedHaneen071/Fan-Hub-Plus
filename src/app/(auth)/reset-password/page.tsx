import Link from "next/link";
import { ShieldAlert } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata = { title: "Reset password" };

type SearchParams = Promise<{ token?: string }>;

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { token } = await searchParams;

  // Without a token this page is meaningless; show a friendly warning.
  if (!token) {
    return (
      <Alert variant="destructive" role="alert" className="mx-auto max-w-md">
        <ShieldAlert className="shrink-0" aria-hidden="true" />
        <AlertTitle>Missing reset link</AlertTitle>
        <AlertDescription>
          This link is incomplete. Open the link from your reset email, or{" "}
          <Link href="/forgot-password" className="underline underline-offset-3">
            request a new reset link
          </Link>
          .
        </AlertDescription>
      </Alert>
    );
  }

  return <ResetPasswordForm token={token} />;
}