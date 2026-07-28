import { Compass } from "lucide-react";
import { HomeLink } from "./_components/ui/PageHeader";

export default function NotFound() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Compass className="h-6 w-6" />
      </span>
      <h1 className="mt-4 text-xl font-bold">Page not found</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        The page you&apos;re looking for doesn&apos;t exist.
      </p>
      <div className="mt-6">
        <HomeLink />
      </div>
    </main>
  );
}
