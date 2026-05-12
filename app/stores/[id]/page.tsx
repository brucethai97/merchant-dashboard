import { StoreDetailLayout } from "@/features/store/store-detail-layout";
import { StoreProductsList } from "@/features/store/store-products-list";
import { selectStoreById } from "@/queries/store";
import { Store } from "@/types/store";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

export default async function StoreDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();


  const { data: store, error } = await selectStoreById(supabase, id);
  if (error || !store) {
    notFound();
  }

  const s = store as unknown as Store;

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col items-center gap-10 py-16 px-16 bg-white dark:bg-black sm:items-stretch">
        <StoreDetailLayout store={s}>
          <StoreProductsList storeId={id} />
        </StoreDetailLayout>
      </main>
    </div>
  );
}
