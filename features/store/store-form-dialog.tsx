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
import { SingleSelect } from "@/components/ui/single-select";
import { Switch } from "@/components/ui/switch";
import { createClient } from "@/lib/supabase/client";
import {
  buildTimezoneSelectOptionsByGmt,
  formatTimezoneSelectLabel,
  TIMEZONE_OPTION_IDS,
} from "@/lib/timezone-select-options";
import { storeFormSchema, type StoreFormValues } from "@/lib/zod/schemas";
import type { StoreInsert, StoreListRow, StoreUpdatePayload } from "@/types/store";
import { zodResolver } from "@hookform/resolvers/zod";
import { useInsertMutation } from "@supabase-cache-helpers/postgrest-react-query";
import type { PostgrestError } from "@supabase/postgrest-js";
import type { MutateOptions } from "@tanstack/react-query";
import { useEffect, useId, useMemo, useState } from "react";
import { Controller, useWatch, useForm, type UseFormReturn } from "react-hook-form";

const defaultCreateValues: StoreFormValues = {
  name: "",
  street: "",
  city: "",
  state: "",
  zip_code: "",
  phone: "",
  timezone: "America/Los_Angeles",
  is_active: true,
};

function storeToFormValues(store: StoreListRow): StoreFormValues {
  return {
    name: store.name,
    street: store.street,
    city: store.city,
    state: store.state,
    zip_code: store.zip_code,
    phone: store.phone,
    timezone: store.timezone,
    is_active: store.is_active,
  };
}

