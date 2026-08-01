"use client";

import { MapPin, Sparkles, UtensilsCrossed } from "lucide-react";
import { useSettings } from "@/lib/useSettings";
import { Card } from "../_components/ui/Card";
import { PageHeader } from "../_components/ui/PageHeader";
import { SiteNav } from "../_components/SiteNav";

export default function AboutPage() {
  const settings = useSettings();
  const name = settings?.name ?? "Umer Akmal Kitchen";

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <PageHeader
          title={`About ${name}`}
          subtitle={settings?.tagline ?? undefined}
          icon={<UtensilsCrossed className="h-5 w-5" />}
        />

        <div className="mt-8 space-y-6 text-[15px] leading-relaxed text-muted-foreground">
          <p>
            {name} is a modern kitchen serving classic Indian dishes made from
            scratch every day. We pair a warm dining room with a fast, friendly
            ordering experience — chat with our assistant, and your food is on its
            way.
          </p>
          <p>
            Whether you&apos;re dining in, picking up, or ordering delivery, every
            order is prepared fresh and tracked in real time from our kitchen to
            your door.
          </p>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          <Card className="p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-3 font-semibold">Made fresh daily</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Seasonal ingredients, house-ground spices, and recipes we&apos;re proud
              of.
            </p>
          </Card>
          <Card className="p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <MapPin className="h-5 w-5" />
            </span>
            <h2 className="mt-3 font-semibold">Visit us</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {settings?.address ?? "123 Saffron Street, Springfield"}
              <br />
              {settings?.hours ?? "Open daily"}
            </p>
          </Card>
        </div>
      </main>
    </>
  );
}
