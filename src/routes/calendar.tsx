import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Check,
  RefreshCw,
  Briefcase,
  GraduationCap,
  CreditCard,
  CalendarDays,
  User,
  Sparkles,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/calendar")({
  head: () => ({
    meta: [
      { title: "Calendar & reminders — MailFlow" },
      {
        name: "description",
        content:
          "A focused timeline of deadlines MailFlow found in your relevant emails.",
      },
      {
        property: "og:title",
        content: "Calendar & reminders — MailFlow",
      },
      {
        property: "og:description",
        content: "Deadlines, made visible.",
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
  component: CalendarPage,
});

const SELECTED_GMAIL_KEY =
  "mailflow_selected_gmail";

const cats = [
  "College",
  "Work",
  "Payment",
  "Event",
  "Personal",
] as const;

const categoryIcons = {
  College: GraduationCap,
  Work: Briefcase,
  Payment: CreditCard,
  Event: CalendarDays,
  Personal: User,
};

type CalendarTask = {
  id: string;
  title: string;
  category: string;
  priority: string;
  deadline: string | null;
  completed: boolean;
  emailSubject?: string;
  sender?: string;
};

function getSelectedGmail() {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(
    SELECTED_GMAIL_KEY,
  );
}

function CalendarPage() {
  const [show, setShow] = useState<string[]>([
    ...cats,
  ]);

  const [tasks, setTasks] = useState<
    CalendarTask[]
  >([]);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [error, setError] =
    useState<string | null>(null);

  const [currentDate, setCurrentDate] =
    useState(() => {
      const today = new Date();

      return new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      );
    });

  async function loadTasks(
    showRefreshing = false,
  ) {
    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!user) {
        setTasks([]);
        return;
      }

      const selectedGmail =
        getSelectedGmail();

      if (!selectedGmail) {
        setTasks([]);
        return;
      }

      const { data, error } =
        await supabase
          .from("tasks")
          .select(`
            id,
            title,
            category,
            priority,
            deadline,
            completed,
            email_id,
            emails!inner (
              subject,
              sender,
              gmail_email
            )
          `)
          .eq(
            "user_id",
            user.id,
          )
          .eq(
            "emails.gmail_email",
            selectedGmail,
          )
          .not(
            "deadline",
            "is",
            null,
          )
          .order(
            "deadline",
            {
              ascending: true,
            },
          );

      if (error) {
        console.error(
          "Calendar tasks error:",
          error,
        );

        setError(
          "Couldn't load your deadlines.",
        );

        return;
      }

      const formatted: CalendarTask[] =
        (data ?? []).map(
          (task: any) => ({
            id: task.id,
            title: task.title,
            category:
              task.category ??
              "Personal",
            priority:
              task.priority ??
              "Medium",
            deadline:
              task.deadline,
            completed:
              task.completed ??
              false,
            emailSubject:
              task.emails?.subject,
            sender:
              task.emails?.sender,
          }),
        );

      setTasks(formatted);
    } catch (error) {
      console.error(
        "Failed to load calendar tasks:",
        error,
      );

      setError(
        "Couldn't load your deadlines.",
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let mounted = true;

    async function setupCalendar() {
      const {
        data: { user },
      } =
        await supabase.auth.getUser();

      if (!mounted) {
        return;
      }

      await loadTasks();

      if (!mounted) {
        return;
      }

      if (!user) {
        return;
      }

      channel = supabase
        .channel(
          `mailflow-calendar-${user.id}`,
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadTasks();
          },
        )
        .subscribe((status) => {
          if (
            status ===
            "CHANNEL_ERROR"
          ) {
            console.warn(
              "Calendar realtime connection failed.",
            );
          }
        });
    }

    void setupCalendar();

    function handleGmailChanged() {
      setTasks([]);
      setError(null);

      void loadTasks();
    }

    window.addEventListener(
      "mailflow-gmail-changed",
      handleGmailChanged,
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "mailflow-gmail-changed",
        handleGmailChanged,
      );

      if (channel) {
        void supabase.removeChannel(
          channel,
        );
      }
    };
  }, []);

  const year =
    currentDate.getFullYear();

  const month =
    currentDate.getMonth();

  const monthName =
    currentDate.toLocaleString(
      "en-US",
      {
        month: "long",
      },
    );

  const firstDay =
    new Date(
      year,
      month,
      1,
    ).getDay();

  const daysInMonth =
    new Date(
      year,
      month + 1,
      0,
    ).getDate();

  const previousMonthDays =
    new Date(
      year,
      month,
      0,
    ).getDate();

  const cells: {
    d: number;
    out: boolean;
    date: Date | null;
  }[] = [];

  for (
    let i = firstDay - 1;
    i >= 0;
    i--
  ) {
    cells.push({
      d:
        previousMonthDays -
        i,
      out: true,
      date: null,
    });
  }

  for (
    let day = 1;
    day <= daysInMonth;
    day++
  ) {
    cells.push({
      d: day,
      out: false,
      date: new Date(
        year,
        month,
        day,
      ),
    });
  }

  while (cells.length < 42) {
    const day =
      cells.length -
        (firstDay +
          daysInMonth) +
      1;

    cells.push({
      d: day,
      out: true,
      date: null,
    });
  }

  const visibleTasks =
    tasks.filter((task) =>
      show.includes(
        task.category,
      ),
    );

  const upcoming = useMemo(() => {
    const now = new Date();

    return tasks
      .filter(
        (task) =>
          !task.completed &&
          task.deadline &&
          new Date(
            task.deadline,
          ) >= now,
      )
      .slice(0, 4);
  }, [tasks]);

  const monthDeadlineCount =
    visibleTasks.filter(
      (task) => {
        if (!task.deadline) {
          return false;
        }

        const date = new Date(
          task.deadline,
        );

        return (
          date.getFullYear() ===
            year &&
          date.getMonth() ===
            month
        );
      },
    ).length;

  function tasksForDay(
    day: number,
  ) {
    return visibleTasks.filter(
      (task) => {
        if (!task.deadline) {
          return false;
        }

        const date = new Date(
          task.deadline,
        );

        return (
          date.getFullYear() ===
            year &&
          date.getMonth() ===
            month &&
          date.getDate() ===
            day
        );
      },
    );
  }

  function formatWhen(
    deadline: string,
  ) {
    const date = new Date(
      deadline,
    );

    return date.toLocaleString(
      "en-US",
      {
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      },
    );
  }

  function previousMonth() {
    setCurrentDate(
      new Date(
        year,
        month - 1,
        1,
      ),
    );
  }

  function nextMonth() {
    setCurrentDate(
      new Date(
        year,
        month + 1,
        1,
      ),
    );
  }

  function goToday() {
    const today = new Date();

    setCurrentDate(
      new Date(
        today.getFullYear(),
        today.getMonth(),
        1,
      ),
    );
  }

  return (
    <AppShell
      eyebrow={`${monthName} ${year}`}
      title="Calendar & reminders"
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-3xl">
            Deadlines, made visible
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            A focused timeline of
            commitments MailFlow found
            in relevant emails.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={goToday}
            className="rounded-xl border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            Today
          </button>

          <button
            onClick={previousMonth}
            className="rounded-xl border bg-background p-2 transition-colors hover:bg-accent"
            aria-label="Previous month"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={nextMonth}
            className="rounded-xl border bg-background p-2 transition-colors hover:bg-accent"
            aria-label="Next month"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      <section className="flex flex-wrap items-center gap-2 rounded-2xl bg-card p-5 text-sm shadow-sm">
        <span className="text-muted-foreground">
          Show:
        </span>

        {cats.map(
          (category) => {
            const on =
              show.includes(
                category,
              );

            return (
              <button
                key={category}
                onClick={() =>
                  setShow(
                    on
                      ? show.filter(
                          (x) =>
                            x !==
                            category,
                        )
                      : [
                          ...show,
                          category,
                        ],
                  )
                }
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
                  on
                    ? "bg-accent"
                    : "bg-surface text-muted-foreground line-through"
                }`}
              >
                ● {category}

                {on && (
                  <Check className="h-3 w-3" />
                )}
              </button>
            );
          },
        )}

        <button
          onClick={() =>
            void loadTasks(true)
          }
          disabled={refreshing}
          className="ml-auto flex items-center gap-2 rounded-lg px-2 py-1 text-xs text-muted-foreground transition-colors hover:bg-accent disabled:opacity-50"
          title="Refresh deadlines"
        >
          <RefreshCw
            className={`h-3.5 w-3.5 ${
              refreshing
                ? "animate-spin"
                : ""
            }`}
          />

          {refreshing
            ? "Refreshing..."
            : `${tasks.length} ${
                tasks.length ===
                1
                  ? "task"
                  : "tasks"
              } synced`}
        </button>
      </section>

      {error && (
        <div className="rounded-xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <section className="overflow-hidden rounded-2xl border bg-card">
          <div className="flex justify-between p-5">
            <h3 className="text-lg font-semibold">
              {monthName} {year}
            </h3>

            <span className="text-xs text-muted-foreground">
              {monthDeadlineCount}{" "}
              {monthDeadlineCount ===
              1
                ? "deadline"
                : "deadlines"}{" "}
              & reminders
            </span>
          </div>

          <div className="grid grid-cols-7 border-t bg-surface text-center text-xs text-muted-foreground">
            {[
              "SUN",
              "MON",
              "TUE",
              "WED",
              "THU",
              "FRI",
              "SAT",
            ].map((day) => (
              <div
                key={day}
                className="py-2"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7">
            {cells.map(
              (
                {
                  d,
                  out,
                  date,
                },
                index,
              ) => {
                const dayTasks =
                  !out && date
                    ? tasksForDay(d)
                    : [];

                const today =
                  date &&
                  new Date().toDateString() ===
                    date.toDateString();

                return (
                  <div
                    key={index}
                    className={`min-h-24 border-r border-t p-2 text-sm ${
                      out
                        ? "text-muted-foreground"
                        : ""
                    } ${
                      today
                        ? "bg-surface"
                        : ""
                    }`}
                  >
                    <span
                      className={
                        today
                          ? "grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground"
                          : ""
                      }
                    >
                      {d}
                    </span>

                    {dayTasks.map(
                      (task) => (
                        <p
                          key={task.id}
                          title={
                            task.title
                          }
                          className="mt-1 truncate rounded bg-accent px-1.5 py-0.5 text-[11px]"
                        >
                          {task.title}
                        </p>
                      ),
                    )}
                  </div>
                );
              },
            )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-5">
            <h3 className="text-lg font-semibold">
              Coming up
            </h3>

            <p className="text-xs text-muted-foreground">
              Next deadlines
            </p>

            <div className="mt-3 divide-y">
              {loading ? (
                <p className="py-4 text-sm text-muted-foreground">
                  Loading deadlines...
                </p>
              ) : upcoming.length ===
                0 ? (
                <p className="py-4 text-sm text-muted-foreground">
                  No upcoming
                  deadlines.
                </p>
              ) : (
                upcoming.map(
                  (task) => {
                    const Icon =
                      categoryIcons[
                        task.category as keyof typeof categoryIcons
                      ] ??
                      CalendarDays;

                    return (
                      <div
                        key={task.id}
                        className="flex gap-3 py-3"
                      >
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-surface">
                          <Icon className="h-4 w-4" />
                        </span>

                        <div className="flex-1">
                          <p className="text-[11px] font-semibold uppercase">
                            {task.deadline
                              ? formatWhen(
                                  task.deadline,
                                )
                              : "No deadline"}
                          </p>

                          <p className="text-sm">
                            {task.title}
                          </p>

                          <p className="text-xs text-muted-foreground">
                            {task.emailSubject ??
                              task.category}
                          </p>
                        </div>

                        <input
                          type="checkbox"
                          checked={
                            task.completed
                          }
                          readOnly
                          aria-label={
                            task.title
                          }
                        />
                      </div>
                    );
                  },
                )
              )}
            </div>
          </section>

          <section className="rounded-2xl bg-ink p-5 text-ink-foreground">
            <p className="flex items-center gap-2 text-xs font-semibold">
              <Sparkles className="h-3.5 w-3.5" />
              REMINDER INTELLIGENCE
            </p>

            <p className="mt-3 text-sm">
              MailFlow automatically
              surfaces deadlines extracted
              from your relevant emails.
            </p>
          </section>
        </div>
      </div>
    </AppShell>
  );
}