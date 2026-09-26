// ---------------------------------------------------------------------------
// Fan Hub Plus — fan submission moderation (client)  (Phase 11)
// Approve / reject the community's pending fan content. Row state refreshes
// from the server after each decision.
// ---------------------------------------------------------------------------

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { reviewSubmission } from "@/lib/admin-actions";

export type SubmissionRow = {
  id: string;
  title: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  author: string;
  authorEmail: string;
  category: string | null;
};

const STATUS_BADGE: Record<SubmissionRow["status"], string> = {
  PENDING: "text-amber-600",
  APPROVED: "text-emerald-600",
  REJECTED: "text-destructive",
};

export function SubmissionsManager({ rows }: { rows: SubmissionRow[] }) {
  const router = useRouter();
  const [pending, setPending] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function decide(id: string, status: "APPROVED" | "REJECTED") {
    setPending(id);
    startTransition(async () => {
      const result = await reviewSubmission(id, status);
      setPending(null);
      if (result.ok) {
        toast.success(result.message);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    });
  }

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No fan submissions to review right now.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {rows.map((row) => (
        <li key={row.id} className="rounded-xl border bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={STATUS_BADGE[row.status]}>
                  {row.status.toLowerCase()}
                </Badge>
                {row.category ? (
                  <Badge variant="secondary" className="text-xs">
                    {row.category}
                  </Badge>
                ) : null}
                <span className="text-xs text-muted-foreground">
                  {row.author} ·{" "}
                  {new Date(row.createdAt).toLocaleDateString()}
                </span>
              </div>
              <h3 className="font-medium">{row.title}</h3>
              <p className="line-clamp-3 text-sm text-muted-foreground">{row.body}</p>
            </div>

            {row.status === "PENDING" ? (
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  type="button"
                  size="sm"
                  onClick={() => decide(row.id, "APPROVED")}
                  disabled={isPending && pending === row.id}
                >
                  <Check aria-hidden="true" />
                  Approve
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="destructive"
                  onClick={() => decide(row.id, "REJECTED")}
                  disabled={isPending && pending === row.id}
                >
                  <X aria-hidden="true" />
                  Reject
                </Button>
              </div>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}