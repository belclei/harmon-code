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
import { LoginPage } from "./routes/LoginPage";

const rootRoute = createRootRoute({
  component: Outlet,
});

// "/" has no screen of its own yet — send it straight to the accounts
// screen, which itself redirects to /login when there's no session.
const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/accounts" });
  },
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginPage,
});

const accountsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/accounts",
  component: AccountsPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  accountsRoute,
]);

export const router = createRouter({ routeTree });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
