// apps/web/src/router.tsx
//
// Code-based route tree (not the file-based router plugin) — this is the
// seed of the app shell, just two routes, so the extra route-tree-generator
// build step isn't worth it yet. Revisit once there are enough routes that
// hand-maintaining this file gets annoying.
import {
  Outlet,
  createRootRoute,
  createRoute,
  createRouter,
  redirect,
} from "@tanstack/react-router";
import { AccountsPage } from "./routes/AccountsPage";
import { DashboardPage } from "./routes/DashboardPage";
import { LoginPage } from "./routes/LoginPage";
import { RecurringPage } from "./routes/RecurringPage";
import { TransactionsPage } from "./routes/TransactionsPage";

const rootRoute = createRootRoute({
  component: Outlet,
});

// The real home is the Timeline (§6.12) — it's both the activation surface
// when empty (§6.11) and the history when full; the dashboard is the separate
// "Análise" screen reached from the Timeline's side panel (§6.9). The Timeline
// doesn't exist yet, so "/" lands on the dashboard provisionally; repoint this
// to the Timeline route once it's built (Sprint 10, pulled partly into Sprint 7
// for the activation cards). The target itself redirects to /login when there's
// no session.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/dashboard" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/dashboard",
  component: DashboardPage,
});

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accounts",
  component: AccountsPage,
});

const transactionsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/transactions",
  component: TransactionsPage,
});

const recurringRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/recurring",
  component: RecurringPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  dashboardRoute,
  accountsRoute,
  transactionsRoute,
  recurringRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
