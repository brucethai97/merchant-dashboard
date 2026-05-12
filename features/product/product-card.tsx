"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { ProductListRow, ProductUpdatePayload } from "@/types/product";
import { buildProductUpdatePayload } from "@/types/product";
import type { PostgrestError } from "@supabase/postgrest-js";
import type { MutateOptions } from "@tanstack/react-query";
import { PencilIcon, Trash2Icon } from "lucide-react";
import { useState } from "react";

function formatUsd(amount: string | number): string {
  const n = typeof amount === "number" ? amount : Number.parseFloat(String(amount));
  if (Number.isNaN(n)) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(n);
}

export function ProductCard({
  product,
  onEdit,
  onRemove,
  onProductUpdate,
  disabled,
  className,
}: {
  product: ProductListRow;
  onEdit: () => void;
  onRemove: () => void;
  onProductUpdate: (
    payload: ProductUpdatePayload,
    opts?: MutateOptions<unknown, PostgrestError, ProductUpdatePayload>,
  ) => void;
  /** Disables the switch and row actions while the parent list runs a product insert or update mutation. */
  disabled?: boolean;
  className?: string;
}) {
  const desc = product.description?.trim();
  const [toggleError, setToggleError] = useState<string | null>(null);

  function handleAvailabilityChange(next: boolean) {
    if (next === product.is_available) return;
    setToggleError(null);
    onProductUpdate(buildProductUpdatePayload(product, next), {
      onSuccess: () => setToggleError(null),
      onError: (err) => setToggleError(err.message),
    });
  }

  const controlsDisabled = disabled;

  return (
    <Card
      size="sm"
      className={cn(
        "flex h-full min-h-0 flex-col overflow-hidden border-zinc-200 bg-white shadow-none ring-zinc-200/80 dark:border-zinc-800 dark:bg-zinc-950/80 dark:ring-zinc-800",
        className,
      )}
    >
      <CardHeader className="flex shrink-0 flex-col gap-1 overflow-hidden border-b border-zinc-100 pb-3 dark:border-zinc-800">
        <CardTitle className="line-clamp-2 min-h-0 shrink-0 text-balance leading-snug">
          {product.name}
        </CardTitle>
        <CardDescription className="line-clamp-3 min-h-0 flex-1 text-xs leading-relaxed">
          {desc ? desc : "—"}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-2 py-3 text-sm">
        <p className="text-lg font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
          {formatUsd(product.price)}
        </p>
        <span
          className={cn(
            "w-fit rounded-full border px-2 py-0.5 text-[10px] font-medium",
            product.is_available
              ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950/50 dark:text-emerald-100"
              : "border-zinc-200 bg-zinc-100 text-zinc-700 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200",
          )}
        >
          {product.is_available ? "Available" : "Unavailable"}
        </span>
      </CardContent>
      <CardFooter className="mt-auto flex flex-col gap-2 border-t border-zinc-100 pt-4 dark:border-zinc-800">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Switch
              checked={product.is_available}
              onCheckedChange={handleAvailabilityChange}
              disabled={controlsDisabled}
              size="sm"
              aria-label={
                product.is_available
                  ? "Product is available; turn off to mark unavailable"
                  : "Product is unavailable; turn on to mark available"
              }
            />
            <span
              className={cn(
                "text-xs font-medium whitespace-nowrap",
                product.is_available
                  ? "text-emerald-700 dark:text-emerald-400"
                  : "text-muted-foreground",
              )}
            >
              {product.is_available ? "Available" : "Unavailable"}
            </span>
          </div>
          <div className="inline-flex flex-nowrap items-center justify-end gap-0.5">
            <Button
              type="button"
              variant="outline"
              size="icon-sm"
              onClick={onEdit}
              disabled={controlsDisabled}
              aria-label={`Edit ${product.name}`}
            >
              <PencilIcon />
              <span className="sr-only">Edit</span>
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="icon-sm"
              onClick={onRemove}
              disabled={controlsDisabled}
              aria-label={`Remove ${product.name}`}
            >
              <Trash2Icon />
              <span className="sr-only">Remove</span>
            </Button>
          </div>
        </div>
        {toggleError ? (
          <p className="text-xs text-destructive" role="alert">
            {toggleError}
          </p>
        ) : null}
      </CardFooter>
    </Card>
  );
}
