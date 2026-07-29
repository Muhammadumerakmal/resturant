"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import {
  REVIEW_STATUSES,
  type Review,
  type ReviewStatus,
} from "@repo/shared";
import { apiFetch } from "@/lib/api";
import { useOwner } from "../OwnerShell";
import { Badge } from "@/app/_components/ui/Badge";
import { EmptyState } from "@/app/_components/ui/EmptyState";
import { PageHeader } from "@/app/_components/ui/PageHeader";
import { Select } from "@/app/_components/ui/Select";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Table, TD, TH, THead, TR } from "@/app/_components/ui/Table";
import { Tabs } from "@/app/_components/ui/Tabs";
import { useToast } from "@/app/_components/ui/Toast";

type Filter = "all" | ReviewStatus;

const FILTERS: { value: Filter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "pending", label: "Pending" },
  { value: "published", label: "Published" },
  { value: "hidden", label: "Hidden" },
];

const STATUS_TONE: Record<ReviewStatus, "warning" | "success" | "neutral"> = {
  pending: "warning",
  published: "success",
  hidden: "neutral",
};

function Stars({ rating }: { rating: number }) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className="h-3.5 w-3.5"
          fill={i < rating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function OwnerReviewsPage() {
  const { staffKey } = useOwner();
  const toast = useToast();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [filter, setFilter] = useState<Filter>("all");

  const load = useCallback(() => {
    const qs = filter === "all" ? "" : `?status=${filter}`;
    apiFetch<Review[]>(`/api/v1/reviews/moderation${qs}`, { staffKey })
      .then(setReviews)
      .catch(() => setReviews([]));
  }, [filter, staffKey]);

  useEffect(() => {
    setReviews(null);
    load();
  }, [load]);

  async function setStatus(id: string, status: ReviewStatus) {
    const prev = reviews;
    setReviews((rs) => rs?.map((r) => (r.id === id ? { ...r, status } : r)) ?? rs);
    try {
      await apiFetch(`/api/v1/reviews/${id}/status`, {
        method: "PATCH",
        staffKey,
        body: { status },
      });
      toast(`Marked ${status}`, "success");
      if (filter !== "all") load();
    } catch (e) {
      setReviews(prev);
      toast(e instanceof Error ? e.message : "Update failed", "warning");
    }
  }

  return (
    <main className="flex-1">
      <PageHeader
        className="mt-6"
        title="Reviews"
        subtitle="Moderate customer feedback — publish or hide"
        icon={<Star className="h-5 w-5" />}
        actions={
          <Tabs
            options={FILTERS}
            value={filter}
            onChange={(v) => setFilter(v as Filter)}
          />
        }
      />

      <div className="mt-6">
        {reviews === null ? (
          <Skeleton className="h-64 w-full" />
        ) : reviews.length === 0 ? (
          <EmptyState
            icon={<Star className="h-6 w-6" />}
            title="No reviews"
            description={
              filter === "all"
                ? "Customer reviews from the website appear here."
                : `No ${filter} reviews right now.`
            }
          />
        ) : (
          <Table>
            <THead>
              <tr>
                <TH>When</TH>
                <TH>Rating</TH>
                <TH>Review</TH>
                <TH>Status</TH>
              </tr>
            </THead>
            <tbody>
              {reviews.map((r) => (
                <TR key={r.id}>
                  <TD className="whitespace-nowrap text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString([], {
                      dateStyle: "medium",
                    })}
                  </TD>
                  <TD>
                    <Stars rating={r.rating} />
                  </TD>
                  <TD className="max-w-[24rem]">
                    <div className="font-medium">{r.name}</div>
                    {r.comment && (
                      <p className="text-sm text-muted-foreground">{r.comment}</p>
                    )}
                  </TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      <Badge tone={STATUS_TONE[r.status as ReviewStatus]}>
                        {r.status}
                      </Badge>
                      <Select
                        className="h-8 w-32"
                        value={r.status}
                        onChange={(e) =>
                          setStatus(r.id, e.target.value as ReviewStatus)
                        }
                        aria-label="Change status"
                      >
                        {REVIEW_STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </Select>
                    </div>
                  </TD>
                </TR>
              ))}
            </tbody>
          </Table>
        )}
      </div>
    </main>
  );
}
