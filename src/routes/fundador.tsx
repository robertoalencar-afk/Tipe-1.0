import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/fundador")({
  beforeLoad: () => {
    throw redirect({ to: "/central", replace: true });
  },
});
