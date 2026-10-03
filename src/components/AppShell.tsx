import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { useUnread } from "@/lib/notifications";
import { supabase } from "@/lib/supabase";
import {
  Workflow,
  Sparkles,
  Inbox,
  CalendarDays,
  Settings,
  ChevronsUpDown,
  Bell,
  ShieldCheck,
  CheckCircle2,
  Check,
  Plus,
} from "lucide-react";

type NavItem = {
  to: "/today" | "/inbox" | "/calendar" | "/completed" | "/settings";
  label: string;
  I: typeof Sparkles;
};

type GmailAccount = {
  gmail_email: string;
  gmail_name: string | null;
};

const nav: NavItem[] = [
  { to: "/today", label: "Today", I: Sparkles },
  { to: "/inbox", label: "Relevant inbox", I: Inbox },
  { to: "/calendar", label: "Calendar", I: CalendarDays },
  { to: "/completed", label: "Completed", I: CheckCircle2 },
  { to: "/settings", label: "Settings", I: Settings },
];

const SELECTED_GMAIL_KEY = "mailflow_selected_gmail";

function getInitials(name: string, email: string): string {
  const cleaned = name.trim();

  if (cleaned) {
    const parts = cleaned.split(/\s+/).filter(Boolean);

    if (parts.length >= 2) {
      const first = parts[0] ?? "";
      const last = parts[parts.length - 1] ?? "";

      return (
        `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "?"
      );
    }

    if (parts.length === 1) {
      return parts[0]?.slice(0, 2).toUpperCase() || "?";
    }
  }

  const emailName = email.split("@")[0]?.trim() ?? "";

  return emailName.slice(0, 2).toUpperCase() || "?";
}

function BellLink() {
  const n = useUnread().length;

  return (
    <Link
      to="/notifications"
      className="relative rounded-xl border bg-background p-2.5"
      aria-label={`Notifications (${n} unread)`}
    >
      <Bell className="h-4 w-4" />

      {n > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
          {n}
        </span>
      )}
    </Link>
  );
}

export function AppShell({
  eyebrow,
  title,
  action,
  children,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [inboxCount, setInboxCount] = useState(0);
  const [completedThisWeek, setCompletedThisWeek] = useState(0);

  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [selectedGmail, setSelectedGmail] = useState("");
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  async function loadDashboardData() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setUserName("");
      setUserEmail("");
      setInboxCount(0);
      setCompletedThisWeek(0);
      setGmailAccounts([]);
      setSelectedGmail("");
      setLoadingAccounts(false);
      return;
    }

    const metadata = user.user_metadata as {
      full_name?: string;
      name?: string;
    };

    const name = metadata.full_name || metadata.name || "";

    setUserName(typeof name === "string" ? name : "");
    setUserEmail(user.email ?? "");

    const savedGmail = localStorage.getItem(SELECTED_GMAIL_KEY);

    const [emailsResult, tasksResult, gmailResult] =
  await Promise.all([
    supabase
      .from("emails")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("relevant", true),

    supabase
      .from("tasks")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id)
      .eq("completed", true)
      .gte(
        "created_at",
        getStartOfCurrentWeek().toISOString(),
      ),

    supabase
      .from("gmail_tokens")
      .select("gmail_email, gmail_name")
      .eq("user_id", user.id),
  ]);

console.log("Current MailFlow user:", user.id);
console.log("Gmail accounts query:", gmailResult.data);
console.log("Gmail accounts error:", gmailResult.error);
    
    if (!emailsResult.error) {
      setInboxCount(emailsResult.count ?? 0);
    }

    if (!tasksResult.error) {
      setCompletedThisWeek(tasksResult.count ?? 0);
    }

    if (!gmailResult.error) {
      const accounts = ((gmailResult.data ?? []) as GmailAccount[]).filter(
  (account) =>
    typeof account.gmail_email === "string" &&
    account.gmail_email.trim().length > 0,
);

setGmailAccounts(accounts);

      const savedAccountExists = accounts.some(
        (account) => account.gmail_email === savedGmail,
      );

      if (savedAccountExists && savedGmail) {
        setSelectedGmail(savedGmail);
      } else if (accounts.length > 0) {
        const firstAccount = accounts[0]?.gmail_email ?? "";

        setSelectedGmail(firstAccount);
        localStorage.setItem(SELECTED_GMAIL_KEY, firstAccount);
      } else {
        setSelectedGmail("");
        localStorage.removeItem(SELECTED_GMAIL_KEY);
      }
    }

    setLoadingAccounts(false);
  }

  useEffect(() => {
    void loadDashboardData();

    const channel = supabase
      .channel("app-shell-dashboard")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "emails",
        },
        () => {
          void loadDashboardData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
        },
        () => {
          void loadDashboardData();
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "gmail_tokens",
        },
        () => {
          void loadDashboardData();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, []);

  function handleSelectGmail(email: string) {
    setSelectedGmail(email);
    localStorage.setItem(SELECTED_GMAIL_KEY, email);
    setAccountMenuOpen(false);
  }

  function handleAddGmail() {
    window.location.href = "/connect";
  }

  const selectedAccount =
    gmailAccounts.find(
      (account) => account.gmail_email === selectedGmail,
    ) ?? null;

  const displayName =
    selectedAccount?.gmail_name ||
    userName ||
    "Account";

  const displayEmail =
    selectedAccount?.gmail_email ||
    userEmail ||
    "Not signed in";

  const initials = getInitials(displayName, displayEmail);

  return (
    <div className="flex min-h-screen bg-surface font-sans text-foreground">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r bg-sidebar p-5 lg:flex">
        <Link to="/" className="flex items-center gap-3">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Workflow className="h-4 w-4" />
          </span>

          <span className="text-xl">MailFlow</span>
        </Link>

        {/* Gmail account switcher */}
        <div className="relative mt-6">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((open) => !open)}
            className="flex w-full items-center gap-3 rounded-xl bg-surface p-3 text-left transition hover:bg-accent"
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {initials}
            </span>

            <div className="min-w-0 flex-1 leading-tight">
              <p className="truncate text-sm">
                {loadingAccounts ? "Loading..." : displayName}
              </p>

              <p className="truncate text-xs text-muted-foreground">
                {loadingAccounts
                  ? "Gmail accounts"
                  : displayEmail}
              </p>
            </div>

            <ChevronsUpDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>

          {accountMenuOpen && (
            <>
              <button
                type="button"
                className="fixed inset-0 z-40 cursor-default"
                aria-label="Close account menu"
                onClick={() => setAccountMenuOpen(false)}
              />

              <div
                role="menu"
                className="absolute left-0 right-0 top-full z-50 mt-2 overflow-hidden rounded-xl border bg-background p-2 shadow-lg"
              >
                <p className="px-3 pb-2 pt-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  Gmail accounts
                </p>

                {gmailAccounts.length === 0 ? (
                  <div className="px-3 py-3 text-xs text-muted-foreground">
                    No Gmail account connected yet.
                  </div>
                ) : (
                  <div className="space-y-1">
                    {gmailAccounts.map((account) => {
                      const isSelected =
                        account.gmail_email === selectedGmail;

                      const accountName =
                        account.gmail_name ||
                        account.gmail_email.split("@")[0] ||
                        "Gmail";

                      const accountInitials = getInitials(
                        accountName,
                        account.gmail_email,
                      );

                      return (
                        <button
                          key={account.gmail_email}
                          type="button"
                          role="menuitem"
                          onClick={() =>
                            handleSelectGmail(
                              account.gmail_email,
                            )
                          }
                          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition ${
                            isSelected
                              ? "bg-accent"
                              : "hover:bg-surface"
                          }`}
                        >
                          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                            {accountInitials}
                          </span>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">
                              {accountName}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {account.gmail_email}
                            </p>
                          </div>

                          {isSelected && (
                            <Check className="h-4 w-4 shrink-0 text-primary" />
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                <div className="my-2 border-t" />

                <button
                  type="button"
                  role="menuitem"
                  onClick={handleAddGmail}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition hover:bg-surface"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-full border">
                    <Plus className="h-4 w-4" />
                  </span>

                  <span>Add Gmail account</span>
                </button>
              </div>
            </>
          )}
        </div>

        <nav className="mt-6 space-y-1 text-sm">
          {nav.map((n) => (
            <Link
              key={n.to}
              to={n.to}
              className="flex items-center gap-3 rounded-xl px-3 py-3 text-muted-foreground"
              activeProps={{
                className:
                  "bg-accent font-semibold !text-foreground",
              }}
            >
              <n.I className="h-4 w-4" />

              {n.label}

              {n.to === "/inbox" && (
                <span className="ml-auto rounded-full bg-secondary px-2 text-xs font-semibold text-foreground">
                  {inboxCount}
                </span>
              )}
            </Link>
          ))}
        </nav>

        <div className="mt-6 rounded-xl bg-ink p-4 text-ink-foreground">
          <p className="flex items-center gap-2 text-xs font-semibold">
            <Sparkles className="h-3.5 w-3.5" />
            MAILFLOW AI
          </p>

          <p className="mt-2 text-sm">
            You cleared {completedThisWeek}{" "}
            {completedThisWeek === 1 ? "action" : "actions"} this week.
          </p>
        </div>

        <p className="mt-auto flex gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="h-4 w-4 shrink-0 text-brand" />
          Read-only Gmail access. MailFlow never deletes or sends email.
        </p>
      </aside>

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <header className="sticky top-0 z-20 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b bg-background px-4 py-3 sm:px-6 md:px-8 md:py-4">
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold uppercase text-brand">
              {eyebrow}
            </p>

            <h1 className="truncate text-lg sm:text-xl md:text-2xl">
              {title}
            </h1>
          </div>

          <div className="flex shrink-0 gap-2">
            {action}
            <BellLink />
          </div>
        </header>

        <main className="space-y-6 p-4 sm:p-6 md:p-8">
          {children}
        </main>
      </div>

      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t bg-background px-1 pb-[env(safe-area-inset-bottom)] lg:hidden">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            className="relative flex flex-col items-center gap-1 py-2.5 text-[11px] text-muted-foreground"
            activeProps={{
              className: "!text-foreground font-semibold",
            }}
          >
            <n.I className="h-5 w-5" />

            <span className="truncate">
              {n.label.replace("Relevant inbox", "Inbox")}
            </span>

            {n.to === "/inbox" && inboxCount > 0 && (
              <span className="absolute right-3 top-1.5 rounded-full bg-primary px-1.5 text-[10px] text-primary-foreground">
                {inboxCount}
              </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
}

function getStartOfCurrentWeek(): Date {
  const now = new Date();

  const day = now.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  start.setDate(now.getDate() - daysFromMonday);

  return start;
}

export function Toggle({ on = true }: { on?: boolean }) {
  return (
    <label className="relative inline-flex cursor-pointer">
      <input
        type="checkbox"
        defaultChecked={on}
        className="peer sr-only"
      />

      <span className="h-6 w-11 rounded-full bg-input transition peer-checked:bg-primary" />

      <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-background transition peer-checked:translate-x-5" />
    </label>
  );
}

export const Chip = ({
  children,
  strong,
}: {
  children: ReactNode;
  strong?: boolean;
}) => (
  <span
    className={`rounded-md px-2 py-0.5 text-xs font-medium ${
      strong
        ? "bg-accent text-foreground"
        : "bg-surface text-muted-foreground"
    }`}
  >
    {children}
  </span>
);