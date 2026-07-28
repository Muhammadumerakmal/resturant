"use client";

import { useParams } from "next/navigation";
import { Bike, Clock, MapPin, PartyPopper } from "lucide-react";
import { useTracking } from "@/lib/useTracking";
import { Card } from "@/app/_components/ui/Card";
import { HomeLink, PageHeader } from "@/app/_components/ui/PageHeader";
import { Skeleton } from "@/app/_components/ui/Skeleton";
import { Timeline } from "@/app/_components/ui/Timeline";
import { DeliveryMap } from "@/app/_components/DeliveryMap";

export default function TrackPage() {
  const params = useParams<{ id: string }>();
  const { state, loaded, error } = useTracking(params.id);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <PageHeader
        title="Track your order"
        subtitle={`#${params.id.slice(0, 8)}`}
        icon={<Bike className="h-5 w-5" />}
        actions={<HomeLink />}
      />

      {!loaded ? (
        <Skeleton className="mt-6 h-80 w-full" />
      ) : error || !state ? (
        <p className="mt-6 text-sm text-muted-foreground">
          {error ?? "We couldn't find that order."}
        </p>
      ) : state.orderType !== "delivery" ? (
        <Card className="mt-6 p-6 text-center text-sm text-muted-foreground">
          This order isn&apos;t a delivery, so there&apos;s nothing to track on
          the map.
        </Card>
      ) : (
        <div className="mt-6 space-y-4">
          {/* ETA / status banner */}
          <Card className="flex items-center justify-between p-5">
            {state.stage === "delivered" ? (
              <div className="flex items-center gap-2 font-semibold text-success">
                <PartyPopper className="h-5 w-5" />
                Delivered — enjoy!
              </div>
            ) : (
              <>
                <div>
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    {state.stage === "out_for_delivery"
                      ? "Arriving in"
                      : "Estimated wait"}
                  </div>
                  <div className="mt-0.5 text-2xl font-bold">
                    {state.etaMinutes !== null
                      ? `${state.etaMinutes} min`
                      : "—"}
                  </div>
                </div>
                <Clock className="h-6 w-6 text-muted-foreground" />
              </>
            )}
          </Card>

          <DeliveryMap courierPos={state.courierPos} progress={state.progress} />

          <Card className="p-5">
            <Timeline
              steps={state.timeline.map((s) => ({
                label: s.label,
                done: s.done,
                active: s.active,
              }))}
            />
          </Card>

          {state.address && (
            <Card className="flex items-start gap-2 p-4 text-sm">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span>
                Delivering to{" "}
                <span className="font-medium">{state.address}</span>
                {state.customerName ? ` · ${state.customerName}` : ""}
              </span>
            </Card>
          )}
        </div>
      )}
    </main>
  );
}
