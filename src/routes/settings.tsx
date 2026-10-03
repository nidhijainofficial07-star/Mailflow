import { createFileRoute, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import {
  Mail,
  ShieldCheck,
  ListFilter,
  SlidersHorizontal,
  Tag,
  Bell,
  Lock,
  GraduationCap,
  Briefcase,
  CreditCard,
  CalendarDays,
  User,
  Download,
  Trash2,
  GripVertical,
  Check,
  Plus,
  Loader2,
} from "lucide-react";
import { AppShell, Toggle } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — MailFlow" },
      {
        name: "description",
        content:
          "Control what MailFlow scans, what counts as relevant, and how your data is protected.",
      },
      {
        property: "og:title",
        content: "Settings — MailFlow",
      },
      {
        property: "og:description",
        content: "Make MailFlow work your way.",
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
  component: SettingsPage,
});

const SELECTED_GMAIL_KEY = "mailflow_selected_gmail";

type GmailAccount = {
  gmail_email: string;
  gmail_name: string | null;
};

const Card = ({
  id,
  t,
  s,
  children,
  right,
}: {
  id?: string;
  t: string;
  s: string;
  children: ReactNode;
  right?: ReactNode;
}) => (
  <section
    id={id}
    className="rounded-2xl border bg-card p-6"
  >
    <div className="flex justify-between gap-4">
      <div>
        <h3 className="text-lg font-semibold">{t}</h3>
        <p className="text-sm text-muted-foreground">{s}</p>
      </div>

      {right}
    </div>

    <div className="mt-4 divide-y">{children}</div>
  </section>
);

const Row = ({
  t,
  s,
  children,
}: {
  t: string;
  s: string;
  children: ReactNode;
}) => (
  <div className="flex items-center justify-between gap-4 py-3">
    <div>
      <p className="text-sm font-medium">{t}</p>
      <p className="text-xs text-muted-foreground">{s}</p>
    </div>

    {children}
  </div>
);

const Select = ({ opts }: { opts: string[] }) => (
  <select
    disabled
    className="cursor-not-allowed rounded-lg border bg-background px-3 py-2 text-xs font-medium opacity-70"
  >
    {opts.map((option) => (
      <option key={option}>{option}</option>
    ))}
  </select>
);

