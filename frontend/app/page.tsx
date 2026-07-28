import Link from "next/link";

const ROLES = [
  {
    href: "/customer",
    title: "Customer",
    desc: "Browse the menu and place an order.",
  },
  {
    href: "/kitchen",
    title: "Kitchen",
    desc: "Live order queue with status controls.",
  },
  {
    href: "/owner",
    title: "Owner",
    desc: "Live orders and basic daily totals.",
  },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-bold tracking-tight">Restaurant Ordering</h1>
      <p className="mt-2 text-neutral-500">
        Foundation build — customer ordering, kitchen queue, and owner dashboard,
        backed by Neon Postgres. (The conversational agent arrives in a later phase.)
      </p>
      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {ROLES.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            className="rounded-xl border border-neutral-200 p-5 transition hover:border-neutral-400 hover:shadow-sm dark:border-neutral-800 dark:hover:border-neutral-600"
          >
            <div className="text-lg font-semibold">{r.title}</div>
            <div className="mt-1 text-sm text-neutral-500">{r.desc}</div>
          </Link>
        ))}
      </div>
    </main>
  );
}
