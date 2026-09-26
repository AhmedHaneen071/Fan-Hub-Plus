import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { LoginForm } from "./login-form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata = { title: "Sign in" };

type SearchParams = Promise<{ callbackUrl?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  // Already signed in? Straight to the dashboard.
  const session = await auth();
  if (session?.user) redirect("/dashboard");

  const { callbackUrl } = await searchParams;

  return (
    <>
      <LoginForm callbackUrl={callbackUrl} />

      {/* Demo credentials are shown in development only, to make evaluating
          the app fast. They are never shown in a production build. */}
      {process.env.NODE_ENV === "development" && (
        <Card className="mt-6 w-full max-w-md">
          <CardHeader>
            <CardTitle>Demo accounts</CardTitle>
            <CardDescription>
              Pre-seeded logins for evaluating the three roles.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>
                <span className="font-medium text-foreground">Admin</span> — admin@fanhub.dev · Admin@1234
              </li>
              <li>
                <span className="font-medium text-foreground">User</span> — user@fanhub.dev · User@1234
              </li>
              <li>
                <span className="font-medium text-foreground">Visitor</span> — visitor@fanhub.dev · Visitor@1234
              </li>
            </ul>
          </CardContent>
        </Card>
      )}
    </>
  );
}