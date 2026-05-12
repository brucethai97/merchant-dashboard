"use client";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DeleteProductDialog } from "@/features/product/delete-product-dialog";
import { ProductCard } from "@/features/product/product-card";
import { ProductFormDialog } from "@/features/product/product-form-dialog";
import { createClient } from "@/lib/supabase/client";
import {
  getProductsCountForStore,
  getProductsListPageForStore,
  PRODUCT_LIST_SELECT,
  STORE_PRODUCT_LIST_PAGE_SIZE,
  type ProductListStatusFilter,
} from "@/queries/product";
import type { ProductListRow } from "@/types/product";
import { cn } from "@/lib/utils";
import {
  useInsertMutation,
  useQuery,
  useUpdateMutation,
} from "@supabase-cache-helpers/postgrest-react-query";
import { useCallback, useEffect, useMemo, useState } from "react";

const SEARCH_DEBOUNCE_MS = 400;

/** One page = 4 columns × 2 rows at `lg+`; below `lg`, one card per row. Must match `STORE_PRODUCT_LIST_PAGE_SIZE`. */
const PRODUCT_GRID_COLS = 4;
const PRODUCT_GRID_ROWS = 2;
const PRODUCT_GRID_PAGE_SLOTS = PRODUCT_GRID_COLS * PRODUCT_GRID_ROWS;
if (STORE_PRODUCT_LIST_PAGE_SIZE !== PRODUCT_GRID_PAGE_SLOTS) {
  throw new Error(
    `STORE_PRODUCT_LIST_PAGE_SIZE (${String(STORE_PRODUCT_LIST_PAGE_SIZE)}) must equal ${String(PRODUCT_GRID_PAGE_SLOTS)} (PRODUCT_GRID_COLS * PRODUCT_GRID_ROWS).`,
  );
}

