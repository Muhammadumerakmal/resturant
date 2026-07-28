import { Skeleton } from "@/app/_components/ui/Skeleton";

export default function OwnerLoading() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-6 py-8">
      <Skeleton className="h-9 w-48" />
      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" />
        ))}
      </div>
      <Skeleton className="mt-4 h-64 w-full" />
    </div>
  );
}
