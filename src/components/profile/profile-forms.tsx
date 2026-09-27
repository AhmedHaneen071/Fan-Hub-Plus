// ---------------------------------------------------------------------------
// Fan Hub Plus — profile forms (client)
// Display-name editing and password change, both React Hook Form + Zod with
// the same rules enforced again by the server actions.
// ---------------------------------------------------------------------------

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { updateDisplayName, changePassword } from "@/lib/profile-actions";

export function AvatarForm({ initialAvatar, name }: { initialAvatar: string | null; name: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [preview, setPreview] = useState(initialAvatar);
  return <form className="flex flex-wrap items-center gap-4" onSubmit={async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const file = new FormData(form).get("avatar");
    if (!(file instanceof File) || !file.size) return toast.error("Choose a PNG, JPEG, or WebP image.");
    setPending(true);
    try {
      const response = await fetch("/api/profile/avatar", { method: "POST", body: new FormData(form) });
      const result = await response.json() as { error?: string; avatarUrl?: string };
      if (!response.ok || !result.avatarUrl) throw new Error(result.error ?? "Upload failed.");
      setPreview(result.avatarUrl);
      toast.success("Avatar updated.");
      form.reset();
      router.refresh();
    } catch (error) { toast.error(error instanceof Error ? error.message : "Upload failed."); }
    finally { setPending(false); }
  }}>
    <Avatar className="size-16"><AvatarImage src={preview ?? undefined} alt="" /><AvatarFallback>{name.slice(0, 1).toUpperCase()}</AvatarFallback></Avatar>
    <div className="min-w-0 flex-1 space-y-2"><label htmlFor="profile-avatar" className="text-sm font-medium">Profile picture</label><Input id="profile-avatar" name="avatar" type="file" accept="image/png,image/jpeg,image/webp" required />
      <p className="text-xs text-muted-foreground">PNG, JPEG, or WebP · max 2 MB</p></div>
    <Button type="submit" disabled={pending}>{pending ? "Uploading…" : "Upload avatar"}</Button>
  </form>;
}

const nameSchema = z.object({
  name: z.string().trim().min(1, "Name is required.").max(80),
});

const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password."),
    newPassword: z
      .string()
      .min(8, "Use at least 8 characters.")
      .regex(/[A-Za-z]/, "Include a letter.")
      .regex(/\d/, "Include a number."),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords don't match.",
    path: ["confirmPassword"],
  });

export function NameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  const form = useForm({ resolver: zodResolver(nameSchema), defaultValues: { name: initialName } });

  async function onSubmit(values: z.infer<typeof nameSchema>) {
    setPending(true);
    const result = await updateDisplayName(values.name);
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Profile updated.");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Display name</FormLabel>
              <FormControl>
                <Input {...field} placeholder="How fans see you" autoComplete="name" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          Save name
        </Button>
      </form>
    </Form>
  );
}

export function PasswordForm() {
  const [pending, setPending] = useState(false);

  const form = useForm({
    resolver: zodResolver(passwordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: z.infer<typeof passwordSchema>) {
    setPending(true);
    const result = await changePassword(values.currentPassword, values.newPassword);
    setPending(false);
    if (result.ok) {
      toast.success(result.message ?? "Password updated.");
      form.reset();
    } else {
      toast.error(result.error);
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="currentPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Current password</FormLabel>
              <FormControl>
                <Input {...field} type="password" autoComplete="current-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="newPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>New password</FormLabel>
              <FormControl>
                <Input
                  {...field}
                  type="password"
                  autoComplete="new-password"
                  placeholder="8+ characters, a letter and a number"
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="confirmPassword"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Confirm new password</FormLabel>
              <FormControl>
                <Input {...field} type="password" autoComplete="new-password" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <Button type="submit" disabled={pending}>
          Update password
        </Button>
      </form>
    </Form>
  );
}
