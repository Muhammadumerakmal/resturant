"use client";

import { useCallback, useEffect, useState } from "react";
import { MessageSquareQuote, Star } from "lucide-react";
import type { Review } from "@repo/shared";
import { apiFetch, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/AuthContext";
import { SiteNav } from "../_components/SiteNav";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { Input } from "../_components/ui/Input";
import { PageHeader } from "../_components/ui/PageHeader";
import { Textarea } from "../_components/ui/Select";
import { Skeleton } from "../_components/ui/Skeleton";

function Stars({
  rating,
  className = "h-4 w-4",
}: {
  rating: number;
  className?: string;
}) {
  return (
    <span className="inline-flex items-center gap-0.5 text-amber-500">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          className={className}
          fill={i < rating ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);

  const load = useCallback(() => {
    apiFetch<Review[]>("/api/v1/reviews")
      .then(setReviews)
      .catch(() => setReviews([]));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const [name, setName] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  // Prefill the name from the signed-in account once it's known.
  useEffect(() => {
    if (user?.name) setName(user.name);
  }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!name.trim()) {
      setError("Please add your name.");
      return;
    }
    setBusy(true);
    try {
      await apiFetch("/api/v1/reviews", {
        method: "POST",
        body: {
          name: name.trim(),
          rating,
          comment: comment.trim() || undefined,
        },
      });
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't submit — try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <PageHeader
          title="Reviews"
          subtitle="What our guests are saying"
          icon={<MessageSquareQuote className="h-5 w-5" />}
        />

        {done ? (
          <Card className="mt-8 p-6 text-center">
            <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-success/10 text-success">
              <Star className="h-6 w-6" />
            </span>
            <h2 className="mt-4 text-lg font-semibold">Thanks for your review!</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              We&apos;ll publish it once our team takes a quick look.
            </p>
          </Card>
        ) : (
          <Card className="mt-8 p-6">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Leave a review
            </h2>
            <form onSubmit={onSubmit} className="mt-4 space-y-3">
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Rating
                </label>
                <div className="flex items-center gap-1">
                  {Array.from({ length: 5 }, (_, i) => i + 1).map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setRating(n)}
                      aria-label={`${n} star${n === 1 ? "" : "s"}`}
                      className="text-amber-500 transition-transform hover:scale-110"
                    >
                      <Star
                        className="h-7 w-7"
                        fill={n <= rating ? "currentColor" : "none"}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Name
                </label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Comment (optional)
                </label>
                <Textarea
                  rows={3}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Tell us about your visit…"
                />
              </div>
              {error && (
                <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              )}
              <Button type="submit" disabled={busy}>
                {busy ? "Submitting…" : "Submit review"}
              </Button>
            </form>
          </Card>
        )}

        <section className="mt-10">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Recent reviews
          </h2>
          {reviews === null ? (
            <div className="mt-3 space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : reviews.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No reviews yet — be the first to leave one!
            </p>
          ) : (
            <div className="mt-3 space-y-3">
              {reviews.map((r) => (
                <Card key={r.id} className="p-4">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{r.name}</span>
                    <Stars rating={r.rating} />
                  </div>
                  {r.comment && (
                    <p className="mt-1.5 text-sm text-muted-foreground">{r.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground">
                    {new Date(r.createdAt).toLocaleDateString([], {
                      dateStyle: "medium",
                    })}
                  </p>
                </Card>
              ))}
            </div>
          )}
        </section>
      </main>
    </>
  );
}
