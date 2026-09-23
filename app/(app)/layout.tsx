import { Navbar } from "@/components/layout/navbar";
import { RouteWarmup } from "@/components/layout/route-warmup";

// Persistent app shell: Navbar lives here (not per-page) so it stays mounted
// across client-side navigations — no remount, no refetch of user/chat unread.
// Pages under this group own their own <main id="main"> wrappers.
export default function AppShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <>
      <Navbar />
      {children}
      <RouteWarmup />
    </>
  );
}