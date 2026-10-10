
import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useTasks, setStatus } from "@/lib/tasks";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  RefreshCw,
  Timer,
  ArrowUpRight,
  Clock,
  ChevronRight,
  ListFilter,
  Briefcase,
  GraduationCap,
  Receipt,
  User,
  CalendarDays,
  Inbox,
} from "lucide-react";

export const Route = createFileRoute("/today")({
  head: () => ({
    meta: [
      { title: "Today — MailFlow" },
      {
        name: "description",
        content:
          "Your prioritized actions, deadlines, and relevant emails for today.",
      },
      { property: "og:title", content: "Today — MailFlow" },
      {
        property: "og:description",
        content:
          "What should I do today? MailFlow's prioritized plan from your inbox.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Today,
});

const SELECTED_GMAIL_KEY = "mailflow_selected_gmail";

type ScanStats = {
  scanned: number;
  relevant: number;
  filtered: number;
};

type RelevantEmail = {
  id: string;
  sender: string | null;
  subject: string | null;
  received_at: string | null;
  category: string | null;
  gmail_email: string | null;
};

type CategoryBreakdown = {
  name: string;
  count: number;
  actionable: number;
  filtered: number;
};

function getSelectedGmail() {
  if (typeof window === "undefined") return null;

  const gmail = window.localStorage.getItem(SELECTED_GMAIL_KEY);
  return gmail ? gmail.trim().toLowerCase() : null;
}

function normalizeCategory(category: string | null) {
  const value = String(category ?? "").trim().toLowerCase();

  if (
    ["college", "college work", "assignment", "exam", "education",
     "academic", "coursework", "lab", "project"].includes(value)
  ) {
    return "College";
  }

  if (
    ["work", "internship", "interview", "job", "career",
     "placement", "professional"].includes(value)
  ) {
    return "Work";
  }

  if (
    ["payment", "bill", "billing", "subscription", "fee",
     "fees", "recharge", "finance"].includes(value)
  ) {
    return "Payment";
  }

  if (
    ["event", "meeting", "workshop", "calendar",
     "appointment", "webinar"].includes(value)
  ) {
    return "Event";
  }

  if (
    ["promotion", "promotions", "newsletter",
     "marketing", "sale", "advertisement"].includes(value)
  ) {
    return "Promotions & Newsletters";
  }

  if (!value || value === "personal") return "Personal";

  return category!.trim().replace(/\b\w/g, (char) =>
    char.toUpperCase()
  );
}

function getCategoryIcon(category: string | null) {
  switch (normalizeCategory(category)) {
    case "College":
      return GraduationCap;
    case "Work":
      return Briefcase;
    case "Payment":
      return Receipt;
    case "Event":
      return CalendarDays;
    default:
      return User;
  }
}

function formatTimeAgo(dateValue: string | null) {
  if (!dateValue) return "No scan history";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Recently";

  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;

  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

function formatReceivedTime(dateValue: string | null) {
  if (!dateValue) return "";

  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "";

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    });
  }

  return date.toLocaleDateString("en-IN", {
    month: "short",
    day: "numeric",
  });
}

function formatCountdown(deadline: string | null) {
  if (!deadline) return "—";

  const target = new Date(deadline).getTime();
  const difference = target - Date.now();

  if (Number.isNaN(target)) return "—";
  if (difference <= 0) return "Due now";

  const totalMinutes = Math.floor(difference / 60000);
  const days = Math.floor(totalMinutes / (60 * 24));
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  return `${hours}h ${minutes}m`;
}

function formatDeadlineText(deadline: string | null) {
  if (!deadline) return "No deadline";

  const date = new Date(deadline);
  if (Number.isNaN(date.getTime())) return deadline;

  const today = new Date();
  const isToday =
    date.getDate() === today.getDate() &&
    date.getMonth() === today.getMonth() &&
    date.getFullYear() === today.getFullYear();

  if (isToday) {
    return `Due today at ${date.toLocaleTimeString("en-IN", {
      hour: "numeric",
      minute: "2-digit",
    })}`;
  }

  return `Due ${date.toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  })} at ${date.toLocaleTimeString("en-IN", {
    hour: "numeric",
    minute: "2-digit",
  })}`;
}

function Today() {
  const tasks = useTasks();

  const active = useMemo(() => {
    return tasks
      .filter((task) => task.status === "active")
      .sort((a, b) => {
        const aTime = a.deadlineRaw
          ? new Date(a.deadlineRaw).getTime()
          : Number.POSITIVE_INFINITY;
        const bTime = b.deadlineRaw
          ? new Date(b.deadlineRaw).getTime()
          : Number.POSITIVE_INFINITY;

        if (Number.isNaN(aTime)) return 1;
        if (Number.isNaN(bTime)) return -1;
        return aTime - bTime;
      });
  }, [tasks]);

  const [scanStats, setScanStats] = useState<ScanStats>({
    scanned: 0,
    relevant: 0,
    filtered: 0,
  });

  const [lastScan, setLastScan] = useState<string | null>(null);
  const [relevantEmails, setRelevantEmails] = useState<RelevantEmail[]>([]);
  const [categoryCounts, setCategoryCounts] = useState<CategoryBreakdown[]>([]);
  const [userName, setUserName] = useState("there");

  useEffect(() => {
    let mounted = true;

    async function loadDashboardData() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const selectedGmail = getSelectedGmail();

        
const nameFromMetadata =
  user.user_metadata?.["full_name"] ??
  user.user_metadata?.["name"];

        if (nameFromMetadata && mounted) {
          setUserName(String(nameFromMetadata).split(" ")[0] || "there");
        }

        // If no account is selected, clear all account-specific content.
        // This prevents category counts from accidentally including multiple Gmail accounts.
        if (!selectedGmail) {
          if (mounted) {
            setCategoryCounts([]);
            setScanStats({ scanned: 0, relevant: 0, filtered: 0 });
            setLastScan(null);
            setRelevantEmails([]);
          }
          return;
        }

        // Load category breakdown from database rows for the selected Gmail account only.
        // Each row returned by Supabase contributes to the count; no hardcoded totals.
        const {
          data: categoryEmails,
          error: categoryError,
        } = await supabase
          .from("emails")
          .select("category, relevant, gmail_email")
          .eq("user_id", user.id)
          .eq("gmail_email", selectedGmail);

        if (categoryError) {
          console.error("Failed to load category breakdown:", categoryError);
          if (mounted) setCategoryCounts([]);
        } else if (mounted) {
          const counts = new Map<string, CategoryBreakdown>();

          (categoryEmails ?? []).forEach((email) => {
            const name = normalizeCategory(email.category);

            if (!counts.has(name)) {
              counts.set(name, {
                name,
                count: 0,
                actionable: 0,
                filtered: 0,
              });
            }

            const item = counts.get(name)!;
            item.count += 1;

            if (email.relevant === true) {
              item.actionable += 1;
            } else {
              item.filtered += 1;
            }
          });

          setCategoryCounts(
            Array.from(counts.values()).sort(
              (a, b) => b.count - a.count
            )
          );
        }

        
        // Dynamic email counts directly from Supabase.
        const [
          { count: totalEmails, error: totalError },
          { count: relevantCount, error: relevantError },
          { count: filteredCount, error: filteredError },
        ] = await Promise.all([
          supabase
            .from("emails")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("gmail_email", selectedGmail),

          supabase
            .from("emails")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("gmail_email", selectedGmail)
            .eq("relevant", true),

          supabase
            .from("emails")
            .select("*", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("gmail_email", selectedGmail)
            .eq("relevant", false),
        ]);

        if (totalError || relevantError || filteredError) {
          console.error(
            "Failed to load email counts:",
            totalError ?? relevantError ?? filteredError
          );
        } else if (mounted) {
          setScanStats({
            scanned: totalEmails ?? 0,
            relevant: relevantCount ?? 0,
            filtered: filteredCount ?? 0,
          });
        }

        // Get the latest scan time separately.
        const { data: scan, error: scanError } = await supabase
          .from("scan_history")
          .select("scanned_at")
          .eq("user_id", user.id)
          .eq("email", selectedGmail)
          .order("scanned_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (scanError) {
          console.error("Failed to load scan time:", scanError);
        }

        if (mounted) {
          setLastScan(scan?.scanned_at ?? null);
        }

        // Recent relevant emails for the selected Gmail account.
        const {
          data: emails,
          error: emailError,
        } = await supabase
          .from("emails")
          .select("id, sender, subject, received_at, category, gmail_email")
          .eq("user_id", user.id)
          .eq("gmail_email", selectedGmail)
          .eq("relevant", true)
          .order("received_at", { ascending: false })
          .limit(4);

        if (emailError) {
          console.error("Failed to load relevant emails:", emailError);
        }

        if (mounted) {
          setRelevantEmails(emails ?? []);
        }
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    }

    void loadDashboardData();

    function handleGmailChanged() {
      setScanStats({ scanned: 0, relevant: 0, filtered: 0 });
      setLastScan(null);
      setRelevantEmails([]);
      setCategoryCounts([]);
      void loadDashboardData();
    }

    window.addEventListener("mailflow-gmail-changed", handleGmailChanged);

    return () => {
      mounted = false;
      window.removeEventListener(
        "mailflow-gmail-changed",
        handleGmailChanged
      );
    };
  }, []);

  const nextTask =
    active.find((task) => {
      if (!task.deadlineRaw) return false;
      const time = new Date(task.deadlineRaw).getTime();
      return !Number.isNaN(time) && time >= Date.now();
    }) ?? active[0];

  const maxCategoryCount = Math.max(
    ...categoryCounts.map((item) => item.count),
    1
  );

  const todayText = new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const highPriorityCount = active.filter(
    (task) => String(task.pri).trim().toLowerCase() === "high"
  ).length;

  const totalCategoryEmails = categoryCounts.reduce(
    (total, item) => total + item.count,
    0
  );

  return (
    <AppShell
      eyebrow={todayText}
      title="What Should I Do Today?"
      action={
        <Link
          to="/scanning"
          className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold"
        >
          <RefreshCw className="h-4 w-4" />
          Scan inbox
        </Link>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-3xl md:text-4xl">
            Good morning, {userName}.
          </h2>
          <p className="mt-2 text-muted-foreground">
            MailFlow found {active.length}{" "}
            {active.length === 1 ? "thing" : "things"} that need your attention.
            {highPriorityCount > 0 &&
              ` ${highPriorityCount} ${
                highPriorityCount === 1 ? "is" : "are"
              } high priority.`}
          </p>
        </div>

        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-foreground" />
          Inbox scanned {formatTimeAgo(lastScan)}
        </p>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl bg-card p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-2 font-semibold">
              <Sparkles className="h-4 w-4" />
              Latest inbox scan
            </p>
            <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-semibold">
              AI sorted
            </span>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {[
              [String(scanStats.scanned), "emails scanned", "bg-surface"],
              [String(scanStats.relevant), "relevant to you", "bg-accent"],
              [String(active.length), "requiring action", "bg-accent"],
            ].map(([number, label, bg]) => (
              <div key={label} className={`rounded-xl p-5 ${bg}`}>
                <p className="text-3xl">{number}</p>
                <p className="mt-2 text-sm font-medium text-muted-foreground">
                  {label}
                </p>
              </div>
            ))}
          </div>

          <p className="mt-4 flex items-center gap-3 rounded-xl bg-surface px-4 py-3 text-xs text-muted-foreground">
            <ListFilter className="h-4 w-4" />
            {scanStats.filtered} promotions and generic newsletters filtered
            from MailFlow. They remain untouched in Gmail.
          </p>
        </section>

        <section className="flex flex-col rounded-2xl bg-ink p-6 text-ink-foreground">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">NEXT DEADLINE</p>
            <Timer className="h-4 w-4" />
          </div>

          {nextTask ? (
            <>
              <p className="mt-5 text-4xl">
                {formatCountdown(nextTask.deadlineRaw)}
              </p>
              <p className="mt-2">{nextTask.title}</p>
              <p className="text-sm text-ink-muted">
                {formatDeadlineText(nextTask.deadlineRaw)}
              </p>
              <div className="mt-5 h-1 rounded-full bg-ink-soft">
                <div className="h-1 w-3/4 rounded-full bg-ink-foreground" />
              </div>
              <Link
                to="/task"
                search={{ id: nextTask.id }}
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink-soft py-3 font-semibold"
              >
                <ArrowUpRight className="h-4 w-4" />
                Open task
              </Link>
            </>
          ) : (
            <>
              <p className="mt-5 text-3xl">All clear</p>
              <p className="mt-2 text-sm text-ink-muted">
                No upcoming deadlines found.
              </p>
              <Link
                to="/inbox"
                className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-ink-soft py-3 font-semibold"
              >
                <Inbox className="h-4 w-4" />
                Open inbox
              </Link>
            </>
          )}
        </section>
      </div>

      <section className="rounded-2xl border bg-card p-6">
        <div className="flex items-end justify-between">
          <div>
            <h3 className="text-xl font-semibold">Prioritized for today</h3>
            <p className="text-sm text-muted-foreground">
              Ordered by urgency, deadline, and impact
            </p>
          </div>
          <Link to="/inbox" className="text-sm font-semibold">
            View all {active.length} tasks
          </Link>
        </div>

        <div className="mt-4 divide-y">
          {active.length === 0 && (
            <p className="py-8 text-center text-muted-foreground">
              All clear.{" "}
              <Link to="/caught-up" className="font-semibold text-brand">
                See your summary
              </Link>
            </p>
          )}

          {active.map((task) => (
            <div key={task.id} className="flex items-center gap-4 py-5">
              <input
                type="checkbox"
                checked={false}
                onChange={() => setStatus(task.id, "completed")}
                className="h-5 w-5 accent-primary"
                aria-label={task.title}
              />

              <div className="min-w-0 flex-1">
                <p className="text-lg">{task.title}</p>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                  <span>{task.from}</span>
                  <span>·</span>
                  <span>{task.org}</span>
                  <span>·</span>
                  <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-semibold text-foreground">
                    {normalizeCategory(task.cat)}
                  </span>
                </div>
              </div>

              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                  String(task.pri).trim().toLowerCase() === "high"
                    ? "bg-accent text-foreground"
                    : String(task.pri).trim().toLowerCase() === "low"
                      ? "bg-surface text-muted-foreground"
                      : "bg-secondary text-foreground"
                }`}
              >
                {task.pri}
              </span>

              <span className="hidden items-center gap-2 text-sm text-muted-foreground md:flex">
                <Clock className="h-4 w-4" />
                {task.when}
              </span>

              <Link
                to="/task"
                search={{ id: task.id }}
                aria-label={`Open ${task.title}`}
              >
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </Link>
            </div>
          ))}
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[1fr_2fr]">
        <section className="rounded-2xl border bg-card p-6">
          <h3 className="text-xl font-semibold">Category breakdown</h3>
          <p className="text-sm text-muted-foreground">
            {totalCategoryEmails} emails across {categoryCounts.length} categories
          </p>

          {categoryCounts.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No email categories found for this account.
              Check that the emails table has rows for your signed-in user.
            </p>
          ) : (
            <div className="mt-5 space-y-5">
              {categoryCounts.map((category) => (
                <div key={category.name}>
                  <div className="flex justify-between gap-3 text-sm">
                    <span className="font-medium">{category.name}</span>
                    <span className="text-muted-foreground">
                      {category.count} total
                    </span>
                  </div>

                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-2 rounded-full bg-primary"
                      style={{
                        width: `${
                          (category.count / maxCategoryCount) * 100
                        }%`,
                      }}
                    />
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground">
                    {category.actionable} actionable · {category.filtered} filtered
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-2xl border bg-card p-6">
          <div className="flex items-end justify-between">
            <div>
              <h3 className="text-xl font-semibold">Recent relevant emails</h3>
              <p className="text-sm text-muted-foreground">
                Important context without an immediate action
              </p>
            </div>
            <Link to="/inbox" className="text-sm font-semibold">
              Open relevant inbox
            </Link>
          </div>

          <div className="mt-3 divide-y">
            {relevantEmails.length === 0 && (
              <p className="py-8 text-center text-muted-foreground">
                No relevant emails found yet.
              </p>
            )}

            {relevantEmails.map((email) => {
              const Icon = getCategoryIcon(email.category);

              return (
                <div key={email.id} className="flex items-center gap-4 py-4">
                  <span className="grid h-10 w-10 place-items-center rounded-xl bg-surface">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                  </span>

                  <div className="min-w-0 flex-1">
                    <p className="text-sm">
                      {email.sender || "Unknown sender"}
                    </p>
                    <p className="truncate text-muted-foreground">
                      {email.subject || "No subject"}
                    </p>
                  </div>

                  <span className="text-xs text-muted-foreground">
                    {formatReceivedTime(email.received_at)}
                  </span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </AppShell>
  );
}