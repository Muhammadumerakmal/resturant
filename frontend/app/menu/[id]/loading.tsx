import { Skeleton } from "@/app/_components/ui/Skeleton";

export default function MenuItemLoading() {
  return (
    <div className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <Skeleton className="h-5 w-32" />
      <Skeleton className="mt-4 h-72 w-full" />
    </div>
  );
}