export function StoreProductsList({ storeId }: { storeId: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState<ProductListStatusFilter>("all");
  const pageSize = STORE_PRODUCT_LIST_PAGE_SIZE;

  useEffect(() => {
    const id = window.setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [searchInput]);

  const productsTable = useMemo(() => supabase.from("products"), [supabase]);

  const listFilters = useMemo(
    () => ({ search: debouncedSearch, status: statusFilter }),
    [debouncedSearch, statusFilter],
  );

  const anyCountQuery = useMemo(
    () => getProductsCountForStore(supabase, storeId),
    [supabase, storeId],
  );
  const {
    count: anyCountRaw,
    isPending: anyCountPending,
    isError: anyCountError,
    error: anyCountErr,
    refetch: refetchAnyCount,
  } = useQuery(anyCountQuery);

  const anyProductCount = anyCountRaw ?? 0;

  const productsQuery = useMemo(
    () =>
      getProductsListPageForStore(
        supabase,
        storeId,
        page,
        pageSize,
        listFilters,
      ),
    [supabase, storeId, page, pageSize, listFilters],
  );

  const {
    data,
    count: listCountRaw,
    isPending: productsPending,
    isError: productsError,
    error: productsErr,
    refetch: refetchProducts,
  } = useQuery(productsQuery);

  const filteredTotal = listCountRaw ?? 0;
  const totalPages = Math.max(1, Math.ceil(filteredTotal / pageSize));

  useEffect(() => {
    if (listCountRaw == null) return;
    const tp = Math.max(1, Math.ceil(listCountRaw / pageSize));
    setPage((p) => Math.min(p, tp));
  }, [listCountRaw, pageSize]);

  const currentPage = Math.min(page, totalPages);

  const updateProduct = useUpdateMutation(
    productsTable,
    ["id"],
    PRODUCT_LIST_SELECT,
  );

  const insertProduct = useInsertMutation(
    productsTable,
    ["id"],
    PRODUCT_LIST_SELECT,
  );

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, statusFilter]);

  const refetchListQueries = useCallback(async () => {
    await Promise.all([refetchAnyCount(), refetchProducts()]);
  }, [refetchAnyCount, refetchProducts]);

  const handleProductCreated = useCallback(async () => {
    await refetchListQueries();
    setPage(1);
  }, [refetchListQueries]);

  const isPending = anyCountPending || productsPending;
  const isError = anyCountError || productsError;
  const error = anyCountErr ?? productsErr;

  const [editProduct, setEditProduct] = useState<ProductListRow | null>(null);
  const [deleteProduct, setDeleteProduct] = useState<ProductListRow | null>(
    null,
  );

  const products = (data ?? []) as unknown as ProductListRow[];
  const rangeStart =
    filteredTotal === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const rangeEnd = Math.min(currentPage * pageSize, filteredTotal);

  if (isError) {
    return (
      <section className="space-y-3">
        <p
          className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-200"
          role="alert"
        >
          {error?.message ?? "Could not load products."}
        </p>
      </section>
    );
  }

  if (!isPending && !isError && anyProductCount === 0) {
    return (
      <section className="space-y-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
          <div className="flex flex-wrap items-baseline justify-between gap-4">
            <h2 className="text-lg font-semibold text-foreground">Products</h2>
            <p className="text-sm text-muted-foreground">No products yet</p>
          </div>
          <Button
            type="button"
            size="sm"
            className="w-fit shrink-0"
            onClick={() => setCreateOpen(true)}
          >
            New product
          </Button>
        </div>
        <Card className="border-dashed border-zinc-200 dark:border-zinc-800">
          <CardContent className="flex flex-col items-center gap-4 py-10 text-center text-sm text-muted-foreground">
            <p>
              This store has no products yet. Create one to get started.
            </p>
            <Button type="button" size="sm" onClick={() => setCreateOpen(true)}>
              New product
            </Button>
          </CardContent>
        </Card>
        <ProductFormDialog
          storeId={storeId}
          product={null}
          open={createOpen}
          onOpenChange={setCreateOpen}
          onProductsMutated={handleProductCreated}
          onProductInsert={insertProduct.mutate}
          insertMutationPending={insertProduct.isPending}
          updateMutationPending={updateProduct.isPending}
        />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <h2 className="text-lg font-semibold text-foreground">Products</h2>
          <p className="text-sm text-muted-foreground">
            {isPending
              ? "Loading products…"
              : filteredTotal === 0
                ? "No products"
                : `${filteredTotal} item${filteredTotal === 1 ? "" : "s"}`}
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          className="w-fit shrink-0"
          onClick={() => setCreateOpen(true)}
        >
          New product
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1 space-y-1.5">
          <Label
            htmlFor="store-product-list-search"
            className="text-zinc-600 dark:text-zinc-400"
          >
            Search
          </Label>
          <Input
            id="store-product-list-search"
            type="search"
            placeholder="Name, description…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="w-full space-y-1.5 sm:w-44">
          <Label
            htmlFor="store-product-list-status"
            className="text-zinc-600 dark:text-zinc-400"
          >
            Availability
          </Label>
          <select
            id="store-product-list-status"
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as ProductListStatusFilter)
            }
            className={cn(
              "h-9 w-full min-w-0 rounded-md border border-input bg-transparent px-2.5 py-1 text-sm shadow-xs transition-[color,box-shadow] outline-none",
              "focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
              "disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50",
              "md:text-sm dark:bg-input/30",
            )}
          >
            <option value="all">All</option>
            <option value="available">Available</option>
            <option value="unavailable">Unavailable</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-50/50 p-4 dark:border-zinc-800 dark:bg-zinc-950/40 sm:p-5">
        <div className="grid w-full auto-rows-fr grid-cols-1 gap-3 sm:gap-4 lg:grid-flow-dense lg:grid-cols-4 lg:grid-rows-2 lg:min-h-[20rem]">
          {isPending ? (
            <div className="col-span-1 flex min-h-[12rem] items-center justify-center text-sm text-muted-foreground lg:col-span-4 lg:row-span-2 lg:min-h-0">
              Loading products…
            </div>
          ) : products.length === 0 ? (
            <div className="col-span-1 flex min-h-[12rem] items-center justify-center text-center text-sm text-muted-foreground lg:col-span-4 lg:row-span-2 lg:min-h-0">
              No products match your search or availability filter.
            </div>
          ) : (
            products.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onEdit={() => setEditProduct(p)}
                onRemove={() => setDeleteProduct(p)}
                disabled={
                  updateProduct.isPending || insertProduct.isPending
                }
                onProductUpdate={(payload, opts) =>
                  updateProduct.mutate(payload, opts)
                }
              />
            ))
          )}
        </div>
        <div className="mt-4 flex flex-col gap-3 border-t border-zinc-200 bg-zinc-50/80 px-0 pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-zinc-800 dark:bg-zinc-900/40">
          <p className="text-sm text-muted-foreground">
            {isPending
              ? "Loading products…"
              : filteredTotal === 0
                ? "No products"
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

      <ProductFormDialog
        storeId={storeId}
        product={null}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onProductsMutated={handleProductCreated}
        onProductInsert={insertProduct.mutate}
        insertMutationPending={insertProduct.isPending}
        updateMutationPending={updateProduct.isPending}
      />
      {editProduct != null ? (
        <ProductFormDialog
          storeId={storeId}
          product={editProduct}
          open
          onOpenChange={(open) => {
            if (!open) setEditProduct(null);
          }}
          onProductsMutated={refetchListQueries}
          onProductUpdate={updateProduct.mutate}
          updateMutationPending={
            updateProduct.isPending || insertProduct.isPending
          }
        />
      ) : null}
      <DeleteProductDialog
        product={deleteProduct}
        open={deleteProduct != null}
        onOpenChange={(open) => {
          if (!open) setDeleteProduct(null);
        }}
        onProductsMutated={refetchListQueries}
        onProductUpdate={updateProduct.mutate}
        updateMutationPending={
          updateProduct.isPending || insertProduct.isPending
        }
      />
    </section>
  );
}
