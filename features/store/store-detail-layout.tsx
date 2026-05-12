import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { Store } from "@/types/store";
import { GlobeIcon, MapPinIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

function initialsFromStoreName(name: string): string {
  const t = name.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

function storeAddressSummary(store: Store): string {
  const line2 = [store.city, store.state, store.zip_code].filter(Boolean).join(", ");
  const parts = [store.street?.trim(), line2].filter(Boolean);
  return parts.join(" · ") || "—";
}

export function StoreDetailLayout({
  store,
  children,
}: {
  store: Store;
  children: ReactNode;
}) {
  const initials = initialsFromStoreName(store.name);
  const address = storeAddressSummary(store);

  return (
    <>
      <section
        className={cn(
          "w-full overflow-hidden",
          "border-y border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:border-x sm:rounded-xl dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none",
        )}
      >
        <header className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 md:px-8 md:py-4 lg:px-10 dark:border-zinc-800">
          <h2 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-[1.0625rem] dark:text-zinc-50">
            Store information
          </h2>
          <Button
            variant="outline"
            size="sm"
            className="h-9 w-fit shrink-0 rounded-lg border-zinc-200 bg-white px-3.5 text-sm font-medium text-zinc-800 shadow-none hover:bg-zinc-50 dark:border-zinc-600 dark:bg-zinc-950 dark:text-zinc-100 dark:hover:bg-zinc-900"
            asChild
          >
            <Link href="/">Back to dashboard</Link>
          </Button>
        </header>

        <div className="flex w-full max-w-none flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-6 md:flex-row md:items-stretch md:gap-0 md:px-8 md:py-7 lg:px-10">
          <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-start md:max-w-[min(100%,26rem)] md:shrink-0 md:pr-6 lg:max-w-none lg:flex-1 lg:pr-10">
            <Avatar
              size="lg"
              className="size-14 shrink-0 ring-2 ring-sky-100/90 dark:ring-sky-900"
              aria-label={`${store.name} avatar`}
            >
              <AvatarFallback className="bg-sky-100 text-base font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-200">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-base font-semibold leading-tight text-zinc-900 sm:text-[1.0625rem] dark:text-zinc-50">
                  {store.name}
                </p>
                <span
                  className={cn(
                    "inline-flex shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-medium",
                    store.is_active
                      ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-100"
                      : "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
                  )}
                >
                  {store.is_active ? "Active" : "Inactive"}
                </span>
              </div>
              <p className="flex gap-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                <MapPinIcon
                  className="mt-0.5 size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  aria-hidden
                  strokeWidth={2}
                />
                <span className="min-w-0">{address}</span>
              </p>
              <p className="flex gap-2 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
                <PhoneIcon
                  className="mt-0.5 size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  aria-hidden
                  strokeWidth={2}
                />
                <span className="min-w-0">{store.phone}</span>
              </p>
              <p className="flex gap-2 text-sm text-zinc-500 dark:text-zinc-400">
                <GlobeIcon
                  className="mt-0.5 size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  aria-hidden
                  strokeWidth={2}
                />
                <span className="min-w-0">{store.timezone}</span>
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mt-8">{children}</div>
    </>
  );
}
