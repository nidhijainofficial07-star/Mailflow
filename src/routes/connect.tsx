import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Workflow,
  Sparkles,
  ScanSearch,
  ListChecks,
  CalendarClock,
  ArrowUpRight,
  Check,
  Mail,
  Eye,
  ShieldCheck,
  ListFilter,
  Lock,
  UserCheck,
  Loader2,
} from "lucide-react";
import { supabase } from "../lib/supabase";

export const Route = createFileRoute("/connect")({
  head: () => ({
    meta: [
      { title: "Connect your Gmail — MailFlow" },
      {
        name: "description",
        content:
          "Give MailFlow read-only Gmail access to find the actions and deadlines that matter.",
      },
      {
        property: "og:title",
        content: "Connect your Gmail — MailFlow",
      },
      {
        property: "og:description",
        content:
          "Read-only access. MailFlow never sends, edits, or deletes email.",
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
  component: Connect,
});

function Connect() {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [loadingUser, setLoadingUser] = useState(true);
  const [error, setError] = useState("");

  async function loadUser() {
    try {
      setLoadingUser(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setUserName("");
        setUserEmail("");
        return;
      }

      setUserName(
        String(
          user.user_metadata?.["full_name"] ||
            user.user_metadata?.["name"] ||
            user.email?.split("@")[0] ||
            "Google user",
        ),
      );

      setUserEmail(user.email ?? "");
    } catch (err) {
      console.error("Failed to load user:", err);
    } finally {
      setLoadingUser(false);
    }
  }

  useEffect(() => {
    void loadUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void loadUser();
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  async function handleConnectGmail() {
    setConnecting(true);
    setError("");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.access_token) {
        throw new Error(
          "Please sign in before connecting Gmail.",
        );
      }

      const response = await fetch(
        "https://fwdcpjtmqipqnsapksbr.supabase.co/functions/v1/start-gmail-auth",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
        },
      );

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(
          data.error ||
            data.message ||
            "Unable to start Gmail connection.",
        );
      }

      if (!data.url) {
        throw new Error(
          "Google authorization URL was not returned.",
        );
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Gmail connection error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while connecting Gmail.",
      );

      setConnecting(false);
    }
  }

  const initials = userName
    ? userName
        .split(" ")
        .filter(Boolean)
        .map((part) => part[0])
        .join("")
        .slice(0, 2)
        .toUpperCase()
    : "GU";

  return (
    <div className="grid min-h-screen font-sans lg:grid-cols-[43%_1fr]">
      <aside className="flex flex-col bg-ink p-8 text-ink-foreground md:p-10">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-ink-soft">
            <Workflow className="h-4 w-4" />
          </span>

          <span className="text-lg">MailFlow</span>
        </Link>

        <p className="mt-12 flex items-center gap-2 text-xs font-semibold uppercase text-brand">
          <Sparkles className="h-3.5 w-3.5" />
          AI email-to-action assistant
        </p>

        <h1 className="mt-4 text-4xl leading-tight">
          Turn the emails that matter into a clear plan.
        </h1>

        <p className="mt-4 text-sm text-ink-muted">
          MailFlow finds assignments, interview requests,
          payments, events, and deadlines—then puts the next
          action first.
        </p>

        <div className="mt-8 space-y-5">
          {(
            [
              [
                ScanSearch,
                "Scan for signal, not noise",
                "Promotions and generic newsletters stay in Gmail, but never clutter your MailFlow workspace.",
              ],
              [
                ListChecks,
                "Know exactly what to do",
                "See the action, deadline, priority, and original context without rereading every thread.",
              ],
              [
                CalendarClock,
                "Never miss the date",
                "Turn extracted deadlines into calm reminders across college, work, payments, and life.",
              ],
            ] as const
          ).map(([I, t, d]) => (
            <div key={t} className="flex gap-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-ink-soft">
                <I className="h-4 w-4" />
              </span>

              <div>
                <p className="text-sm font-semibold">{t}</p>
                <p className="text-xs text-ink-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-8 rounded-xl border border-ink-soft bg-ink-soft/50 p-4">
          <div className="flex justify-between text-xs">
            <span className="font-semibold">MAILFLOW</span>

            <span className="text-ink-muted">
              Action-first workspace
            </span>
          </div>

          <div className="mt-3 flex items-center gap-3 text-sm">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-muted" />

            <div className="flex-1">
              <p>Important email detected</p>

              <p className="text-xs text-ink-muted">
                Deadline and next action extracted automatically
              </p>
            </div>

            <ArrowUpRight className="h-4 w-4" />
          </div>
        </div>

        <p className="mt-6 text-xs text-ink-muted">
          MailFlow turns relevant emails into clear tasks,
          deadlines, and priorities while keeping Gmail read-only.
        </p>
      </aside>

      <main className="flex flex-col bg-surface p-6 md:p-10">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Set up your workspace</span>

          <div className="flex items-center gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-primary-foreground">
              <Check className="h-3.5 w-3.5" />
            </span>

            <span className="h-px w-8 bg-brand" />

            <span className="grid h-6 w-6 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
              2
            </span>

            <span className="h-px w-8 bg-border" />

            <span className="grid h-6 w-6 place-items-center rounded-full border bg-background text-xs">
              3
            </span>
          </div>
        </div>

        <div className="mx-auto mt-10 w-full max-w-lg rounded-2xl bg-card p-8 shadow-sm">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-surface">
            <Mail className="h-5 w-5" />
          </span>

          <h2 className="mt-4 text-center text-2xl">
            Connect your Gmail
          </h2>

          <p className="mt-2 text-center text-sm text-muted-foreground">
            MailFlow needs read-only access to identify relevant
            messages and extract actions. You stay in control.
          </p>

          <div className="mt-6 flex items-center gap-3 rounded-xl bg-surface p-3">
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {loadingUser ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                initials
              )}
            </span>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">
                {loadingUser
                  ? "Loading account..."
                  : userName || "Google user"}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {loadingUser
                  ? "Checking signed-in account"
                  : userEmail || "Gmail account"}
              </p>
            </div>

            <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs font-semibold">
              Signed in
            </span>
          </div>

          <div className="mt-5 space-y-4">
            {(
              [
                [
                  Eye,
                  "Read email content and metadata",
                  "Only to classify relevance and summarize actions, dates, and context.",
                ],
                [
                  ShieldCheck,
                  "Read-only means read-only",
                  "MailFlow cannot send, edit, move, archive, or delete messages in Gmail.",
                ],
                [
                  ListFilter,
                  "Noise stays out of MailFlow",
                  "Promotional emails and generic newsletters are filtered from this workspace—never deleted from Gmail.",
                ],
              ] as const
            ).map(([I, t, d]) => (
              <div key={t} className="flex gap-3">
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-surface">
                  <I className="h-4 w-4" />
                </span>

                <div>
                  <p className="text-sm font-semibold">{t}</p>
                  <p className="text-xs text-muted-foreground">
                    {d}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {error && (
            <div className="mt-5 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {error}
            </div>
          )}

          <button
            type="button"
            onClick={handleConnectGmail}
            disabled={connecting || loadingUser}
            className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {connecting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Connecting Gmail...
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" />
                Allow read-only access
              </>
            )}
          </button>

          <p className="mt-4 text-center text-xs text-muted-foreground">
            By continuing, you agree to MailFlow's Terms and Privacy
            Policy. Revoke access anytime from Settings or your Google
            Account.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-6 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-brand" />
            Google OAuth
          </span>

          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-brand" />
            Encrypted in transit
          </span>

          <span className="flex items-center gap-1.5">
            <UserCheck className="h-3.5 w-3.5 text-brand" />
            Your data, your control
          </span>
        </div>
      </main>
    </div>
  );
}