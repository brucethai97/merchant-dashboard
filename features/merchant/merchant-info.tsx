"use client";

import { useQuery } from "@supabase-cache-helpers/postgrest-react-query";
import { createClient } from "@/lib/supabase/client";
import { selectMerchantByUserId } from "@/queries/merchant";
import {
  getActiveStoresCount,
  getStoresCount,
} from "@/queries/store";
import {
  getAvailableProductsCount,
  getProductsCount,
} from "@/queries/product";
import type { Merchant } from "@/types/merchant";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  CircleCheckIcon,
  PhoneIcon,
  ShoppingBagIcon,
  StoreIcon,
  TagIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useMemo } from "react";

function initialsFromLabel(label: string): string {
  const t = label.trim();
  if (!t) return "?";
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  if (t.includes("@")) {
    const local = t.split("@")[0] ?? t;
    return (local.slice(0, 2) || "?").toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

function MerchantStatCard({
  label,
  value,
  pending,
  errored,
  icon: Icon,
  accentClass,
}: {
  label: string;
  value: number | null | undefined;
  pending: boolean;
  errored: boolean;
  icon: LucideIcon;
  accentClass: string;
}) {
  const display = errored ? "—" : String(value ?? 0);
  return (
    <div
      className={cn(
        "flex min-h-[7.5rem] w-full min-w-0 flex-col gap-2.5 self-stretch rounded-lg border border-zinc-100 bg-white p-3",
        "shadow-[0_1px_2px_rgba(15,23,42,0.05)] dark:border-zinc-800 dark:bg-zinc-950/80",
        "md:min-h-[8.25rem] lg:h-full lg:min-w-0 lg:flex-1",
      )}
    >
      <div
        className={cn(
          "flex size-9 shrink-0 items-center justify-center rounded-md",
          accentClass,
        )}
      >
        <Icon className="size-[18px]" aria-hidden strokeWidth={1.75} />
      </div>
      {errored ? (
        <p className="text-2xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
          {display}
        </p>
      ) : pending ? (
        <Skeleton className="h-8 w-12 shrink-0" aria-hidden />
      ) : (
        <p className="text-2xl font-bold leading-none tracking-tight text-zinc-900 tabular-nums dark:text-zinc-50">
          {display}
        </p>
      )}
      <p className="mt-auto text-[11px] font-medium leading-snug text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
    </div>
  );
}

function MerchantDashboardSkeleton() {
  return (
    <section
      aria-busy="true"
      aria-label="Loading merchant information"
      className={cn(
        "w-full overflow-hidden",
        "border-y border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:border-x sm:rounded-xl dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none",
      )}
    >
      <header className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6 md:px-8 md:py-4 lg:px-10 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <Skeleton className="h-5 w-48 sm:h-6" />
      </header>

      <div className="flex w-full max-w-none flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-6 md:flex-row md:items-stretch md:gap-0 md:px-8 md:py-7 lg:px-10">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center md:max-w-[min(100%,22rem)] md:shrink-0 md:pr-6 lg:max-w-none lg:flex-1 lg:pr-10">
          <Skeleton className="size-14 shrink-0 rounded-full ring-2 ring-zinc-100 dark:ring-zinc-800" />
          <div className="min-w-0 flex-1 space-y-2.5">
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-4 w-full max-w-xs" />
            <Skeleton className="h-4 w-36" />
          </div>
        </div>

        <div
          className="hidden h-auto w-px shrink-0 self-stretch bg-zinc-200 md:block dark:bg-zinc-700"
          aria-hidden
        />

        <nav className="w-full min-w-0 md:flex md:min-w-0 md:flex-1 md:pl-6 lg:pl-10" aria-hidden>
          <div
            className={cn(
              "grid w-full grid-cols-2 gap-3 sm:gap-3 md:gap-4",
              "lg:flex lg:flex-nowrap lg:items-stretch lg:gap-4",
            )}
          >
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className={cn(
                  "flex min-h-[7.5rem] w-full min-w-0 flex-col gap-2.5 self-stretch rounded-lg border border-zinc-100 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950/80",
                  "md:min-h-[8.25rem] lg:h-full lg:min-w-0 lg:flex-1",
                )}
              >
                <Skeleton className="size-9 shrink-0 rounded-md" />
                <Skeleton className="h-8 w-12" />
                <Skeleton className="mt-auto h-3 w-24" />
              </div>
            ))}
          </div>
        </nav>
      </div>
    </section>
  );
}

