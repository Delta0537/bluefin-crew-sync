// Lightweight health endpoint for Railway healthcheck.
// Does not touch Supabase or any I/O — guaranteed 200 as long as the server is reachable.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/healthz")({
  loader: () => {
    throw new Response("ok", {
      status: 200,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  },
  component: () => null,
});
