import { MerchantInfo } from "@/features/merchant/merchant-info";
import { StoreList } from "@/features/store/store-list";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex flex-col flex-1 items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex flex-1 w-full max-w-7xl flex-col items-center justify-between gap-10 py-16 px-16 bg-white dark:bg-black sm:items-stretch">
        <div className="flex w-full flex-col gap-6 text-center sm:text-left">
          <MerchantInfo
            userId={user.id}
            accountEmail={user.email ?? undefined}
            accountPhone={user.phone ?? undefined}
          />
          <StoreList />
        </div>
      </main>
    </div>
  );
}
