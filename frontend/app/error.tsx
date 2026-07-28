"use client";

import { TriangleAlert } from "lucide-react";
import { Button } from "./_components/ui/Button";
import { HomeLink } from "./_components/ui/PageHeader";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-100 text-red-600 dark:bg-red-950 dark:text-red-300">
        <TriangleAlert className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-bold">Something went wrong</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        {error.message || "An unexpected error occurred."}
      </p>
      <div className="mt-6 flex items-center gap-3">
        <Button onClick={reset}>Try again</Button>
        <HomeLink />
      </div>
    </main>
  );
}
