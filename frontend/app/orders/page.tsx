"use client";

import Link from "next/link";
import { Bike, MessageCircle, Receipt } from "lucide-react";
import { formatPrice } from "@repo/shared";
import { useOrderHistory } from "@/lib/useOrderHistory";
import { Badge } from "../_components/ui/Badge";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { EmptyState } from "../_components/ui/EmptyState";
import { HomeLink, PageHeader } from "../_components/ui/PageHeader";

export default function OrderHistoryPage() {
  const { entries, ready } = useOrderHistory();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-10">
      <PageHeader
        title="Your Orders"
        subtitle="Orders placed from this device"
        icon={<Receipt className="h-5 w-5" />}
        actions={
          <>
            <Link href="/customer">
              <Button size="sm">
                <MessageCircle className="h-4 w-4" />
                New order
              </Button>
            </Link>
            <HomeLink />
          </>
        }
      />

      {ready && entries.length === 0 ? (
        <EmptyState
          className="mt-8"
          icon={<Receipt className="h-6 w-6" />}
          title="No orders yet"
          description="Your placed orders will show up here."
        />
      ) : (
        <div className="mt-6 space-y-3">
          {entries.map((e) => (
            <Card key={e.id} className="flex items-center justify-between p-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm">#{e.id.slice(0, 8)}</span>
                  {e.orderType === "delivery" && (
                    <Badge tone="info">
                      <Bike className="h-3 w-3" /> Delivery
                    </Badge>
                  )}
                </div>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {new Date(e.placedAt).toLocaleString()} · {e.itemCount}{" "}
                  {e.itemCount === 1 ? "item" : "items"} ·{" "}
                  {formatPrice(e.totalCents)}
                </p>
              </div>
              {e.orderType === "delivery" && (
                <Link
                  href={`/track/${e.id}`}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Track →
                </Link>
              )}
            </Card>
          ))}
        </div>
      )}
    </main>
  );
}
