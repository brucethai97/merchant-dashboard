"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  buildProductSoftDeletePayload,
  type ProductListRow,
  type ProductUpdatePayload,
} from "@/types/product";
import type { PostgrestError } from "@supabase/postgrest-js";
import type { MutateOptions } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function DeleteProductDialog({
  product,
  open,
  onOpenChange,
  onProductsMutated,
  onProductUpdate,
  updateMutationPending,
}: {
  product: ProductListRow | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProductsMutated?: () => void | Promise<void>;
  onProductUpdate: (
    payload: ProductUpdatePayload,
    opts?: MutateOptions<unknown, PostgrestError, ProductUpdatePayload>,
  ) => void;
  updateMutationPending?: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  function confirmDelete() {
    if (!product) return;
    setError(null);
    setPending(true);
    onProductUpdate(buildProductSoftDeletePayload(product), {
      onSuccess: async () => {
        onOpenChange(false);
        await onProductsMutated?.();
        router.refresh();
      },
      onError: (err) => setError(err.message),
      onSettled: () => setPending(false),
    });
  }

  const busy = pending || updateMutationPending;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Remove product?</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{product.name}</span>{" "}
            will be removed from your catalog (soft delete). It will no longer
            appear in lists or counts.
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <p className="text-sm text-destructive" role="alert">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={confirmDelete}
            disabled={busy}
          >
            Remove
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
