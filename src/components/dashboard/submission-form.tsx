"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { submitFanContent } from "@/lib/engagement-actions";

type CategoryOption = { id: string; name: string };

export function SubmissionForm({ categories }: { categories: CategoryOption[] }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [type, setType] = useState<"CONTENT" | "FEATURED_ARTICLE">("CONTENT");

  async function submit(formData: FormData) {
    setPending(true);
    const result = await submitFanContent({
      title: formData.get("title"),
      body: formData.get("body"),
      categoryId: formData.get("categoryId"),
      type,
    });
    setPending(false);
    if (!result.ok) {
      toast.error(result.error);
      return;
    }
    toast.success(result.message);
    router.refresh();
    (document.getElementById("fan-submission-form") as HTMLFormElement | null)?.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Share something with the fandom</CardTitle>
        <CardDescription>Submissions are reviewed before they appear publicly. Choose a featured article for long-form HTML-safe storytelling, or a catalogue post for a short description.</CardDescription>
      </CardHeader>
      <CardContent>
        <form id="fan-submission-form" action={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="submission-title">Title</Label>
            <Input id="submission-title" name="title" minLength={4} maxLength={120} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="submission-category">Fandom</Label>
            <select id="submission-category" name="categoryId" required defaultValue="" className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="" disabled>Select a fandom</option>
              {categories.map((category) => <option key={category.id} value={category.id}>{category.name.replaceAll("_", " ")}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="submission-type">Submission format</Label>
            <select id="submission-type" value={type} onChange={(event) => setType(event.target.value as typeof type)} className="h-10 w-full rounded-lg border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <option value="CONTENT">Catalogue post (short description)</option>
              <option value="FEATURED_ARTICLE">Featured article</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="submission-body">Your submission</Label>
            <Textarea id="submission-body" name="body" required minLength={20} maxLength={type === "CONTENT" ? 600 : 20000} rows={type === "CONTENT" ? 6 : 12} />
            <p className="text-xs text-muted-foreground">{type === "CONTENT" ? "20–600 characters" : "20–20,000 characters; HTML is sanitized when displayed"}</p>
          </div>
          <Button type="submit" disabled={pending}>{pending ? "Sending…" : "Send for review"}</Button>
        </form>
      </CardContent>
    </Card>
  );
}