function SettingsPage() {
  const navigate = useNavigate();

  const [accountEmail, setAccountEmail] = useState("");
  const [gmailAccounts, setGmailAccounts] = useState<GmailAccount[]>([]);
  const [selectedGmail, setSelectedGmail] =
    useState<GmailAccount | null>(null);

  const [scannedCount, setScannedCount] = useState(0);
  const [lastScan, setLastScan] =
    useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void loadSettingsData();

    const handleGmailChange = () => {
      void loadSettingsData();
    };

    const handleStorageChange = () => {
      void loadSettingsData();
    };

    window.addEventListener(
      "mailflow-gmail-changed",
      handleGmailChange,
    );

    window.addEventListener(
      "storage",
      handleStorageChange,
    );

    return () => {
      window.removeEventListener(
        "mailflow-gmail-changed",
        handleGmailChange,
      );

      window.removeEventListener(
        "storage",
        handleStorageChange,
      );
    };
  }, []);

  async function loadSettingsData() {
    try {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      /*
       * Keep the real MailFlow login email internally for
       * authentication/logout purposes.
       *
       * The UI itself will show the currently selected Gmail
       * account instead.
       */
      setAccountEmail(user.email ?? "");

      const savedSelectedGmail =
        window.localStorage
          .getItem(SELECTED_GMAIL_KEY)
          ?.toLowerCase() ?? null;

      const [
        { data: gmailData, error: gmailError },
        { data: scan, error: scanError },
      ] = await Promise.all([
        supabase
          .from("gmail_tokens")
          .select("gmail_email, gmail_name")
          .eq("user_id", user.id)
          .not("gmail_email", "is", null)
          .order("created_at", {
            ascending: true,
          }),

        supabase
          .from("scan_history")
          .select("scanned_count, scanned_at")
          .eq("user_id", user.id)
          .order("scanned_at", {
            ascending: false,
          })
          .limit(1)
          .maybeSingle(),
      ]);

      if (gmailError) {
        console.error(
          "Gmail accounts loading error:",
          gmailError,
        );
      }

      if (scanError) {
        console.error(
          "Scan history loading error:",
          scanError,
        );
      }

      const accounts = (gmailData ?? [])
        .filter(
          (account) =>
            typeof account.gmail_email === "string" &&
            account.gmail_email.length > 0,
        )
        .map((account) => ({
          gmail_email:
            account.gmail_email.toLowerCase(),
          gmail_name:
            account.gmail_name ?? null,
        })) as GmailAccount[];

      setGmailAccounts(accounts);

      let activeGmail: GmailAccount | null = null;

      if (savedSelectedGmail) {
        activeGmail =
          accounts.find(
            (account) =>
              account.gmail_email ===
              savedSelectedGmail,
          ) ?? null;
      }

      if (!activeGmail && accounts.length > 0) {
        const firstAccount = accounts[0];

        if (firstAccount) {
          activeGmail = firstAccount;

          window.localStorage.setItem(
            SELECTED_GMAIL_KEY,
            firstAccount.gmail_email,
          );

          window.dispatchEvent(
            new Event("mailflow-gmail-changed"),
          );
        }
      }

      setSelectedGmail(activeGmail);

      if (scan) {
        setScannedCount(
          scan.scanned_count ?? 0,
        );

        const scanDate = new Date(
          scan.scanned_at,
        );

        if (!Number.isNaN(scanDate.getTime())) {
          setLastScan(
            scanDate.toLocaleString("en-IN", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            }),
          );
        } else {
          setLastScan(null);
        }
      } else {
        setScannedCount(0);
        setLastScan(null);
      }
    } catch (error) {
      console.error(
        "Settings loading error:",
        error,
      );
    } finally {
      setLoading(false);
    }
  }

  function selectGmail(account: GmailAccount) {
    if (
      account.gmail_email ===
      selectedGmail?.gmail_email
    ) {
      return;
    }

    window.localStorage.setItem(
      SELECTED_GMAIL_KEY,
      account.gmail_email,
    );

    setSelectedGmail(account);

    window.dispatchEvent(
      new Event("mailflow-gmail-changed"),
    );
  }

  async function handleLogout() {
    if (busy) return;

    setBusy(true);

    try {
      const { error } =
        await supabase.auth.signOut();

      if (error) {
        console.error(
          "Logout error:",
          error,
        );

        window.alert(
          "Unable to log out. Please try again.",
        );

        return;
      }

      await navigate({ to: "/login" });
    } finally {
      setBusy(false);
    }
  }

  async function handleAddGmail() {
    await navigate({ to: "/connect" });
  }

  async function handleDisconnectGmail(
    account: GmailAccount,
  ) {
    const confirmed =
      window.confirm(
        `Disconnect ${account.gmail_email} from MailFlow?\n\nYour MailFlow tasks and extracted data will remain, but MailFlow will no longer be connected to this Gmail account.`,
      );

    if (!confirmed) return;

    try {
      setBusy(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      const { error } =
        await supabase
          .from("gmail_tokens")
          .delete()
          .eq("user_id", user.id)
          .eq(
            "gmail_email",
            account.gmail_email,
          );

      if (error) {
        console.error(
          "Disconnect Gmail error:",
          error,
        );

        window.alert(
          "Unable to disconnect Gmail. Please try again.",
        );

        return;
      }

      const remainingAccounts =
        gmailAccounts.filter(
          (item) =>
            item.gmail_email !==
            account.gmail_email,
        );

      setGmailAccounts(remainingAccounts);

      if (
        selectedGmail?.gmail_email ===
        account.gmail_email
      ) {
        const nextAccount =
          remainingAccounts[0] ?? null;

        if (nextAccount) {
          window.localStorage.setItem(
            SELECTED_GMAIL_KEY,
            nextAccount.gmail_email,
          );
        } else {
          window.localStorage.removeItem(
            SELECTED_GMAIL_KEY,
          );
        }

        setSelectedGmail(nextAccount);

        window.dispatchEvent(
          new Event(
            "mailflow-gmail-changed",
          ),
        );
      }

      window.alert(
        "Gmail disconnected successfully.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleExportData() {
    try {
      setBusy(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      const selectedEmail =
        selectedGmail?.gmail_email;

      if (!selectedEmail) {
        window.alert(
          "No Gmail account is selected.",
        );
        return;
      }

      const [
        emailsResult,
        tasksResult,
        remindersResult,
        scansResult,
      ] = await Promise.all([
        supabase
          .from("emails")
          .select("*")
          .eq("user_id", user.id)
          .eq("gmail_email", selectedEmail),

        supabase
          .from("tasks")
          .select(`
            *,
            emails!inner (
              gmail_email
            )
          `)
          .eq("user_id", user.id)
          .eq(
            "emails.gmail_email",
            selectedEmail,
          ),

        supabase
          .from("reminders")
          .select(`
            *,
            tasks!inner (
              emails!inner (
                gmail_email
              )
            )
          `)
          .eq("user_id", user.id)
          .eq(
            "tasks.emails.gmail_email",
            selectedEmail,
          ),

        supabase
          .from("scan_history")
          .select("*")
          .eq("user_id", user.id),
      ]);

      const firstError =
        emailsResult.error ||
        tasksResult.error ||
        remindersResult.error ||
        scansResult.error;

      if (firstError) {
        throw firstError;
      }

      const exportData = {
        exported_at:
          new Date().toISOString(),

        account: {
          id: user.id,
          email: user.email,
          gmail: selectedEmail,
        },

        emails:
          emailsResult.data ?? [],

        tasks:
          tasksResult.data ?? [],

        reminders:
          remindersResult.data ?? [],

        scan_history:
          scansResult.data ?? [],
      };

      const blob = new Blob(
        [
          JSON.stringify(
            exportData,
            null,
            2,
          ),
        ],
        {
          type: "application/json",
        },
      );

      const url =
        URL.createObjectURL(blob);

      const link =
        document.createElement("a");

      link.href = url;

      const safeEmail =
        selectedEmail.replace(
          /[^a-zA-Z0-9._-]/g,
          "_",
        );

      link.download =
        `mailflow-${safeEmail}-data.json`;

      document.body.appendChild(link);
      link.click();
      link.remove();

      URL.revokeObjectURL(url);
    } catch (error) {
      console.error(
        "Export data error:",
        error,
      );

      window.alert(
        "Unable to export your MailFlow data. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleClearData() {
    const selectedEmail =
      selectedGmail?.gmail_email;

    if (!selectedEmail) {
      window.alert(
        "No Gmail account is selected.",
      );
      return;
    }

    const confirmed =
      window.confirm(
        `Clear the extracted MailFlow data for ${selectedEmail}?\n\nThis will remove the MailFlow reminders, tasks, and emails belonging to this Gmail account. It will NOT delete or modify anything in Gmail.`,
      );

    if (!confirmed) return;

    try {
      setBusy(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        await navigate({ to: "/login" });
        return;
      }

      const {
        data: accountTasks,
        error: taskLookupError,
      } = await supabase
        .from("tasks")
        .select(`
          id,
          emails!inner (
            gmail_email
          )
        `)
        .eq("user_id", user.id)
        .eq(
          "emails.gmail_email",
          selectedEmail,
        );

      if (taskLookupError) {
        throw taskLookupError;
      }

      const taskIds =
        (accountTasks ?? []).map(
          (task) => task.id,
        );

      if (taskIds.length > 0) {
        const {
          error: remindersError,
        } = await supabase
          .from("reminders")
          .delete()
          .eq("user_id", user.id)
          .in("task_id", taskIds);

        if (remindersError) {
          throw remindersError;
        }

        const { error: tasksError } =
          await supabase
            .from("tasks")
            .delete()
            .eq("user_id", user.id)
            .in("id", taskIds);

        if (tasksError) {
          throw tasksError;
        }
      }

      const { error: emailsError } =
        await supabase
          .from("emails")
          .delete()
          .eq("user_id", user.id)
          .eq(
            "gmail_email",
            selectedEmail,
          );

      if (emailsError) {
        throw emailsError;
      }

      setScannedCount(0);
      setLastScan(null);

      window.alert(
        `MailFlow data for ${selectedEmail} has been cleared. Gmail was not modified.`,
      );
    } catch (error) {
      console.error(
        "Clear data error:",
        error,
      );

      window.alert(
        "Unable to completely clear the selected Gmail's extracted data. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  const activeDisplayName =
    selectedGmail?.gmail_name ||
    selectedGmail?.gmail_email?.split("@")[0] ||
    "Gmail account";

  const activeDisplayEmail =
    selectedGmail?.gmail_email ||
    "No Gmail account selected";

  const activeInitials =
    selectedGmail?.gmail_name ||
    selectedGmail?.gmail_email
      ? (
          selectedGmail?.gmail_name ||
          selectedGmail?.gmail_email ||
          "GM"
        )
          .substring(0, 2)
          .toUpperCase()
      : "GM";

  return (
    <AppShell
      eyebrow="MailFlow preferences"
      title="Settings"
    >
      <div>
        <h2 className="text-3xl">
          Make MailFlow work your way
        </h2>

        <p className="mt-1 text-sm text-muted-foreground">
          Control what gets scanned, what counts as
          relevant, and how MailFlow protects your data.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-[14rem_1fr]">
        <aside className="h-fit rounded-2xl border bg-card p-3 text-sm lg:sticky lg:top-6">
          {([
            [User, "MailFlow account", "account"],
            [ListFilter, "Scanning", "scan"],
            [SlidersHorizontal, "Relevance", "rel"],
            [Tag, "Categories", "cat"],
            [Bell, "Reminders", "rem"],
            [ShieldCheck, "Privacy & data", "priv"],
          ] as const).map(
            ([Icon, label, id], index) => (
              <a
                key={id}
                href={`#${id}`}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 ${
                  index === 0
                    ? "bg-accent font-semibold"
                    : "text-muted-foreground hover:bg-accent/60"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </a>
            ),
          )}

          <div className="mt-3 border-t px-3 pt-3 text-xs">
            <p className="text-muted-foreground">
              GMAIL ACTIVITY
            </p>

            <p className="mt-1 font-semibold">
              {loading
                ? "Loading activity..."
                : `${scannedCount} emails checked`}
            </p>

            <p className="mt-1 text-muted-foreground">
              {selectedGmail
                ? selectedGmail.gmail_email
                : "No Gmail selected"}
            </p>

            <p className="mt-1 text-muted-foreground">
              {lastScan
                ? `Last scan: ${lastScan}`
                : "No scan recorded yet"}
            </p>

            <p className="mt-1 text-muted-foreground">
              MailFlow only reads Gmail. It never
              modifies or deletes your emails.
            </p>
          </div>
        </aside>

        <div className="space-y-4">
          {/* ACCOUNT */}
          <Card
            id="account"
            t="MailFlow account"
            s="Manage your active Gmail account and MailFlow access"
          >
            {/* ACTIVE GMAIL ACCOUNT */}
            <div className="flex flex-wrap items-center gap-3 rounded-xl bg-surface p-4 !border-0">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                {activeInitials}
              </span>

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">
                  {activeDisplayName}
                </p>

                <p className="truncate text-xs text-muted-foreground">
                  {activeDisplayEmail}
                </p>

                <p className="mt-1 text-xs text-muted-foreground">
                  Currently active Gmail account
                </p>
              </div>

              {selectedGmail && (
                <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold">
                  <Check className="h-3 w-3" />
                  Active
                </span>
              )}

              <button
                onClick={handleLogout}
                disabled={busy}
                className="rounded-lg border border-destructive/30 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Log out
              </button>
            </div>

            {/* CONNECTED GMAIL ACCOUNTS */}
            <div className="mt-4 rounded-xl border bg-surface p-4 !border-0">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold">
                    Connected Gmail accounts
                  </p>

                  <p className="mt-1 text-xs text-muted-foreground">
                    Select the Gmail account MailFlow should
                    use across Inbox, Tasks, Calendar, and scanning.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleAddGmail}
                  disabled={busy}
                  className="flex shrink-0 items-center gap-1.5 rounded-lg border bg-background px-3 py-2 text-xs font-semibold transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add Gmail
                </button>
              </div>

              <div className="mt-4 space-y-2">
                {loading ? (
                  <div className="flex items-center justify-center rounded-xl border bg-background p-5">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                ) : gmailAccounts.length === 0 ? (
                  <div className="rounded-xl border bg-background p-5 text-center">
                    <Mail className="mx-auto h-6 w-6 text-muted-foreground" />

                    <p className="mt-2 text-sm font-medium">
                      No Gmail account connected
                    </p>

                    <button
                      type="button"
                      onClick={handleAddGmail}
                      className="mt-3 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"
                    >
                      Connect Gmail
                    </button>
                  </div>
                ) : (
                  gmailAccounts.map((account) => {
                    const isSelected =
                      selectedGmail?.gmail_email ===
                      account.gmail_email;

                    return (
                      <div
                        key={account.gmail_email}
                        className={`flex items-center gap-3 rounded-xl border p-3 transition-colors ${
                          isSelected
                            ? "border-brand bg-background"
                            : "bg-background"
                        }`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
                          {(
                            account.gmail_name ||
                            account.gmail_email
                          )
                            .substring(0, 2)
                            .toUpperCase()}
                        </span>

                        <button
                          type="button"
                          onClick={() =>
                            selectGmail(account)
                          }
                          className="min-w-0 flex-1 text-left"
                        >
                          <p className="truncate text-sm font-semibold">
                            {account.gmail_name ||
                              account.gmail_email.split(
                                "@",
                              )[0]}
                          </p>

                          <p className="truncate text-xs text-muted-foreground">
                            {account.gmail_email}
                          </p>

                          <p className="mt-1 text-[11px] text-muted-foreground">
                            {isSelected
                              ? "Currently active"
                              : "Click to switch"}
                          </p>
                        </button>

                        {isSelected && (
                          <span className="flex shrink-0 items-center gap-1 rounded-full bg-accent px-2 py-1 text-xs font-semibold">
                            <Check className="h-3 w-3" />
                            Active
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() =>
                            handleDisconnectGmail(
                              account,
                            )
                          }
                          disabled={busy}
                          className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-semibold text-muted-foreground transition-colors hover:bg-accent hover:text-destructive disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          Disconnect
                        </button>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex items-center gap-2 rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground">
                <ShieldCheck className="h-4 w-4 shrink-0" />

                <span>
                  Gmail access is read-only. MailFlow never
                  sends, edits, moves, archives, or deletes
                  Gmail messages.
                </span>
              </div>
            </div>

            {/* MAILFLOW LOGIN INFORMATION */}
            <div className="mt-4 rounded-xl border border-dashed p-3">
              <p className="text-xs font-semibold text-muted-foreground">
                MAILFLOW LOGIN
              </p>

              <p className="mt-1 truncate text-xs text-muted-foreground">
                {accountEmail || "Signed-in account"}
              </p>

              <p className="mt-1 text-[11px] text-muted-foreground">
                This is the account used to authenticate with
                MailFlow. It is separate from the active Gmail above.
              </p>
            </div>
          </Card>

          {/* SCANNING */}
          <Card
            id="scan"
            t="Scanning preferences"
            s="Choose when and how much MailFlow reviews"
          >
            <Row
              t="Automatic scanning"
              s="Automatic scheduled scanning is not configured yet."
            >
              <Toggle />
            </Row>

            <Row
              t="Scan frequency"
              s="These controls are ready for future scheduled scanning."
            >
              <Select
                opts={[
                  "Every 15 minutes",
                  "Every hour",
                  "Twice a day",
                ]}
              />
            </Row>

            <Row
              t="Initial lookback window"
              s="Lookback configuration is currently controlled by the scan backend."
            >
              <Select
                opts={[
                  "Past 90 days",
                  "Past 30 days",
                  "Past 7 days",
                ]}
              />
            </Row>
          </Card>

          {/* RELEVANCE */}
          <Card
            id="rel"
            t="Relevance controls"
            s="Current AI relevance rules are controlled by MailFlow's scan backend"
          >
            <Row
              t="Prioritize direct requests"
              s="Requests to submit, reply, pay, register, attend, or decide are treated as relevant."
            >
              <Toggle />
            </Row>

            <Row
              t="Include important informational messages"
              s="Meaningful exam updates, location changes, statements, and schedule changes can remain relevant."
            >
              <Toggle />
            </Row>

            <Row
              t="Filter promotions and generic newsletters"
              s="Generic marketing and newsletters are filtered from MailFlow but remain untouched in Gmail."
            >
              <Toggle />
            </Row>

            <Row
              t="Relevance sensitivity"
              s="The current AI configuration determines how strictly messages are classified."
            >
              <Select
                opts={[
                  "Balanced",
                  "Strict",
                  "Inclusive",
                ]}
              />
            </Row>
          </Card>

          {/* CATEGORIES + REMINDERS */}
          <div className="grid gap-4 xl:grid-cols-2">
            <Card
              id="cat"
              t="Categories"
              s="Used across inbox, tasks, and calendar"
              right={
                <button
                  disabled
                  className="cursor-not-allowed text-sm font-semibold text-muted-foreground"
                >
                  Add category
                </button>
              }
            >
              {([
                [
                  GraduationCap,
                  "College",
                  "Assignments, exams, registration",
                ],
                [
                  Briefcase,
                  "Work",
                  "Interviews, projects, meetings",
                ],
                [
                  CreditCard,
                  "Payment",
                  "Fees, bills, statements",
                ],
                [
                  CalendarDays,
                  "Event",
                  "Workshops, clubs, campus events",
                ],
                [
                  User,
                  "Personal",
                  "Appointments, friends, errands",
                ],
              ] as const).map(
                ([Icon, title, description]) => (
                  <div
                    key={title}
                    className="flex items-center gap-3 py-3"
                  >
                    <span className="grid h-8 w-8 place-items-center rounded-lg bg-surface">
                      <Icon className="h-4 w-4" />
                    </span>

                    <div className="flex-1">
                      <p className="text-sm">
                        {title}
                      </p>

                      <p className="text-xs text-muted-foreground">
                        {description}
                      </p>
                    </div>

                    <Toggle />

                    <GripVertical className="h-4 w-4 text-muted-foreground" />
                  </div>
                ),
              )}
            </Card>

            <Card
              id="rem"
              t="Reminder defaults"
              s="Suggested timing for extracted deadlines"
            >
              <Row
                t="High priority"
                s="Suggested timing for urgent or same-day deadlines."
              >
                <Select
                  opts={[
                    "4 hours before",
                    "1 hour before",
                    "1 day before",
                  ]}
                />
              </Row>

              <Row
                t="Medium priority"
                s="Suggested timing for deadlines within the next week."
              >
                <Select
                  opts={[
                    "1 day before",
                    "2 days before",
                  ]}
                />
              </Row>

              <Row
                t="Daily digest"
                s="Daily digest scheduling is not configured yet."
              >
                <Select
                  opts={[
                    "8:00 AM",
                    "7:00 AM",
                    "9:00 AM",
                  ]}
                />
              </Row>

              <Row
                t="Reminder notifications"
                s="Browser reminders are handled by MailFlow's notification system."
              >
                <Toggle />
              </Row>
            </Card>
          </div>

          {/* PRIVACY */}
          <Card
            id="priv"
            t="Privacy & data controls"
            s="You decide what MailFlow retains"
          >
            <div className="flex gap-3 rounded-xl bg-surface p-4 !border-0">
              <Lock className="h-4 w-4 shrink-0" />

              <div>
                <p className="text-sm font-medium">
                  Your Gmail stays yours
                </p>

                <p className="text-xs text-muted-foreground">
                  MailFlow stores extracted actions and
                  the context needed for your workspace.
                  Filtered emails are never deleted from
                  Gmail.
                </p>
              </div>
            </div>

            <Row
              t="Store original email excerpts"
              s="This preference is not currently persisted as a database setting."
            >
              <Toggle />
            </Row>

            <Row
              t="Automatically remove completed task context"
              s="Automatic retention rules are not currently configured."
            >
              <Toggle />
            </Row>

            <div className="flex flex-wrap items-center gap-2 pt-4">
              <button
                onClick={handleExportData}
                disabled={busy || !selectedGmail}
                className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" />
                Export selected Gmail data
              </button>

              <button
                onClick={handleClearData}
                disabled={busy || !selectedGmail}
                className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                Clear selected Gmail data
              </button>

              <span className="ml-auto text-xs text-muted-foreground">
                Read-only Gmail access
              </span>
            </div>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}