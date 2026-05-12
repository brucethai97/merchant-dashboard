import { LogoutButton } from "@/components/logout-button";

export function DashboardTopBar({ email }: { email: string }) {
  return (
    <div className="flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-lg leading-8 text-zinc-600 dark:text-zinc-400">
        Welcome{" "}
        <span className="font-medium text-foreground">{email}</span>
      </p>
      <LogoutButton />
    </div>
  );
}
