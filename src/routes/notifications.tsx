import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useEffect, useState } from "react";
import { useUnread, setUnread } from "@/lib/notifications";
import {
  Timer,
  Sparkles,
  CalendarDays,
  AlertTriangle,
  CheckCheck,
  type LucideIcon,
} from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — MailFlow" },
      {
        name: "description",
        content:
          "Deadline warnings, scan summaries, and reminders from MailFlow.",
      },
      {
        property: "og:title",
        content: "Notifications — MailFlow",
      },
      {
        property: "og:description",
        content:
          "Stay on top of deadlines with MailFlow notifications.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Notifications,
});

type NotificationItem = {
  id: string;
  icon: LucideIcon;
  title: string;
  description: string;
  time: string;
  sortTime: number;
};

type ReminderTask = {
  title: string | null;
  deadline: string | null;
  emails?: {
    gmail_email: string | null;
  } | null;
};

const SELECTED_GMAIL_KEY = "mailflow_selected_gmail";

function getSelectedGmail(): string | null {
  if (typeof window === "undefined") return null;

  const value = localStorage.getItem(SELECTED_GMAIL_KEY);

  return value ? value.toLowerCase() : null;
}

function Notifications() {
  const unreadIds = useUnread();

  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    let channel: ReturnType<typeof supabase.channel> | null = null;

    async function loadNotifications(showLoader = false) {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          if (mounted) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        const selectedGmail = getSelectedGmail();

        if (!selectedGmail) {
          if (mounted) {
            setItems([]);
            setLoading(false);
          }
          return;
        }

        const notifications: NotificationItem[] = [];
        const now = new Date();

        // -----------------------------------
        // LOAD UPCOMING TASKS / DEADLINES
        // Only tasks belonging to selected Gmail
        // -----------------------------------

        const { data: tasks, error: taskError } = await supabase
          .from("tasks")
          .select(`
            id,
            title,
            deadline,
            completed,
            category,
            emails!inner (
              gmail_email
            )
          `)
          .eq("user_id", user.id)
          .eq("emails.gmail_email", selectedGmail)
          .eq("completed", false)
          .not("deadline", "is", null)
          .order("deadline", {
            ascending: true,
          })
          .limit(10);

        if (taskError) {
          console.error(
            "Notification tasks error:",
            taskError,
          );
        }

        for (const task of tasks ?? []) {
          if (!task.deadline) continue;

          const deadline = new Date(task.deadline);

          if (Number.isNaN(deadline.getTime())) continue;

          const diff = deadline.getTime() - now.getTime();
          const hours = diff / (1000 * 60 * 60);

          let Icon: LucideIcon = CalendarDays;

          if (hours <= 24) {
            Icon = AlertTriangle;
          } else {
            Icon = Timer;
          }

          const when = deadline.toLocaleString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          let description = `Due ${when}`;

          if (hours > 0 && hours <= 24) {
            const roundedHours = Math.max(1, Math.round(hours));

            description = `Due in approximately ${roundedHours} hour${
              roundedHours === 1 ? "" : "s"
            }`;
          }

          if (hours <= 0) {
            description = `Deadline passed · ${when}`;
            Icon = AlertTriangle;
          }

          notifications.push({
            id: `task-${task.id}`,
            icon: Icon,
            title: task.title,
            description,
            time: when,
            sortTime: deadline.getTime(),
          });
        }

        // -----------------------------------
        // LOAD REMINDERS
        // Only reminders for tasks belonging
        // to the selected Gmail
        // -----------------------------------

        const { data: reminders, error: reminderError } =
          await supabase
            .from("reminders")
            .select(`
              id,
              remind_at,
              completed,
              task_id,
              tasks!inner (
                title,
                deadline,
                emails!inner (
                  gmail_email
                )
              )
            `)
            .eq("user_id", user.id)
            .eq("completed", false)
            .eq("tasks.emails.gmail_email", selectedGmail)
            .order("remind_at", {
              ascending: true,
            })
            .limit(10);

        if (reminderError) {
          console.error(
            "Notification reminders error:",
            reminderError,
          );
        }

        for (const reminder of reminders ?? []) {
          const remindAt = new Date(reminder.remind_at);

          if (Number.isNaN(remindAt.getTime())) continue;

          const task = Array.isArray(reminder.tasks)
            ? reminder.tasks[0]
            : reminder.tasks;

          const when = remindAt.toLocaleString("en-IN", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          });

          notifications.push({
            id: `reminder-${reminder.id}`,
            icon: Timer,
            title: task?.title ?? "Task reminder",
            description: `Reminder scheduled for ${when}`,
            time: when,
            sortTime: remindAt.getTime(),
          });
        }

        // -----------------------------------
        // LOAD LATEST SCAN
        //
        // scan_history currently has no gmail_email,
        // so this remains user-wide for now.
        // We will make it account-specific later.
        // -----------------------------------

        const { data: scans, error: scanError } =
          await supabase
            .from("scan_history")
            .select(`
              id,
              scanned_count,
              relevant_count,
              filtered_count,
              scanned_at
            `)
            .eq("user_id", user.id)
            .order("scanned_at", {
              ascending: false,
            })
            .limit(1);

        if (scanError) {
          console.error(
            "Notification scan error:",
            scanError,
          );
        }

        const latestScan = scans?.[0];

        if (latestScan) {
          const scannedAt = new Date(latestScan.scanned_at);

          if (!Number.isNaN(scannedAt.getTime())) {
            notifications.push({
              id: `scan-${latestScan.id}`,
              icon: Sparkles,
              title: "Inbox scan complete",
              description: `${latestScan.scanned_count} emails checked · ${latestScan.relevant_count} relevant · ${latestScan.filtered_count} filtered`,
              time: scannedAt.toLocaleString("en-IN", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              }),
              sortTime: scannedAt.getTime(),
            });
          }
        }

        // -----------------------------------
        // NEWEST ACTIVITY FIRST
        // -----------------------------------

        notifications.sort(
          (a, b) => b.sortTime - a.sortTime,
        );

        if (mounted) {
          setItems(notifications);
        }

        // -----------------------------------
        // REALTIME
        // -----------------------------------

        if (!channel) {
          channel = supabase
            .channel(`mailflow-notifications-${user.id}`)
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "tasks",
                filter: `user_id=eq.${user.id}`,
              },
              () => {
                void loadNotifications();
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "reminders",
                filter: `user_id=eq.${user.id}`,
              },
              () => {
                void loadNotifications();
              },
            )
            .on(
              "postgres_changes",
              {
                event: "*",
                schema: "public",
                table: "scan_history",
                filter: `user_id=eq.${user.id}`,
              },
              () => {
                void loadNotifications();
              },
            )
            .subscribe();
        }
      } catch (error) {
        console.error(
          "Failed to load notifications:",
          error,
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    void loadNotifications(true);

    // Native storage does not fire in the same tab,
    // so AppShell uses this custom event when Gmail changes.
    function handleGmailChange() {
      setItems([]);
      void loadNotifications(true);
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

  const unread = unreadIds.length;

  function markAsRead(id: string) {
    setUnread(
      unreadIds.filter(
        (itemId) => itemId !== id,
      ),
    );
  }

  function markAllAsRead() {
    setUnread([]);

    if (unread > 0) {
      toast.success("All notifications marked as read");
    }
  }

  return (
    <AppShell
      eyebrow={`${unread} unread`}
      title="Notifications"
      action={
        <button
          onClick={markAllAsRead}
          disabled={unread === 0}
          className="flex items-center gap-2 rounded-xl border bg-background px-3 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />

          <span className="hidden sm:inline">
            Mark all as read
          </span>
        </button>
      }
    >
      <section className="divide-y rounded-2xl border bg-card">
        {loading ? (
          <p className="p-8 text-center text-sm text-muted-foreground">
            Loading notifications...
          </p>
        ) : items.length === 0 ? (
          <div className="p-8 text-center">
            <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />

            <p className="mt-3 font-medium">
              You're all caught up
            </p>

            <p className="mt-1 text-sm text-muted-foreground">
              New deadlines and scan activity will appear here.
            </p>
          </div>
        ) : (
          items.map((item) => {
            const isUnread = unreadIds.includes(item.id);

            return (
              <button
                key={item.id}
                onClick={() => markAsRead(item.id)}
                className={`flex w-full items-center gap-4 p-4 text-left transition-colors hover:bg-accent/40 sm:p-5 ${
                  isUnread ? "bg-accent/40" : ""
                }`}
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-surface">
                  <item.icon className="h-4 w-4" />
                </span>

                <div className="min-w-0 flex-1">
                  <p
                    className={`truncate ${
                      isUnread ? "font-semibold" : ""
                    }`}
                  >
                    {item.title}
                  </p>

                  <p className="text-sm text-muted-foreground">
                    {item.description}
                  </p>
                </div>

                <span className="hidden shrink-0 text-xs text-muted-foreground sm:block">
                  {item.time}
                </span>

                {isUnread && (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-brand" />
                )}
              </button>
            );
          })
        )}
      </section>

      <Link
        to="/settings"
        className="text-sm font-semibold hover:underline"
      >
        Manage reminder settings →
      </Link>
    </AppShell>
  );
}