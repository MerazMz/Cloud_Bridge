/**
 * Root page — proxy.ts handles redirecting to /login or /dashboard.
 * This is a fallback in case proxy doesn't catch it.
 */

import { redirect } from "next/navigation";

export default function RootPage() {
  redirect("/login");
}