export function MerchantInfo({
  userId,
  accountEmail,
  accountPhone,
}: {
  userId: string;
  /** Login email when `merchants` row has no `email` field. */
  accountEmail?: string | null;
  /** Auth user phone when set (e.g. SMS login). */
  accountPhone?: string | null;
}) {
  const supabase = useMemo(() => createClient(), []);
  const merchantQuery = useMemo(
    () => selectMerchantByUserId(supabase, userId),
    [supabase, userId],
  );
  const storesCountQuery = useMemo(() => getStoresCount(supabase), [supabase]);
  const activeStoresCountQuery = useMemo(
    () => getActiveStoresCount(supabase),
    [supabase],
  );
  const productsCountQuery = useMemo(() => getProductsCount(supabase), [supabase]);
  const availableProductsCountQuery = useMemo(
    () => getAvailableProductsCount(supabase),
    [supabase],
  );

  const {
    data: merchantData,
    isPending: merchantPending,
    isError: merchantError,
    error: merchantErrorObject,
  } = useQuery(merchantQuery);

  const {
    count: storesTotal,
    isPending: storesCountPending,
    isError: storesCountError,
  } = useQuery(storesCountQuery);
  const {
    count: activeStoresTotal,
    isPending: activeStoresPending,
    isError: activeStoresError,
  } = useQuery(activeStoresCountQuery);
  const {
    count: productsTotal,
    isPending: productsCountPending,
    isError: productsCountError,
  } = useQuery(productsCountQuery);
  const {
    count: availableProductsTotal,
    isPending: availableProductsPending,
    isError: availableProductsError,
  } = useQuery(availableProductsCountQuery);

  if (merchantPending) {
    return <MerchantDashboardSkeleton />;
  }

  if (merchantError) {
    return (
      <p
        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {merchantErrorObject?.message ?? "Could not load merchant."}
      </p>
    );
  }

  const merchant = merchantData as Merchant | null;
  if (!merchant) {
    return (
      <p className="text-sm text-zinc-600 dark:text-zinc-400">
        No merchant profile found for your account.
      </p>
    );
  }

  const displayName =
    merchant.display_name?.trim() ||
    merchant.email?.trim() ||
    accountEmail?.trim() ||
    "Merchant";
  const avatarInitials = initialsFromLabel(displayName);
  const email = merchant.email?.trim() || accountEmail?.trim() || null;
  const phone = accountPhone?.trim() || null;

  return (
    <section
      className={cn(
        "w-full overflow-hidden",
        "border-y border-zinc-200/90 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] sm:border-x sm:rounded-xl dark:border-zinc-800 dark:bg-zinc-950 dark:shadow-none",
      )}
    >
      <header className="flex flex-col gap-3 border-b border-zinc-100 px-4 py-4 sm:px-6 md:px-8 md:py-4 lg:px-10 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800">
        <h2 className="text-base font-semibold tracking-tight text-zinc-900 sm:text-[1.0625rem] dark:text-zinc-50">
          Merchant Information
        </h2>
      </header>

      <div className="flex w-full max-w-none flex-col gap-6 px-4 py-5 sm:gap-8 sm:px-6 sm:py-6 md:flex-row md:items-stretch md:gap-0 md:px-8 md:py-7 lg:px-10">
        <div className="flex min-w-0 flex-1 flex-col gap-4 sm:flex-row sm:items-center md:max-w-[min(100%,22rem)] md:shrink-0 md:pr-6 lg:max-w-none lg:flex-1 lg:pr-10">
          <Avatar
            size="lg"
            className="size-14 shrink-0 ring-2 ring-sky-100/90 dark:ring-sky-900"
            aria-label={`${displayName} avatar`}
          >
            <AvatarFallback className="bg-sky-100 text-base font-semibold text-sky-700 dark:bg-sky-950 dark:text-sky-200">
              {avatarInitials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-base font-semibold leading-tight text-zinc-900 sm:text-[1.0625rem] dark:text-zinc-50">
              {displayName}
            </p>
            {email ? (
              <p className="text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                {email}
              </p>
            ) : null}
            {phone ? (
              <p className="flex items-center gap-2 text-sm leading-relaxed text-zinc-500 dark:text-zinc-400">
                <PhoneIcon
                  className="size-3.5 shrink-0 text-zinc-400 dark:text-zinc-500"
                  aria-hidden
                  strokeWidth={2}
                />
                <span className="tabular-nums">{phone}</span>
              </p>
            ) : null}
          </div>
        </div>

        <div
          className="hidden h-auto w-px shrink-0 self-stretch bg-zinc-200 md:block dark:bg-zinc-700"
          aria-hidden
        />

        <nav
          aria-label="Store and product totals"
          className="w-full min-w-0 md:flex md:min-w-0 md:flex-1 md:pl-6 lg:pl-10"
        >
          <div
            className={cn(
              "grid w-full grid-cols-2 gap-3 sm:gap-3 md:gap-4",
              "lg:flex lg:flex-nowrap lg:items-stretch lg:gap-4",
            )}
          >
            <MerchantStatCard
              label="Total Stores"
              value={storesTotal}
              pending={storesCountPending}
              errored={storesCountError}
              icon={StoreIcon}
              accentClass="bg-sky-100 text-sky-600 dark:bg-sky-950/80 dark:text-sky-400"
            />
            <MerchantStatCard
              label="Active Stores"
              value={activeStoresTotal}
              pending={activeStoresPending}
              errored={activeStoresError}
              icon={CircleCheckIcon}
              accentClass="bg-emerald-100 text-emerald-600 dark:bg-emerald-950/80 dark:text-emerald-400"
            />
            <MerchantStatCard
              label="Total Products"
              value={productsTotal}
              pending={productsCountPending}
              errored={productsCountError}
              icon={ShoppingBagIcon}
              accentClass="bg-violet-100 text-violet-600 dark:bg-violet-950/80 dark:text-violet-400"
            />
            <MerchantStatCard
              label="Available Products"
              value={availableProductsTotal}
              pending={availableProductsPending}
              errored={availableProductsError}
              icon={TagIcon}
              accentClass="bg-amber-100 text-amber-600 dark:bg-amber-950/80 dark:text-amber-400"
            />
          </div>
        </nav>
      </div>
    </section>
  );
}
