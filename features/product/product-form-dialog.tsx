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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import type {
  ProductInsert,
  ProductListRow,
  ProductUpdatePayload,
} from "@/types/product";
import type { PostgrestError } from "@supabase/postgrest-js";
import type { MutateOptions } from "@tanstack/react-query";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useId, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { productFormSchema, type ProductFormValues } from "@/lib/zod/schemas";

function productToFormValues(product: ProductListRow): ProductFormValues {
  return {
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    is_available: product.is_available,
  };
}

const emptyValues: ProductFormValues = {
  name: "",
  description: "",
  price: "",
  is_available: true,
};

type ProductFormDialogBase = {
  storeId: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a successful create or update so client caches (e.g. React Query) can refetch. */
  onProductsMutated?: () => void | Promise<void>;
  /** True while a shared product update mutation is in flight (e.g. card toggle or this form). */
  updateMutationPending?: boolean;
};

export type ProductFormDialogProps =
  | (ProductFormDialogBase & {
      product: null;
      /** `useInsertMutation` mutate from postgrest-react-query (same table / select as the list query). */
      onProductInsert: (
        rows: ProductInsert[],
        opts?: MutateOptions<unknown, PostgrestError, ProductInsert[]>,
      ) => void;
      insertMutationPending?: boolean;
    })
  | (ProductFormDialogBase & {
      product: ProductListRow;
      /** `useUpdateMutation` mutate from postgrest-react-query (same table/reprimary key as the list query). */
      onProductUpdate: (
        payload: ProductUpdatePayload,
        opts?: MutateOptions<unknown, PostgrestError, ProductUpdatePayload>,
      ) => void;
    });

export function ProductFormDialog(props: ProductFormDialogProps) {
  const {
    storeId,
    product,
    open,
    onOpenChange,
    onProductsMutated,
    updateMutationPending,
  } = props;
  const insertMutationPending =
    product === null
      ? ((props as Extract<ProductFormDialogProps, { product: null }>)
          .insertMutationPending ?? false)
      : false;
  const formId = useId();
  const router = useRouter();
  const isEdit = product != null;
  const [serverError, setServerError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: emptyValues,
  });

  useEffect(() => {
    if (!open) return;
    if (product) {
      form.reset(productToFormValues(product));
    } else {
      form.reset(emptyValues);
    }
  }, [open, product, form]);

  async function onSubmit(values: ProductFormValues) {
    setServerError(null);
    const price = Number.parseFloat(values.price);
    const description =
      values.description?.trim() ? values.description.trim() : null;

    if (product !== null) {
      const { onProductUpdate } = props as Extract<
        ProductFormDialogProps,
        { product: ProductListRow }
      >;
      setSubmitting(true);
      const payload: ProductUpdatePayload = {
        id: product.id,
        store_id: product.store_id,
        name: values.name.trim(),
        description,
        price,
        is_available: values.is_available,
      };
      onProductUpdate(payload, {
        onSuccess: async () => {
          onOpenChange(false);
          await onProductsMutated?.();
          router.refresh();
        },
        onError: (err) => setServerError(err.message),
        onSettled: () => setSubmitting(false),
      });
      return;
    }

    const { onProductInsert } = props as Extract<
      ProductFormDialogProps,
      { product: null }
    >;
    const row: ProductInsert = {
      store_id: storeId,
      name: values.name.trim(),
      description,
      price,
      is_available: values.is_available,
    };
    setSubmitting(true);
    onProductInsert([row], {
      onSuccess: async () => {
        onOpenChange(false);
        await onProductsMutated?.();
        router.refresh();
      },
      onError: (err) => setServerError(err.message),
      onSettled: () => setSubmitting(false),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[min(90vh,36rem)] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit product" : "New product"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update this product’s details."
              : "Add a product to this store."}
          </DialogDescription>
        </DialogHeader>
        <form
          id={formId}
          className="grid gap-4"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-name`}>Name</Label>
            <Input id={`${formId}-name`} {...form.register("name")} />
            {form.formState.errors.name ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.name.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-desc`}>Description</Label>
            <Textarea id={`${formId}-desc`} rows={3} {...form.register("description")} />
            {form.formState.errors.description ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.description.message}
              </p>
            ) : null}
          </div>
          <div className="grid gap-2">
            <Label htmlFor={`${formId}-price`}>Price (USD)</Label>
            <Input
              id={`${formId}-price`}
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              {...form.register("price")}
            />
            {form.formState.errors.price ? (
              <p className="text-xs text-destructive" role="alert">
                {form.formState.errors.price.message}
              </p>
            ) : null}
          </div>
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
            <Label htmlFor={`${formId}-avail`} className="font-medium">
              Available for sale
            </Label>
            <Controller
              name="is_available"
              control={form.control}
              render={({ field }) => (
                <Switch
                  id={`${formId}-avail`}
                  checked={field.value}
                  onCheckedChange={field.onChange}
                />
              )}
            />
          </div>
        </form>
        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={
              submitting ||
              updateMutationPending ||
              insertMutationPending
            }
          >
            Cancel
          </Button>
          <Button
            type="submit"
            form={formId}
            disabled={
              submitting ||
              updateMutationPending ||
              insertMutationPending
            }
          >
            {isEdit ? "Save" : "Create"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
