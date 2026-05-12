"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import {
  getStoresCount,
  getStoresListPage,
  STORE_LIST_PAGE_SIZE,
  STORE_LIST_SELECT,
  type StoreListStatusFilter,
} from "@/queries/store";
import type { StoreListRow } from "@/types/store";
import {
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StoreCard } from "./store-card";
import { StoreFormDialog } from "./store-form-dialog";

const SEARCH_DEBOUNCE_MS = 400;

/** One page = 4 columns × 2 rows at `lg+`; below `lg`, one card per row. Must match `STORE_LIST_PAGE_SIZE`. */
const STORE_GRID_COLS = 4;
const STORE_GRID_ROWS = 2;
const STORE_GRID_PAGE_SLOTS = STORE_GRID_COLS * STORE_GRID_ROWS;
if (STORE_LIST_PAGE_SIZE !== STORE_GRID_PAGE_SLOTS) {
  throw new Error(
    `STORE_LIST_PAGE_SIZE (${String(STORE_LIST_PAGE_SIZE)}) must equal ${String(STORE_GRID_PAGE_SLOTS)} (STORE_GRID_COLS * STORE_GRID_ROWS).`,
  );
}

export function StoreList() {
  const supabase = useMemo(() => createClient(), []);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StoreListStatusFilter>("all");
  const pageSize = STORE_LIST_PAGE_SIZE;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const storesTable = useMemo(() => supabase.from("stores"), [supabase]);

  const listFilters = useMemo(
    () => ({ search: debouncedSearch, status: statusFilter }),
    [debouncedSearch, statusFilter],
  );

  const anyCountQuery = useMemo(() => getStoresCount(supabase), [supabase]);
  const {
    count: anyCountRaw,
    isPending: anyCountPending,
    isError: anyCountError,
    error: anyCountErr,
    refetch: refetchAnyCount,
  } = useQuery(anyCountQuery);

  const anyStoreCount = anyCountRaw ?? 0;

  const storesQuery = useMemo(
    () => getStoresListPage(supabase, page, pageSize, listFilters),
    [supabase, page, pageSize, listFilters],
  );

  const {
    data,
    count: listCountRaw,
    isPending: storesPending,
    isError: storesError,
    error: storesErr,
    refetch: refetchStores,
  } = useQuery(storesQuery);

  const filteredTotal = listCountRaw ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));

  useEffect(() => {
    if (listCountRaw == null) return;
    const tp = Math.max(1, Math.ceil(listCountRaw / pageSize));
    setPage((p) => Math.min(p, tp));
  }, [listCountRaw, pageSize]);

  const currentPage = Math.min(page, totalPages);

  const updateStore = useUpdateMutation(
    storesTable,
    ["id"],
    STORE_LIST_SELECT,
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const refetchListQueries = useCallback(async () => {
    await Promise.all([refetchAnyCount(), refetchStores()]);
  }, [refetchAnyCount, refetchStores]);

  const handleStoreCreated = useCallback(async () => {
    await refetchListQueries();
    setPage(1);
  }, [refetchListQueries]);

  const isPending = anyCountPending || storesPending;
  const isError = anyCountError || storesError;
  const error = anyCountErr ?? storesErr;

  if (isError) {
    return (
      <p
        className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
        role="alert"
      >
        {error?.message ?? "Could not load stores."}
      </p>
    );
  }

  const stores = (data ?? []) as unknown as StoreListRow[];
  const rangeStart =
    filteredTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredTotal);

  if (!isPending && !isError && anyStoreCount === 0) {
    return (
      <>
        <section className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold text-foreground">Your stores</h2>
            <Button
              type="button"
              size="sm"
              className="w-fit shrink-0"
              onClick={() => setCreateOpen(true)}
            >
              New store
            </Button>
          </div>
          <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
            No stores yet. Create your first store to get started.
          </p>
        </section>
        <StoreFormDialog
          store={null}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={handleStoreCreated}
        />
      </>
    );
  }

  return (
    <>
      <section className="w-full rounded-2xl border border-zinc-200 bg-zinc-50/80 p-6 dark:border-zinc-800 dark:bg-zinc-900/40">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">Your stores</h2>
          <Button
            type="button"
            size="sm"
            className="w-fit shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            New store
          </Button>
        </div>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1 space-y-1.5">
            <Label htmlFor="store-list-search" className="text-zinc-600 dark:text-zinc-400">
              Search
            </Label>
            <Input
              id="store-list-search"
              type="search"
              placeholder="Name, address, phone, timezone…"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="w-full space-y-1.5 sm:w-44">
            <Label htmlFor="store-list-status" className="text-zinc-600 dark:text-zinc-400">
              Status
            </Label>
            <select
              id="store-list-status"
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value as StoreListStatusFilter)
              }
              className={cn(
                "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
                "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
                "md:text-sm dark:bg-input/30",
              )}
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-lg border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-5">
          <div className="grid w-full grid-cols-1 gap-3 sm:gap-4 lg:grid-flow-dense lg:grid-cols-4 lg:grid-rows-2 lg:min-h-[20rem]">
            {isPending ? (
              <div className="col-span-1 flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground lg:col-span-4 lg:row-span-2 lg:min-h-0">
                Loading stores…
              </div>
            ) : stores.length === 0 ? (
              <div className="col-span-1 flex min-h-[12rem] items-center justify-center text-center text-sm text-muted-foreground lg:col-span-4 lg:row-span-2 lg:min-h-0">
                No stores match your search or status filter.
              </div>
            ) : (
              stores.map((store) => (
                <StoreCard
                  key={store.id}
                  store={store}
                  disabled={updateStore.isPending}
                  onUpdate={(payload, opts) =>
                    updateStore.mutate(payload, opts)
                  }
                />
              ))
            )}
          </div>
          <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/80 px-0 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/40">
            <p className="text-sm text-muted-foreground">
              {isPending
                ? "Loading stores…"
                : filteredTotal === 0
                  ? "No stores"
                  : `Showing ${rangeStart}–${rangeEnd} of ${filteredTotal}`}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage <= 1 || isPending}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="min-w-[5rem] text-center text-xs text-muted-foreground tabular-nums">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={currentPage >= totalPages || isPending}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </section>
      <StoreFormDialog
        store={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleStoreCreated}
      />
    </>
  );
}
