import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import {
  AlertTriangle,
  RefreshCw,
} from "lucide-react";

export const Route = createFileRoute("/scan-error")({
  head: () => ({
    meta: [
      { title: "Something went wrong — MailFlow" },
      {
        name: "description",
        content:
          "MailFlow couldn't finish scanning your inbox. Here's how to retry or reconnect Gmail.",
      },
      {
        property: "og:title",
        content: "Scan problem — MailFlow",
      },
      {
        property: "og:description",
        content:
          "Retry the scan or reconnect your Gmail connection.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScanError,
});

function ScanError() {
  return (
    <AppShell
      eyebrow="Inbox scan"
      title="Something went wrong"
    >
      <section className="mx-auto max-w-xl rounded-2xl border bg-card p-10 text-center shadow-sm">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-destructive/10">
          <AlertTriangle className="h-7 w-7 text-destructive" />
        </span>

        <h2 className="mt-5 text-3xl">
          We couldn't finish scanning
        </h2>

        <p className="mt-2 text-muted-foreground">
          MailFlow couldn't complete the inbox scan. Your Gmail
          messages are untouched because MailFlow uses read-only
          access.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/scanning"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Retry scan
          </Link>

          <Link
            to="/connect"
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Reconnect Gmail
          </Link>

          <Link
            to="/today"
            className="rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Back to today
          </Link>
        </div>
      </section>
    </AppShell>
  );
}