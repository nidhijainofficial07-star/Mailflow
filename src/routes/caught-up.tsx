import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import {
  CheckCircle2,
  RefreshCw,
  CalendarDays,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/caught-up")({
  head: () => ({
    meta: [
      { title: "All caught up — MailFlow" },
      {
        name: "description",
        content:
          "No actions left. MailFlow will keep watching your inbox.",
      },
      {
        property: "og:title",
        content: "All caught up — MailFlow",
      },
      {
        property: "og:description",
        content:
          "Every important email has been handled.",
      },
      { property: "og:type", content: "website" },
      {
        name: "twitter:card",
        content: "summary",
      },
    ],
  }),
  component: CaughtUp,
});

const SELECTED_GMAIL_KEY = "mailflow_selected_gmail";

function getSelectedGmail(): string | null {
  if (typeof window === "undefined") return null;

  const value = localStorage.getItem(SELECTED_GMAIL_KEY);

  return value ? value.toLowerCase() : null;
}

function CaughtUp() {
  const [completedCount, setCompletedCount] = useState(0);
  const [overdueCount, setOverdueCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const today = new Date();

  const dateLabel = today.toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
    },
  );

  async function loadStats() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setCompletedCount(0);
        setOverdueCount(0);
        return;
      }

      const selectedGmail = getSelectedGmail();

      if (!selectedGmail) {
        setCompletedCount(0);
        setOverdueCount(0);
        return;
      }

      // Tasks are linked to emails, so filter through
      // the selected Gmail account.
      const { data, error } = await supabase
        .from("tasks")
        .select(`
          completed,
          deadline,
          emails!inner (
            gmail_email
          )
        `)
        .eq("user_id", user.id)
        .eq("emails.gmail_email", selectedGmail);

      if (error) {
        console.error(
          "Caught-up stats error:",
          error,
        );
        return;
      }

      const tasks = data ?? [];
      const now = new Date();

      const completed = tasks.filter(
        (task) => task.completed,
      ).length;

      const overdue = tasks.filter(
        (task) =>
          !task.completed &&
          task.deadline &&
          new Date(task.deadline) < now,
      ).length;

      setCompletedCount(completed);
      setOverdueCount(overdue);
    } catch (error) {
      console.error(
        "Failed to load caught-up stats:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let channel:
      | ReturnType<typeof supabase.channel>
      | null = null;

    let mounted = true;

    async function setup() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!mounted) return;

      await loadStats();

      if (!user || !mounted) return;

      channel = supabase
        .channel(`mailflow-caught-up-${user.id}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "tasks",
            filter: `user_id=eq.${user.id}`,
          },
          () => {
            void loadStats();
          },
        )
        .subscribe((status) => {
          if (status === "CHANNEL_ERROR") {
            console.warn(
              "Caught-up realtime connection failed.",
            );
          }
        });
    }

    void setup();

    function handleGmailChange() {
      if (!mounted) return;

      setCompletedCount(0);
      setOverdueCount(0);

      void loadStats();
    }

    window.addEventListener(
      "mailflow-gmail-changed",
      handleGmailChange,
    );

    return () => {
      mounted = false;

      window.removeEventListener(
        "mailflow-gmail-changed",
        handleGmailChange,
      );

      if (channel) {
        void supabase.removeChannel(channel);
      }
    };
  }, []);

  return (
    <AppShell
      eyebrow={dateLabel}
      title="What Should I Do Today?"
    >
      <section className="mx-auto max-w-xl rounded-2xl border bg-card p-10 text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-accent">
          <CheckCircle2 className="h-7 w-7 text-brand" />
        </span>

        <h2 className="mt-5 text-3xl">
          You're all caught up.
        </h2>

        <p className="mt-2 text-muted-foreground">
          No actions need your attention right now.
          MailFlow will let you know when something
          important arrives.
        </p>

        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-xl bg-surface p-4">
            <p className="text-2xl">
              {loading ? "—" : completedCount}
            </p>

            <p className="text-muted-foreground">
              actions completed
            </p>
          </div>

          <div className="rounded-xl bg-surface p-4">
            <p className="text-2xl">
              {loading ? "—" : overdueCount}
            </p>

            <p className="text-muted-foreground">
              overdue
            </p>
          </div>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link
            to="/scanning"
            className="flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
          >
            <RefreshCw className="h-4 w-4" />
            Scan again
          </Link>

          <Link
            to="/calendar"
            className="flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
          >
            <CalendarDays className="h-4 w-4" />
            View calendar
          </Link>
        </div>
      </section>
    </AppShell>
  );
}