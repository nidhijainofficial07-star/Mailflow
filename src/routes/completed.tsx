import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  Download,
  RotateCcw,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import {
  useTasks,
  setStatus,
  exportCsv,
} from "@/lib/tasks";

export const Route = createFileRoute("/completed")({
  head: () => ({
    meta: [
      { title: "Completed & dismissed — MailFlow" },
      {
        name: "description",
        content:
          "Your archive of completed and dismissed email actions.",
      },
      {
        property: "og:title",
        content: "Completed & dismissed — MailFlow",
      },
      {
        property: "og:description",
        content:
          "Review, restore, or export your resolved MailFlow actions.",
      },
      { property: "og:type", content: "website" },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: Completed,
});

function Completed() {
  const tasks = useTasks();

  const [tab, setTab] = useState<
    "All" | "Completed" | "Dismissed"
  >("All");

  const items = tasks.filter(
    (task) =>
      task.status === "completed" ||
      task.status === "dismissed",
  );

  const shown = items.filter(
    (item) =>
      tab === "All" ||
      item.status === tab.toLowerCase(),
  );

  const completedCount = items.filter(
    (item) => item.status === "completed",
  ).length;

  const dismissedCount = items.filter(
    (item) => item.status === "dismissed",
  ).length;

  const resolvedCount = items.length;

  return (
    <AppShell
      eyebrow="Action archive"
      title="Completed & dismissed"
      action={
        <button
          onClick={() => exportCsv(items)}
          disabled={items.length === 0}
          className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Download className="h-4 w-4" />
          Export history
        </button>
      }
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-5">
          <p className="text-3xl">
            {completedCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            completed
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-3xl">
            {dismissedCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            dismissed
          </p>
        </div>

        <div className="rounded-xl border bg-card p-5">
          <p className="text-3xl">
            {resolvedCount}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            resolved actions
          </p>
        </div>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex flex-wrap gap-2">
          {(
            ["All", "Completed", "Dismissed"] as const
          ).map((option) => (
            <button
              key={option}
              onClick={() => setTab(option)}
              className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${
                tab === option
                  ? "bg-accent font-semibold"
                  : "text-muted-foreground hover:bg-accent/50"
              }`}
            >
              {option}
            </button>
          ))}
        </div>

        <div className="mt-4 divide-y">
          {shown.length === 0 ? (
            <div className="py-10 text-center">
              <CheckCircle2 className="mx-auto h-8 w-8 text-muted-foreground/50" />

              <p className="mt-3 text-sm font-medium">
                Nothing here yet.
              </p>

              <p className="mt-1 text-xs text-muted-foreground">
                Completed and dismissed actions will
                appear here.
              </p>
            </div>
          ) : (
            shown.map((task) => {
              const isCompleted =
                task.status === "completed";

              return (
                <div
                  key={task.id}
                  className="flex items-center gap-4 py-4"
                >
                  {isCompleted ? (
                    <CheckCircle2 className="h-5 w-5 shrink-0 text-brand" />
                  ) : (
                    <XCircle className="h-5 w-5 shrink-0 text-muted-foreground" />
                  )}

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-muted-foreground line-through">
                      {task.title}
                    </p>

                    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                      {task.from}
                      <span>·</span>
                      <Chip>{task.cat}</Chip>
                    </p>
                  </div>

                  <span className="hidden text-sm capitalize text-muted-foreground sm:inline">
                    {task.status}
                    {task.resolvedOn
                      ? ` · ${task.resolvedOn}`
                      : ""}
                  </span>

                  <button
                    onClick={() =>
                      setStatus(task.id, "active")
                    }
                    className="flex shrink-0 items-center gap-1 rounded-lg border px-3 py-1.5 text-sm font-semibold transition-colors hover:bg-accent"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Restore
                  </button>
                </div>
              );
            })
          )}
        </div>
      </section>
    </AppShell>
  );
}