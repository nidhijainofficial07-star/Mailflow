import {
  createFileRoute,
  Link,
  useNavigate,
} from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  Sparkles,
  Mail,
  ExternalLink,
  MoreHorizontal,
  CalendarDays,
  FileText,
  Download,
  Flag,
  Tag,
  AlarmClock,
  BellPlus,
  Search,
} from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { useTasks, setStatus } from "@/lib/tasks";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/task")({
  validateSearch: (
    search: Record<string, unknown>,
) => ({
  id:
    typeof search["id"] === "string"
      ? search["id"]
      : "",
}),

  head: () => ({
    meta: [
      {
        title: "Task detail — MailFlow",
      },
      {
        name: "description",
        content:
          "Task detail with AI analysis, extracted action, and the original email context.",
      },
      {
        property: "og:title",
        content:
          "Task detail — MailFlow",
      },
      {
        property: "og:description",
        content:
          "See the action, deadline, and original email side by side.",
      },
      {
        property: "og:type",
        content: "website",
      },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),

  component: TaskPage,
});

function TaskPage() {
  const { id } = Route.useSearch();
  const navigate = useNavigate();
  const all = useTasks();

  const [feedback, setFeedback] =
    useState<string | null>(null);

  const [reminderAdded, setReminderAdded] =
    useState(false);

  const [reminderLoading, setReminderLoading] =
    useState(false);

  const [webResults, setWebResults] =
    useState<
      {
        title: string;
        link: string;
        snippet: string;
        source: string;
      }[]
    >([]);

  const [webSearchLoading, setWebSearchLoading] =
    useState(false);

  const [webSearchDone, setWebSearchDone] =
    useState(false);

  const task = all.find(
    (item) => item.id === id,
  );

  if (!id) {
    return (
      <AppShell
        eyebrow="Relevant inbox"
        title="Task not found"
      >
        <section className="rounded-2xl border bg-card p-8 text-center">
          <p className="font-semibold">
            No task was selected.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            Open a task from your inbox or
            today's plan.
          </p>

          <Link
            to="/today"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to today
          </Link>
        </section>
      </AppShell>
    );
  }

  if (!task) {
    return (
      <AppShell
        eyebrow="Relevant inbox"
        title="Task not found"
      >
        <section className="rounded-2xl border bg-card p-8 text-center">
          <p className="font-semibold">
            This task could not be found.
          </p>

          <p className="mt-1 text-sm text-muted-foreground">
            It may have been completed,
            dismissed, or removed.
          </p>

          <Link
            to="/today"
            className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
          >
            Back to today
          </Link>
        </section>
      </AppShell>
    );
  }
  const selectedTask = task;

  const activeTasks = all.filter(
    (item) =>
      item.status === "active" ||
      item.id === task.id,
  );

  const index = activeTasks.findIndex(
    (item) => item.id === task.id,
  );

  const previous =
    activeTasks[
      (index - 1 + activeTasks.length) %
        activeTasks.length
    ] ?? task;

  const next =
    activeTasks[
      (index + 1) % activeTasks.length
    ] ?? task;

  const done =
    task.status === "completed";

  async function toggleComplete() {
  setStatus(
    selectedTask.id,
    done
      ? "active"
      : "completed",
  );

  toast.success(
    done
      ? "Task restored"
      : "Marked complete",
  );
}

  async function dismissTask() {
  setStatus(
    selectedTask.id,
    "dismissed",
  );

  toast("Task dismissed");

  await navigate({
    to: "/today",
  });
}

  async function addReminder() {
    if (
      reminderLoading ||
      reminderAdded
    ) {
      return;
    }

    if (!selectedTask.deadlineRaw) {
      toast.error(
        "This task does not have a deadline for a reminder.",
      );
      return;
    }

    try {
      setReminderLoading(true);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        await navigate({
          to: "/login",
        });
        return;
      }

      const deadline =
        new Date(
          selectedTask.deadlineRaw,
        );

      if (
        Number.isNaN(
          deadline.getTime(),
        )
      ) {
        toast.error(
          "This task has an invalid deadline.",
        );
        return;
      }

      // Default reminder: one day before.
      const remindAt =
        new Date(
          deadline.getTime() -
            24 *
              60 *
              60 *
              1000,
        );

      // If one day before has already passed,
      // use one hour before the deadline.
      if (
        remindAt.getTime() <=
        Date.now()
      ) {
        remindAt.setTime(
          deadline.getTime() -
            60 *
              60 *
              1000,
        );
      }

      // Do not create a reminder after the deadline.
      if (
        remindAt.getTime() >=
        deadline.getTime()
      ) {
        toast.error(
          "There is not enough time left to schedule this reminder.",
        );
        return;
      }

      const { error } =
        await supabase
          .from("reminders")
          .insert({
            user_id: user.id,
            task_id: selectedTask.id,
            remind_at:
              remindAt.toISOString(),
            completed: false,
          });

      if (error) {
        console.error(
          "Add reminder error:",
          error,
        );

        toast.error(
          "Unable to add the reminder. Please try again.",
        );

        return;
      }

      setReminderAdded(true);

      toast.success(
        "Reminder added",
      );
    } catch (error) {
      console.error(
        "Reminder creation error:",
        error,
      );

      toast.error(
        "Unable to add the reminder.",
      );
    } finally {
      setReminderLoading(false);
    }
  }

  async function searchRelatedInformation() {
    if (webSearchLoading) {
      return;
    }

    try {
      setWebSearchLoading(true);

      const searchQuery = [
        selectedTask.title,
        selectedTask.org,
        selectedTask.cat,
      ]
        .filter(Boolean)
        .join(" ");

      const { data, error } =
        await supabase.functions.invoke(
          "serp-search",
          {
            body: {
              query: searchQuery,
            },
          },
        );

      if (error) {
        console.error(
          "SerpApi search error:",
          error,
        );

        toast.error(
          "Unable to search for related information.",
        );

        return;
      }

      if (data?.error) {
        console.error(
          "SerpApi response error:",
          data.error,
        );

        toast.error(
          "Web search failed. Please try again.",
        );

        return;
      }

      setWebResults(
        data?.results || [],
      );

      setWebSearchDone(true);

      if (
        !data?.results?.length
      ) {
        toast("No related results found.");
      }
    } catch (error) {
      console.error(
        "Web search error:",
        error,
      );

      toast.error(
        "Unable to search for related information.",
      );
    } finally {
      setWebSearchLoading(false);
    }
  }

  return (
    <AppShell
      eyebrow="Relevant inbox"
      title="Task detail"
      action={
        <>
          <Link
            to="/task"
            search={{
              id: previous.id,
            }}
            className="flex items-center gap-1 rounded-xl border bg-background px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Link>

          <Link
            to="/task"
            search={{
              id: next.id,
            }}
            className="flex items-center gap-1 rounded-xl border bg-background px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        </>
      }
    >
      <p className="text-xs text-muted-foreground">
        <Link
          to="/inbox"
          className="text-brand hover:underline"
        >
          Relevant inbox
        </Link>{" "}
        › {task.title}
      </p>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap gap-2">
            <Chip strong>
              {task.status ===
              "dismissed"
                ? "Dismissed"
                : done
                  ? "Completed"
                  : "Action required"}
            </Chip>

            <Chip>
              {task.cat}
            </Chip>

            <Chip strong>
              {task.pri} priority
            </Chip>
          </div>

          <h2
            className={`mt-3 text-3xl ${
              done
                ? "text-muted-foreground line-through"
                : ""
            }`}
          >
            {task.title}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            From {task.from} · Received{" "}
            {task.received}
          </p>
        </div>

        <div className="fixed inset-x-0 bottom-[60px] z-20 flex gap-2 border-t bg-background p-3 lg:hidden">
          <button
            onClick={dismissTask}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border py-3 text-sm font-semibold"
          >
            <X className="h-4 w-4" />
            Dismiss
          </button>

          <button
            onClick={toggleComplete}
            className="flex flex-[2] items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground"
          >
            <Check className="h-4 w-4" />

            {done
              ? "Undo complete"
              : "Mark complete"}
          </button>
        </div>

        <div className="flex flex-col items-start gap-2 lg:items-end">
          <button
            onClick={dismissTask}
            className="hidden items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent lg:flex"
          >
            <X className="h-4 w-4" />
            Dismiss
          </button>

          <button
            onClick={toggleComplete}
            className="hidden items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 lg:flex"
          >
            <Check className="h-4 w-4" />

            {done
              ? "Completed — undo"
              : "Mark complete"}
          </button>

          <div className="flex gap-2 text-xs">
            {[
              "This was useful",
              "Not relevant",
            ].map((option) => (
              <button
                key={option}
                onClick={() => {
                  setFeedback(
                    option,
                  );

                  toast.success(
                    "Thanks — feedback saved",
                  );
                }}
                className={`rounded-full border px-3 py-1 font-semibold ${
                  feedback === option
                    ? "bg-accent"
                    : "bg-background"
                }`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[2fr_3fr]">
        <div className="space-y-4">
          {/* AI ANALYSIS */}
          <section className="rounded-2xl bg-ink p-5 text-ink-foreground">
            <div className="flex justify-between gap-3">
              <p className="flex items-center gap-2 text-xs font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                AI ANALYSIS
              </p>

              <span className="rounded-full bg-background px-2 py-0.5 text-xs font-semibold text-foreground">
                AI extracted
              </span>
            </div>

            <p className="mt-3">
              {task.analysis ||
                "MailFlow identified this email as relevant and extracted an actionable task."}
            </p>

            {task.why && (
              <div className="mt-4 border-t border-ink-soft pt-3">
                <p className="text-[11px] font-semibold text-ink-muted">
                  WHY IT MATTERS NOW
                </p>

                <p className="mt-1 text-xs text-ink-muted">
                  {task.why}
                </p>
              </div>
            )}
          </section>

                    {/* RELATED WEB INFORMATION */}
          <section className="rounded-2xl border bg-card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="flex items-center gap-2 font-semibold">
                  <Search className="h-4 w-4" />
                  Related web information
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Find useful information related to this task.
                </p>
              </div>

              <Chip>
                Powered by SerpApi
              </Chip>
            </div>

            <button
              onClick={searchRelatedInformation}
              disabled={webSearchLoading}
              className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Search className="h-4 w-4" />

              {webSearchLoading
                ? "Searching..."
                : webSearchDone
                  ? "Search again"
                  : "Search related information"}
            </button>

            {webResults.length > 0 && (
              <div className="mt-4 space-y-3">
                {webResults.map(
                  (result, index) => (
                    <a
                      key={`${result.link}-${index}`}
                      href={result.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block rounded-xl border p-3 transition-colors hover:bg-accent"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="line-clamp-2 text-sm font-semibold">
                            {result.title}
                          </p>

                          {result.source && (
                            <p className="mt-1 text-[11px] text-muted-foreground">
                              {result.source}
                            </p>
                          )}

                          {result.snippet && (
                            <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                              {result.snippet}
                            </p>
                          )}
                        </div>

                        <ExternalLink className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                      </div>
                    </a>
                  ),
                )}
              </div>
            )}

            {webSearchDone &&
              webResults.length === 0 && (
                <p className="mt-4 rounded-xl bg-surface p-3 text-xs text-muted-foreground">
                  No related web results were found.
                </p>
              )}
          </section>

          {/* EXTRACTED ACTION */}
          <section className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">
              Extracted action
            </h3>

            <p className="text-xs text-muted-foreground">
              Review before completing
            </p>

            <label className="mt-3 flex items-center gap-3 rounded-xl bg-surface p-3 text-sm">
              <input
                type="checkbox"
                checked={done}
                onChange={
                  toggleComplete
                }
              />

              <span
                className={
                  done
                    ? "text-muted-foreground line-through"
                    : ""
                }
              >
                {task.action}
              </span>
            </label>

            {(
              [
                [
                  CalendarDays,
                  "Deadline",
                  task.deadline,
                ],
                [
                  Flag,
                  "Priority",
                  task.pri,
                ],
                [
                  Tag,
                  "Category",
                  `${task.cat}${
                    task.org
                      ? ` · ${task.org}`
                      : ""
                  }`,
                ],
              ] as const
            ).map(
              ([
                Icon,
                label,
                value,
              ]) => (
                <div
                  key={label}
                  className="mt-2 flex items-center gap-3 rounded-xl bg-surface p-3"
                >
                  <Icon className="h-4 w-4" />

                  <div>
                    <p className="text-[11px] uppercase text-muted-foreground">
                      {label}
                    </p>

                    <p className="text-sm">
                      {value ||
                        "Not specified"}
                    </p>
                  </div>
                </div>
              ),
            )}
          </section>

          {/* REMINDER */}
          {task.deadlineRaw && (
            <section className="rounded-2xl border bg-card p-5">
              <div className="flex justify-between gap-3">
                <p className="flex items-center gap-2 font-semibold">
                  <AlarmClock className="h-4 w-4" />
                  Suggested reminder
                </p>

                <Chip>
                  Recommended
                </Chip>
              </div>

              <p className="mt-1 text-xs text-muted-foreground">
                Get reminded before this task's
                deadline.
              </p>

              <button
                onClick={addReminder}
                disabled={
                  reminderLoading ||
                  reminderAdded
                }
                className="mt-3 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:cursor-not-allowed disabled:opacity-60"
              >
                {reminderLoading ? (
                  "Adding reminder..."
                ) : (
                  <>
                    <BellPlus className="h-4 w-4" />

                    {reminderAdded
                      ? "Reminder added"
                      : "Add reminder"}
                  </>
                )}
              </button>
            </section>
          )}
        </div>

        {/* ORIGINAL EMAIL */}
        <section className="flex flex-col rounded-2xl border bg-card">
          <div className="flex justify-between border-b px-5 py-3 text-xs">
            <span className="flex items-center gap-2 font-semibold">
              <Mail className="h-4 w-4" />
              Original email context
            </span>

            <span className="flex items-center gap-1 text-muted-foreground">
              Open in Gmail
              <ExternalLink className="h-3.5 w-3.5" />
            </span>
          </div>

          <div className="p-5">
            <h3 className="text-lg font-semibold">
              {task.subject}
            </h3>

            <div className="mt-3 flex items-center gap-3">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-surface text-xs">
                {task.initials}
              </span>

              <div className="flex-1">
                <p className="text-sm font-semibold">
                  {task.from}
                </p>

                <p className="text-xs text-muted-foreground">
                  {task.email} · to me
                </p>
              </div>

              <span className="text-xs text-muted-foreground">
                {task.received}
              </span>

              <MoreHorizontal className="h-4 w-4" />
            </div>

            <div className="mt-5 space-y-4 border-t pt-5 text-sm">
              {task.body.map(
                (
                  paragraph,
                  index,
                ) => (
                  <p
                    key={`${paragraph}-${index}`}
                  >
                    {paragraph}
                  </p>
                ),
              )}

              {task.deadline && (
                <p className="flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-xs">
                  <CalendarDays className="h-4 w-4" />
                  Due {task.deadline}
                </p>
              )}

              {task.attachment && (
                <div className="flex items-center gap-3 rounded-xl border p-3">
                  <FileText className="h-4 w-4" />

                  <p className="flex-1 text-xs">
                    {task.attachment}
                  </p>

                  <Download className="h-4 w-4" />
                </div>
              )}
            </div>
          </div>

          <div className="mt-auto border-t bg-surface px-5 py-3 text-xs text-muted-foreground">
            Read-only view from Gmail
          </div>
        </section>
      </div>
    </AppShell>
  );
}