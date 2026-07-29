"use client";

import { useState } from "react";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { useSettings } from "@/lib/useSettings";
import { Button } from "../_components/ui/Button";
import { Card } from "../_components/ui/Card";
import { Input } from "../_components/ui/Input";
import { PageHeader } from "../_components/ui/PageHeader";
import { Textarea } from "../_components/ui/Select";
import { SiteNav } from "../_components/SiteNav";

export default function ContactPage() {
  const settings = useSettings();
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");

  const email = settings?.email ?? "hello@tavola.example";

  // No contact endpoint yet — compose an email the visitor sends from their own
  // client. (A POST /contact endpoint can replace this later.)
  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const subject = encodeURIComponent(`Message from ${name || "a guest"}`);
    const body = encodeURIComponent(message);
    window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
  }

  const details = [
    { icon: Phone, value: settings?.phone },
    { icon: Mail, value: email },
    { icon: MapPin, value: settings?.address },
    { icon: Clock, value: settings?.hours },
  ].filter((d) => d.value);

  return (
    <>
      <SiteNav />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-12">
        <PageHeader
          title="Contact us"
          subtitle="We'd love to hear from you"
          icon={<Mail className="h-5 w-5" />}
        />

        <div className="mt-8 grid gap-6 sm:grid-cols-2">
          <Card className="space-y-3 p-5">
            {details.map((d, i) => {
              const Icon = d.icon;
              return (
                <div key={i} className="flex items-start gap-3 text-sm">
                  <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  <span>{d.value}</span>
                </div>
              );
            })}
          </Card>

          <Card className="p-5">
            <form onSubmit={onSubmit} className="space-y-3">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
              />
              <Textarea
                rows={4}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Your message"
                required
              />
              <Button type="submit" className="w-full">
                Send message
              </Button>
            </form>
          </Card>
        </div>
      </main>
    </>
  );
}
