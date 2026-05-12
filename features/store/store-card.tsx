"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import type { StoreListRow, StoreUpdatePayload } from "@/types/store";
import { DeactivateStoreConfirmDialog } from "./deactivate-store-confirm-dialog";
import { STORE_CARD_SHELL_CLASS } from "./store-card-shell";
import { StoreFormDialog } from "./store-form-dialog";
import { cn } from "@/lib/utils";
import type { PostgrestError } from "@supabase/postgrest-js";
import type { MutateOptions } from "@tanstack/react-query";
import { EyeIcon, GlobeIcon, MapPinIcon, PencilIcon, PhoneIcon } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ComponentType, MouseEvent, ReactNode } from "react";
import { useState } from "react";

function StoreStatusBadge({
  isActive,
  className,
}: {
  isActive: boolean;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-semibold leading-none whitespace-nowrap sm:text-xs",
        isActive
          ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-900 dark:border-emerald-400/45 dark:bg-emerald-500/20 dark:text-emerald-200"
          : "border-amber-500/50 bg-amber-500/15 text-amber-950 dark:border-amber-400/45 dark:bg-amber-500/15 dark:text-amber-100",
        className,
      )}
    >
      {isActive ? "Active" : "Inactive"}
    </span>
  );
}

function buildStoreUpdatePayload(
  store: StoreListRow,
  is_active: boolean,
): StoreUpdatePayload {
  return {
    id: store.id,
    name: store.name,
    street: store.street,
    city: store.city,
    state: store.state,
    zip_code: store.zip_code,
    phone: store.phone,
    timezone: store.timezone,
    is_active,
  };
}

function isInteractiveDoubleClickTarget(el: HTMLElement): boolean {
  return Boolean(
    el.closest(
      'button, a, input, select, textarea, [role="button"], [role="switch"], [role="menuitem"]',
    ),
  );
}

function storeAddressSummary(store: StoreListRow): string {
  const line2 = [store.city, store.state, store.zip_code].filter(Boolean).join(", ");
  const parts = [store.street?.trim(), line2].filter(Boolean);
  return parts.join(" · ") || "—";
}

function StoreInfoRow({
  icon: Icon,
  children,
}: {
  icon: ComponentType<{ className?: string; "aria-hidden"?: boolean }>;
  children: ReactNode;
}) {
  return (
    <li className="flex gap-2.5">
      <Icon
        aria-hidden
        className="mt-0.5 size-3.5 shrink-0 text-zinc-500 dark:text-zinc-400"
      />
      <span className="min-w-0 flex-1 leading-snug">{children}</span>
    </li>
  );
}

export function StoreCard({
  store,
  disabled,
  onUpdate,
}: {
  store: StoreListRow;
  disabled: boolean;
  onUpdate: (
    payload: StoreUpdatePayload,
    opts?: MutateOptions<unknown, PostgrestError, StoreUpdatePayload>,
  ) => void;
}) {
  const router = useRouter();
  const [editOpen, setEditOpen] = useState(false);
  const [deactivateConfirmOpen, setDeactivateConfirmOpen] = useState(false);
  const [toggleError, setToggleError] = useState<string | null>(null);

  function handleCardDoubleClick(e: MouseEvent<HTMLDivElement>) {
    if (isInteractiveDoubleClickTarget(e.target as HTMLElement)) return;
    router.push(`/stores/${store.id}`);
  }

  function handleActiveChange(next: boolean) {
    if (next === store.is_active) return;
    setToggleError(null);
    if (next === false) {
      setDeactivateConfirmOpen(true);
      return;
    }
    onUpdate(buildStoreUpdatePayload(store, true), {
      onSuccess: () => setToggleError(null),
      onError: (err) => setToggleError(err.message),
    });
  }

  function confirmDeactivate() {
    setToggleError(null);
    onUpdate(buildStoreUpdatePayload(store, false), {
      onSuccess: () => {
        setToggleError(null);
        setDeactivateConfirmOpen(false);
      },
      onError: (err) => {
        setToggleError(err.message);
        setDeactivateConfirmOpen(false);
      },
    });
  }

  return (
    <Card
      size="sm"
      title="Double-click to open store"
      className={STORE_CARD_SHELL_CLASS}
      onDoubleClick={handleCardDoubleClick}
    >
      <CardHeader className="flex shrink-0 flex-col gap-1 overflow-hidden border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <CardTitle className="line-clamp-2 min-h-0 shrink-0 text-balance leading-snug">
          {store.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col py-3 text-xs text-muted-foreground">
        <ul className="list-none space-y-2.5" role="list">
          <StoreInfoRow icon={MapPinIcon}>
            <span className="line-clamp-3" title={storeAddressSummary(store)}>
              {storeAddressSummary(store)}
            </span>
          </StoreInfoRow>
          <StoreInfoRow icon={PhoneIcon}>
            <span className="line-clamp-2" title={store.phone?.trim() || undefined}>
              {store.phone?.trim() || "—"}
            </span>
          </StoreInfoRow>
          <StoreInfoRow icon={GlobeIcon}>
            <span className="line-clamp-2" title={store.timezone}>
              {store.timezone}
            </span>
          </StoreInfoRow>
        </ul>
      </CardContent>
      <CardFooter className="flex flex-1 flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="flex w-full flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex items-center gap-2">
            <StoreStatusBadge isActive={store.is_active} />
            <Switch
              checked={store.is_active}
              onCheckedChange={handleActiveChange}
              disabled={disabled}
              size="sm"
              aria-label={
                store.is_active
                  ? "Store is active; turn off to deactivate"
                  : "Store is inactive; turn on to activate"
              }
            />
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={() => setEditOpen(true)}
              disabled={disabled}
              aria-label={`Edit ${store.name}`}
            >
              <PencilIcon />
            </Button>
            <Button variant="outline" size="icon-sm" asChild>
              <Link
                href={`/stores/${store.id}`}
                aria-label={`View ${store.name}`}
              >
                <EyeIcon />
              </Link>
            </Button>
          </div>
        </div>
        {toggleError ? (
          <p
            className="mt-1 w-full max-w-none text-left text-xs text-destructive"
            role="alert"
          >
            {toggleError}
          </p>
        ) : null}
        <DeactivateStoreConfirmDialog
          storeName={store.name}
          open={deactivateConfirmOpen}
          onOpenChange={setDeactivateConfirmOpen}
          disabled={disabled}
          onConfirm={confirmDeactivate}
        />
        <StoreFormDialog
          store={store}
          open={editOpen}
          onOpenChange={setEditOpen}
          disabled={disabled}
          onUpdate={onUpdate}
        />
      </CardFooter>
    </Card>
  );
}
