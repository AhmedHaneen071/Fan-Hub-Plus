// ---------------------------------------------------------------------------
// Fan Hub Plus — fan submission moderation (client)  (Phase 11)
// Approve / reject the community's pending fan content. Row state refreshes
// from the server after each decision.
// ---------------------------------------------------------------------------

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DeleteConfirmDialog,
  useDeleteFlow,
} from "@/components/admin/manager-parts";
import { deleteSubmission, reviewSubmission } from "@/lib/admin-actions";

export type SubmissionRow = {
  id: string;
  title: string;
  body: string;
  status: "PENDING" | "APPROVED" | "REJECTED";
  createdAt: string;
  author: string;
  authorEmail: string;
  category: string | null;
  type: "CONTENT" | "FEATURED_ARTICLE";
  reviewedBy: string | null;
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
  const del = useDeleteFlow(deleteSubmission);

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

  const deleting = del.target ? rows.find((row) => row.id === del.target) : undefined;

  return (
    <>
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
                  <Badge variant="outline">{row.type === "FEATURED_ARTICLE" ? "Featured article" : "Content article"}</Badge>
                  <span className="text-xs text-muted-foreground">
                    {row.author} ·{" "}
                    {new Date(row.createdAt).toLocaleDateString()}
                  </span>
                </div>
                <h3 className="font-medium">{row.title}</h3>
                <p className="line-clamp-3 text-sm text-muted-foreground">{row.body}</p>
                {row.reviewedBy ? <p className="text-xs text-muted-foreground">Reviewed by {row.reviewedBy}</p> : null}
              </div>

              <div className="flex shrink-0 items-center gap-1">
                {row.status === "PENDING" ? (
                  <>
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
                  </>
                ) : null}
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-destructive hover:text-destructive"
                  onClick={() => del.ask(row.id)}
                  aria-label={`Delete submission ${row.title}`}
                >
                  <Trash2 aria-hidden="true" />
                </Button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {/* A rejected submission is a moderation decision, not a record of the
          fan's contribution. Deleting it is the only way to clear the queue
          permanently, so it needs its own confirmation. */}
      <DeleteConfirmDialog
        open={del.target !== null}
        onOpenChange={(next) => {
          if (!next) del.close();
        }}
        title={deleting ? `Delete "${deleting.title}"?` : "Delete this submission?"}
        description={
          deleting
            ? `The submission from ${deleting.author} (${deleting.authorEmail}) is removed for good.`
            : "This submission is removed for good."
        }
        pending={del.pending}
        onConfirm={del.confirm}
      />
    </>
  );
}