function StoreFormFields({
  form,
  formId,
  onSubmit,
}: {
  form: UseFormReturn<StoreFormValues>;
  formId: string;
  onSubmit: (values: StoreFormValues) => void;
}) {
  const { register, control, formState, handleSubmit } = form;
  const timezoneValue = useWatch({ control, name: "timezone" });

  const timezoneSelectOptions = useMemo(() => {
    const at = new Date();
    const base = buildTimezoneSelectOptionsByGmt(at);
    if (!timezoneValue || TIMEZONE_OPTION_IDS.has(timezoneValue)) {
      return base;
    }
    return [
      {
        value: timezoneValue,
        label: `${formatTimezoneSelectLabel(timezoneValue, at)} (current)`,
      },
      ...base,
    ];
  }, [timezoneValue]);

  return (
    <form id={formId} className="grid gap-4" onSubmit={handleSubmit(onSubmit)}>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-name`}>Name</Label>
        <Input id={`${formId}-name`} autoComplete="organization" {...register("name")} />
        {formState.errors.name ? (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.name.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-street`}>Street</Label>
        <Input id={`${formId}-street`} {...register("street")} />
        {formState.errors.street ? (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.street.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-city`}>City</Label>
          <Input id={`${formId}-city`} {...register("city")} />
          {formState.errors.city ? (
            <p className="text-xs text-destructive" role="alert">
              {formState.errors.city.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor={`${formId}-state`}>State</Label>
          <Input id={`${formId}-state`} {...register("state")} />
          {formState.errors.state ? (
            <p className="text-xs text-destructive" role="alert">
              {formState.errors.state.message}
            </p>
          ) : null}
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-zip`}>Zip code</Label>
        <Input id={`${formId}-zip`} {...register("zip_code")} />
        {formState.errors.zip_code ? (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.zip_code.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-phone`}>Phone</Label>
        <Input id={`${formId}-phone`} type="tel" {...register("phone")} />
        {formState.errors.phone ? (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.phone.message}
          </p>
        ) : null}
      </div>
      <div className="grid gap-2">
        <Label htmlFor={`${formId}-timezone`}>Timezone</Label>
        <Controller
          name="timezone"
          control={control}
          render={({ field }) => (
            <SingleSelect
              id={`${formId}-timezone`}
              options={timezoneSelectOptions}
              value={field.value}
              onValueChange={field.onChange}
              placeholder="Select time zone…"
              searchPlaceholder="Search time zones…"
              emptyText="No time zone found."
            />
          )}
        />
        {formState.errors.timezone ? (
          <p className="text-xs text-destructive" role="alert">
            {formState.errors.timezone.message}
          </p>
        ) : null}
      </div>
      <div className="flex items-center justify-between gap-4 rounded-lg border border-border px-3 py-2">
        <div className="grid gap-1">
          <Label htmlFor={`${formId}-active`} className="font-medium">
            Active
          </Label>
          <p className="text-xs text-muted-foreground">
            Inactive stores can be hidden from customer flows.
          </p>
        </div>
        <Controller
          name="is_active"
          control={control}
          render={({ field }) => (
            <Switch
              id={`${formId}-active`}
              checked={field.value}
              onCheckedChange={field.onChange}
            />
          )}
        />
      </div>
    </form>
  );
}

export type StoreFormDialogProps =
  | {
    store: null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onCreated: () => void | Promise<void>;
  }
  | {
    store: StoreListRow;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    onUpdate: (
      payload: StoreUpdatePayload,
      opts?: MutateOptions<unknown, PostgrestError, StoreUpdatePayload>,
    ) => void;
    disabled?: boolean;
  };

export function StoreFormDialog(props: StoreFormDialogProps) {
  const formId = useId();
  const isCreate = props.store === null;
  const editStore = !isCreate ? props.store : null;
  const supabase = useMemo(() => createClient(), []);
  const storesTable = useMemo(() => supabase.from("stores"), [supabase]);
  const insertStore = useInsertMutation(storesTable, ["id"], "*");

  const [serverError, setServerError] = useState<string | null>(null);

  const form = useForm<StoreFormValues>({
    resolver: zodResolver(storeFormSchema),
    defaultValues: isCreate ? defaultCreateValues : storeToFormValues(props.store),
  });

  useEffect(() => {
    if (!props.open) return;
    setServerError(null);
    if (isCreate) {
      form.reset(defaultCreateValues);
    } else if (editStore) {
      form.reset(storeToFormValues(editStore));
    }
  }, [props.open, isCreate, editStore, form]);

  function handleSubmit(values: StoreFormValues) {
    if (isCreate) {
      void submitCreate(values);
      return;
    }

    setServerError(null);
    const payload: StoreUpdatePayload = {
      id: props.store.id,
      name: values.name,
      street: values.street,
      city: values.city,
      state: values.state,
      zip_code: values.zip_code,
      phone: values.phone,
      timezone: values.timezone,
      is_active: values.is_active,
    };
    props.onUpdate(payload, {
      onSuccess: () => props.onOpenChange(false),
      onError: (err) => setServerError(err.message),
    });
  }

  async function submitCreate(values: StoreFormValues) {
    if (props.store !== null) return;
    setServerError(null);
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      setServerError("You must be signed in to create a store.");
      return;
    }

    const row: StoreInsert & { merchant_id: string } = {
      merchant_id: user.id,
      name: values.name.trim(),
      street: values.street.trim(),
      city: values.city.trim(),
      state: values.state.trim(),
      zip_code: values.zip_code.trim(),
      phone: values.phone,
      timezone: values.timezone.trim(),
      is_active: values.is_active,
    };

    insertStore.mutate([row], {
      onSuccess: async () => {
        form.reset(defaultCreateValues);
        props.onOpenChange(false);
        await props.onCreated();
      },
      onError: (err) => setServerError(err.message),
    });
  }

  const editDisabled = !isCreate && (props.disabled ?? false);
  const createBusy = isCreate && insertStore.isPending;
  const footerDisabled = isCreate ? createBusy : editDisabled;

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="max-h-[min(100vh,80rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isCreate ? "New store" : "Edit store"}</DialogTitle>
          <DialogDescription>
            {isCreate ? (
              "Add a store to your merchant account. You can edit details later."
            ) : (
              <>
                Update details for{" "}
                <span className="font-medium text-foreground">
                  {editStore?.name}
                </span>
                .
              </>
            )}
          </DialogDescription>
        </DialogHeader>
        <StoreFormFields form={form} formId={formId} onSubmit={handleSubmit} />
        {serverError ? (
          <p className="text-sm text-destructive" role="alert">
            {serverError}
          </p>
        ) : null}
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => props.onOpenChange(false)}
            disabled={footerDisabled}
          >
            Cancel
          </Button>
          <Button type="submit" form={formId} disabled={footerDisabled}>
            {isCreate ? "Create store" : "Save changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
