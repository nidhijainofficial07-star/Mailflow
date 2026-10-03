import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  Search,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ArrowUpRight,
  Eye,
  Clock,
  Sparkles,
  ListFilter,
} from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";
import { useTasks } from "@/lib/tasks";

export const Route = createFileRoute("/inbox")({
  head: () => ({
    meta: [
      { title: "Relevant inbox — MailFlow" },
      {
        name: "description",
        content:
          "The messages worth your attention, separated into actions and important info.",
      },
      {
        property: "og:title",
        content: "Relevant inbox — MailFlow",
      },
      {
        property: "og:description",
        content:
          "MailFlow separates next actions from important context without changing Gmail.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),

  component: InboxPage,
});

const SELECTED_GMAIL_KEY =
  "mailflow_selected_gmail";

type Email = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  received_at: string | null;
  relevant: boolean;
  category: string | null;
  priority: string | null;
  status: string | null;
  deadline: string | null;
  summary: string | null;
  relevance_reason: string | null;
  gmail_email: string | null;
};

type ScanStats = {
  scanned: number;
  relevant: number;
  filtered: number;
};

type MainFilter =
  | "all"
  | "action"
  | "info";

type CategoryFilter =
  | "all"
  | "College"
  | "Work"
  | "Payment"
  | "Event"
  | "Personal";

type PriorityFilter =
  | "all"
  | "High"
  | "Medium"
  | "Low";

function getSelectedGmail() {
  if (typeof window === "undefined") {
    return null;
  }

  const gmail =
    window.localStorage.getItem(
      SELECTED_GMAIL_KEY,
    );

  return gmail
    ? gmail.trim().toLowerCase()
    : null;
}

function normalizeCategory(
  category: string | null,
): CategoryFilter {
  const value = String(
    category ?? "",
  )
    .trim()
    .toLowerCase();

  switch (value) {
    case "college":
      return "College";

    case "work":
      return "Work";

    case "payment":
      return "Payment";

    case "event":
      return "Event";

    case "personal":
      return "Personal";

    default:
      return "Personal";
  }
}

function normalizePriority(
  priority: string | null,
): PriorityFilter {
  const value = String(
    priority ?? "",
  )
    .trim()
    .toLowerCase();

  switch (value) {
    case "high":
      return "High";

    case "medium":
      return "Medium";

    case "low":
      return "Low";

    default:
      return "all";
  }
}

function formatTime(
  dateValue: string | null,
) {
  if (!dateValue) return "";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  const now = new Date();

  const sameDay =
    date.getDate() ===
      now.getDate() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getFullYear() ===
      now.getFullYear();

  if (sameDay) {
    return date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    );
  }

  return date.toLocaleDateString(
    "en-IN",
    {
      month: "short",
      day: "numeric",
    },
  );
}

function formatDue(
  deadline: string | null,
) {
  if (!deadline) return null;

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  const now = new Date();

  const sameDay =
    date.getDate() ===
      now.getDate() &&
    date.getMonth() ===
      now.getMonth() &&
    date.getFullYear() ===
      now.getFullYear();

  if (sameDay) {
    return `Due today · ${date.toLocaleTimeString(
      "en-IN",
      {
        hour: "numeric",
        minute: "2-digit",
      },
    )}`;
  }

  return `Due ${date.toLocaleDateString(
    "en-IN",
    {
      weekday: "short",
      month: "short",
      day: "numeric",
    },
  )} · ${date.toLocaleTimeString(
    "en-IN",
    {
      hour: "numeric",
      minute: "2-digit",
    },
  )}`;
}

function getPreview(
  email: Email,
) {
  if (email.summary) {
    return email.summary;
  }

  if (email.body) {
    const cleanBody =
      email.body
        .replace(/\s+/g, " ")
        .trim();

    if (
      cleanBody.length > 120
    ) {
      return `${cleanBody.slice(
        0,
        120,
      )}...`;
    }

    return cleanBody;
  }

  return "No preview available.";
}

function InboxPage() {
  const tasks = useTasks();

  const [emails, setEmails] =
    useState<Email[]>([]);

  const [scanStats, setScanStats] =
    useState<ScanStats>({
      scanned: 0,
      relevant: 0,
      filtered: 0,
    });

  const [lastScan, setLastScan] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  const [refreshing, setRefreshing] =
    useState(false);

  const [q, setQ] =
    useState("");

  /*
   * Main filter.
   */
  const [filter, setFilter] =
    useState<MainFilter>("all");

  /*
   * Category filter.
   */
  const [
    categoryFilter,
    setCategoryFilter,
  ] =
    useState<CategoryFilter>("all");

  /*
   * Priority filter.
   */
  const [
    priorityFilter,
    setPriorityFilter,
  ] =
    useState<PriorityFilter>("all");

  /*
   * Dropdown visibility.
   */
  const [
    categoryOpen,
    setCategoryOpen,
  ] = useState(false);

  const [
    priorityOpen,
    setPriorityOpen,
  ] = useState(false);

  useEffect(() => {
    let mounted = true;
    let requestId = 0;

    let channel:
      | ReturnType<
          typeof supabase.channel
        >
      | null = null;

    function clearInbox() {
      if (!mounted) {
        return;
      }

      setEmails([]);

      setScanStats({
        scanned: 0,
        relevant: 0,
        filtered: 0,
      });

      setLastScan(null);
    }

    async function loadInbox(
      showLoader = true,
      expectedGmail?: string | null,
    ) {
      const currentRequestId =
        ++requestId;

      try {
        if (showLoader) {
          setLoading(true);
        } else {
          setRefreshing(true);
        }

        const {
          data: { user },
        } =
          await supabase.auth.getUser();

        if (
          !mounted ||
          currentRequestId !==
            requestId
        ) {
          return;
        }

        if (!user) {
          clearInbox();
          return;
        }

        const selectedGmail =
          expectedGmail ??
          getSelectedGmail();

        if (!selectedGmail) {
          clearInbox();
          return;
        }

        /*
         * Load ONLY emails belonging
         * to the selected Gmail account.
         */
        const {
          data: emailData,
          error: emailError,
        } =
          await supabase
            .from("emails")
            .select(`
              id,
              sender,
              subject,
              body,
              received_at,
              relevant,
              category,
              priority,
              status,
              deadline,
              summary,
              relevance_reason,
              gmail_email
            `)
            .eq(
              "user_id",
              user.id,
            )
            .eq(
              "gmail_email",
              selectedGmail,
            )
            .eq(
              "relevant",
              true,
            )
            .order(
              "received_at",
              {
                ascending: false,
              },
            );

        /*
         * Ignore stale request.
         */
        if (
          !mounted ||
          currentRequestId !==
            requestId ||
          getSelectedGmail() !==
            selectedGmail
        ) {
          return;
        }

        if (emailError) {
          console.error(
            "Failed to load emails:",
            emailError,
          );

          setEmails([]);
        } else {
          setEmails(
            emailData ?? [],
          );
        }

        /*
         * Scan history.
         */
        const {
          data: scan,
          error: scanError,
        } =
          await supabase
            .from("scan_history")
            .select(
              "scanned_count, relevant_count, filtered_count, scanned_at",
            )
            .eq(
              "user_id",
              user.id,
            )
            .order(
              "scanned_at",
              {
                ascending: false,
              },
            )
            .limit(1)
            .maybeSingle();

        if (
          !mounted ||
          currentRequestId !==
            requestId ||
          getSelectedGmail() !==
            selectedGmail
        ) {
          return;
        }

        if (scanError) {
          console.error(
            "Failed to load scan history:",
            scanError,
          );
        }

        if (scan) {
          setScanStats({
            scanned:
              scan.scanned_count ??
              0,

            relevant:
              scan.relevant_count ??
              0,

            filtered:
              scan.filtered_count ??
              0,
          });

          setLastScan(
            scan.scanned_at ??
              null,
          );
        } else {
          setScanStats({
            scanned: 0,
            relevant: 0,
            filtered: 0,
          });

          setLastScan(null);
        }
      } catch (error) {
        if (
          mounted &&
          currentRequestId ===
            requestId
        ) {
          console.error(
            "Inbox loading error:",
            error,
          );
        }
      } finally {
        if (
          mounted &&
          currentRequestId ===
            requestId
        ) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    }

    void loadInbox(
      true,
      getSelectedGmail(),
    );

    function handleGmailChanged() {
      /*
       * Invalidate previous request.
       */
      requestId++;

      const newGmail =
        getSelectedGmail();

      /*
       * Clear old account data.
       */
      clearInbox();

      setLoading(true);

      /*
       * Reset filters when
       * switching Gmail accounts.
       */
      setFilter("all");
      setCategoryFilter("all");
      setPriorityFilter("all");
      setQ("");

      setCategoryOpen(false);
      setPriorityOpen(false);

      void loadInbox(
        true,
        newGmail,
      );
    }

    window.addEventListener(
      "mailflow-gmail-changed",
      handleGmailChanged,
    );

    /*
     * Realtime emails.
     */
    channel =
      supabase
        .channel(
          "mailflow-inbox-realtime",
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "emails",
          },
          () => {
            const selectedGmail =
              getSelectedGmail();

            if (selectedGmail) {
              void loadInbox(
                false,
                selectedGmail,
              );
            }
          },
        )
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "scan_history",
          },
          () => {
            const selectedGmail =
              getSelectedGmail();

            if (selectedGmail) {
              void loadInbox(
                false,
                selectedGmail,
              );
            }
          },
        )
        .subscribe();

    return () => {
      mounted = false;
      requestId++;

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

  /*
   * Determine which emails
   * have an associated task.
   */
  const actionEmails =
    useMemo(() => {
      return emails.filter(
        (email) =>
          tasks.some(
            (task) => {
              const subject =
                email.subject ??
                "";

              return (
                task.from ===
                  email.sender ||
                task.title
                  .toLowerCase()
                  .includes(
                    subject.toLowerCase(),
                  ) ||
                subject
                  .toLowerCase()
                  .includes(
                    task.title.toLowerCase(),
                  )
              );
            },
          ),
      );
    }, [emails, tasks]);

  /*
   * MAIN FILTERED LIST.
   *
   * All filters are applied
   * together:
   *
   * Action/Info
   * +
   * Category
   * +
   * Priority
   * +
   * Search
   */
  const list = useMemo(() => {
    const search =
      q.trim().toLowerCase();

    return emails.filter(
      (email) => {
        const isAction =
          actionEmails.some(
            (actionEmail) =>
              actionEmail.id ===
              email.id,
          );

        /*
         * Action / Info.
         */
        const matchesMainFilter =
          filter === "all" ||
          (filter ===
            "action" &&
            isAction) ||
          (filter ===
            "info" &&
            !isAction);

        if (
          !matchesMainFilter
        ) {
          return false;
        }

        /*
         * Category.
         */
        const emailCategory =
          normalizeCategory(
            email.category,
          );

        const matchesCategory =
          categoryFilter ===
            "all" ||
          emailCategory ===
            categoryFilter;

        if (
          !matchesCategory
        ) {
          return false;
        }

        /*
         * Priority.
         */
        const emailPriority =
          normalizePriority(
            email.priority,
          );

        const matchesPriority =
          priorityFilter ===
            "all" ||
          emailPriority ===
            priorityFilter;

        if (
          !matchesPriority
        ) {
          return false;
        }

        /*
         * Search.
         */
        if (!search) {
          return true;
        }

        const searchable = [
          email.sender ?? "",
          email.subject ?? "",
          email.body ?? "",
          email.summary ?? "",
          email.category ?? "",
          email.priority ?? "",
          email.relevance_reason ??
            "",
          email.deadline ?? "",
        ]
          .join(" ")
          .toLowerCase();

        return searchable.includes(
          search,
        );
      },
    );
  }, [
    emails,
    actionEmails,
    filter,
    categoryFilter,
    priorityFilter,
    q,
  ]);

  const actionCount =
    actionEmails.length;

  const infoCount =
    emails.length -
    actionCount;

  const highPriorityCount =
    emails.filter((email) => {
      const isAction =
        actionEmails.some(
          (actionEmail) =>
            actionEmail.id ===
            email.id,
        );

      return (
        isAction &&
        normalizePriority(
          email.priority,
        ) === "High"
      );
    }).length;

  function findTaskId(
    email: Email,
  ) {
    const matchingTask =
      tasks.find((task) => {
        const subject =
          email.subject ?? "";

        return (
          task.from ===
            email.sender ||
          task.title
            .toLowerCase()
            .includes(
              subject.toLowerCase(),
            ) ||
          subject
            .toLowerCase()
            .includes(
              task.title.toLowerCase(),
            )
        );
      });

    return matchingTask?.id;
  }

  return (
    <AppShell
      eyebrow="Action-first workspace"
      title="Relevant inbox"
      action={
        <Link
          to="/scanning"
          className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold transition-colors hover:bg-accent"
        >
          <RefreshCw className="h-4 w-4" />
          Scan now
        </Link>
      }
    >
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-3xl">
            The messages worth your
            attention
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            MailFlow separates next
            actions from important
            context—without changing
            your Gmail inbox.
          </p>
        </div>

        <span className="flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-xs text-muted-foreground">
          <span className="h-1.5 w-1.5 rounded-full bg-brand" />

          {refreshing
            ? "Updating..."
            : "Live"}{" "}
          · {scanStats.scanned}{" "}
          scanned
        </span>
      </div>

      <section className="rounded-2xl bg-card p-5 shadow-sm">
        <label className="flex items-center gap-3 rounded-xl border px-4 py-3">
          <Search className="h-4 w-4 text-muted-foreground" />

          <input
            value={q}
            onChange={(event) =>
              setQ(
                event.target.value,
              )
            }
            placeholder="Search relevant emails, senders, actions, or deadlines"
            className="flex-1 bg-transparent text-sm outline-none"
          />
        </label>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
          {(
            [
              [
                "all",
                "All relevant",
                emails.length,
              ],
              [
                "action",
                "Action required",
                actionCount,
              ],
              [
                "info",
                "Important info",
                infoCount,
              ],
            ] as const
          ).map(
            ([
              key,
              label,
              count,
            ]) => (
              <button
                key={key}
                type="button"
                onClick={() =>
                  setFilter(key)
                }
                className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
                  filter === key
                    ? "bg-accent font-semibold"
                    : "hover:bg-accent/60"
                }`}
              >
                {label}

                <span className="text-xs text-muted-foreground">
                  {count}
                </span>
              </button>
            ),
          )}

          {/* CATEGORY FILTER */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setCategoryOpen(
                  (open) => !open,
                );

                setPriorityOpen(
                  false,
                );
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
                categoryFilter !==
                "all"
                  ? "bg-accent font-semibold"
                  : "hover:bg-accent/60"
              }`}
            >
              {categoryFilter ===
              "all"
                ? "Category"
                : categoryFilter}

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  categoryOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {categoryOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-44 overflow-hidden rounded-xl border bg-card p-1 shadow-lg">
                {[
                  "all",
                  "College",
                  "Work",
                  "Payment",
                  "Event",
                  "Personal",
                ].map(
                  (category) => (
                    <button
                      key={category}
                      type="button"
                      onClick={() => {
                        setCategoryFilter(
                          category as CategoryFilter,
                        );

                        setCategoryOpen(
                          false,
                        );
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        categoryFilter ===
                        category
                          ? "bg-accent font-semibold"
                          : "hover:bg-accent/60"
                      }`}
                    >
                      {category ===
                      "all"
                        ? "All categories"
                        : category}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {/* PRIORITY FILTER */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setPriorityOpen(
                  (open) => !open,
                );

                setCategoryOpen(
                  false,
                );
              }}
              className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 transition-colors ${
                priorityFilter !==
                "all"
                  ? "bg-accent font-semibold"
                  : "hover:bg-accent/60"
              }`}
            >
              {priorityFilter ===
              "all"
                ? "Priority"
                : priorityFilter}

              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${
                  priorityOpen
                    ? "rotate-180"
                    : ""
                }`}
              />
            </button>

            {priorityOpen && (
              <div className="absolute left-0 top-full z-50 mt-2 min-w-40 overflow-hidden rounded-xl border bg-card p-1 shadow-lg">
                {[
                  "all",
                  "High",
                  "Medium",
                  "Low",
                ].map(
                  (priority) => (
                    <button
                      key={priority}
                      type="button"
                      onClick={() => {
                        setPriorityFilter(
                          priority as PriorityFilter,
                        );

                        setPriorityOpen(
                          false,
                        );
                      }}
                      className={`block w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                        priorityFilter ===
                        priority
                          ? "bg-accent font-semibold"
                          : "hover:bg-accent/60"
                      }`}
                    >
                      {priority ===
                      "all"
                        ? "All priorities"
                        : `${priority} priority`}
                    </button>
                  ),
                )}
              </div>
            )}
          </div>

          {(categoryFilter !==
            "all" ||
            priorityFilter !==
              "all" ||
            filter !== "all" ||
            q.trim()) && (
            <button
              type="button"
              onClick={() => {
                setFilter("all");
                setCategoryFilter(
                  "all",
                );
                setPriorityFilter(
                  "all",
                );
                setQ("");
              }}
              className="rounded-lg px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              Clear filters
            </button>
          )}

          <span className="ml-auto text-xs text-muted-foreground">
            {refreshing
              ? "Updating..."
              : "Live sync enabled"}
          </span>
        </div>
      </section>

      <div className="grid gap-4 xl:grid-cols-[1fr_20rem]">
        <section className="rounded-2xl border bg-card">
          <div className="flex items-center justify-between border-b px-5 py-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-3">
              <input
                type="checkbox"
                aria-label="Select all messages"
              />

              {loading
                ? "Loading messages..."
                : `${list.length} relevant messages`}
            </span>

            <span className="flex items-center gap-2">
              {list.length > 0
                ? `1–${list.length} of ${list.length}`
                : "0 messages"}

              <ChevronLeft className="h-4 w-4 text-muted-foreground/50" />

              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
            </span>
          </div>

          <div className="divide-y">
            {list.map((email) => {
              const isAction =
                actionEmails.some(
                  (actionEmail) =>
                    actionEmail.id ===
                    email.id,
                );

              const taskId =
                findTaskId(email);

              return (
                <div
                  key={email.id}
                  className="flex gap-4 px-5 py-4 transition-colors hover:bg-surface/60"
                >
                  <input
                    type="checkbox"
                    className="mt-1"
                    aria-label={
                      email.subject ??
                      "Email"
                    }
                  />

                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between gap-2">
                      <p className="truncate text-sm font-semibold">
                        {email.sender ||
                          "Unknown sender"}
                      </p>

                      <span className="shrink-0 text-xs text-muted-foreground">
                        {formatTime(
                          email.received_at,
                        )}
                      </span>
                    </div>

                    <p className="mt-0.5 truncate">
                      {email.subject ||
                        "No subject"}
                    </p>

                    <p className="truncate text-sm text-muted-foreground">
                      {getPreview(
                        email,
                      )}
                    </p>

                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Chip strong>
                        {isAction
                          ? "Action required"
                          : "Important info"}
                      </Chip>

                      <Chip>
                        {normalizeCategory(
                          email.category,
                        )}
                      </Chip>

                      {email.priority && (
                        <Chip strong>
                          {normalizePriority(
                            email.priority,
                          )}{" "}
                          priority
                        </Chip>
                      )}

                      {email.deadline && (
                        <span className="flex items-center gap-1 text-xs">
                          <Clock className="h-3.5 w-3.5" />

                          {formatDue(
                            email.deadline,
                          )}
                        </span>
                      )}
                    </div>
                  </div>

                  {isAction &&
                  taskId ? (
                    <Link
                      to="/task"
                      search={{
                        id: taskId,
                      }}
                      className="h-8 shrink-0 rounded-lg bg-surface p-2 transition-colors hover:bg-accent"
                      aria-label="Open task"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  ) : (
                    <div className="hidden h-8 items-center gap-2 sm:flex">
                      <Eye className="h-4 w-4 text-muted-foreground" />

                      <span className="rounded-full border px-2 py-0.5 text-xs">
                        Important info
                      </span>
                    </div>
                  )}
                </div>
              );
            })}

            {!loading &&
              list.length === 0 && (
                <div className="p-10 text-center">
                  <MailFlowEmptyState
                    hasSearch={Boolean(
                      q.trim(),
                    )}
                    hasEmails={
                      emails.length > 0
                    }
                  />
                </div>
              )}
          </div>
        </section>

        <div className="space-y-4">
          <section className="rounded-2xl bg-ink p-5 text-ink-foreground">
            <div className="flex justify-between text-xs">
              <span className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-3.5 w-3.5" />
                SCAN SUMMARY
              </span>

              <span className="text-ink-muted">
                {lastScan
                  ? new Date(
                      lastScan,
                    ).toLocaleTimeString(
                      "en-IN",
                      {
                        hour: "numeric",
                        minute:
                          "2-digit",
                      },
                    )
                  : "No scan"}
              </span>
            </div>

            <div className="mt-4 grid grid-cols-2">
              <div>
                <p className="text-3xl">
                  {actionCount}
                </p>

                <p className="text-xs text-ink-muted">
                  Actions
                </p>
              </div>

              <div>
                <p className="text-3xl">
                  {infoCount}
                </p>

                <p className="text-xs text-ink-muted">
                  Info
                </p>
              </div>
            </div>

            <p className="mt-4 rounded-lg bg-ink-soft p-3 text-sm">
              •{" "}
              {highPriorityCount}{" "}
              high-priority{" "}
              {highPriorityCount ===
              1
                ? "action"
                : "actions"}{" "}
              need attention.
            </p>
          </section>

          <section className="rounded-2xl border bg-card p-5">
            <h3 className="font-semibold">
              Why this inbox is
              focused
            </h3>

            <p className="mt-3 flex gap-3 text-sm text-muted-foreground">
              <ListFilter className="h-4 w-4 shrink-0" />

              Promotions and generic
              newsletters are hidden
              here, but never deleted,
              archived, or changed in
              Gmail.
            </p>

            <p className="mt-3 text-sm text-muted-foreground">
              {scanStats.filtered}{" "}
              low-relevance emails
              filtered in the latest
              scan.
            </p>

            <p className="mt-3 text-sm text-muted-foreground">
              MailFlow keeps the
              original Gmail messages
              untouched.
            </p>

            <Link
              to="/settings"
              className="mt-4 block w-full rounded-xl border py-2.5 text-center text-sm font-semibold transition-colors hover:bg-accent"
            >
              Review settings
            </Link>
          </section>
        </div>
      </div>
    </AppShell>
  );
}

function MailFlowEmptyState({
  hasSearch,
  hasEmails,
}: {
  hasSearch: boolean;
  hasEmails: boolean;
}) {
  if (hasSearch) {
    return (
      <>
        <Search className="mx-auto h-8 w-8 text-muted-foreground" />

        <p className="mt-3 text-sm font-semibold">
          No matching messages
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Try a different search term
          or clear the search.
        </p>
      </>
    );
  }

  if (hasEmails) {
    return (
      <>
        <ListFilter className="mx-auto h-8 w-8 text-muted-foreground" />

        <p className="mt-3 text-sm font-semibold">
          No messages match this
          filter
        </p>

        <p className="mt-1 text-sm text-muted-foreground">
          Try changing the category,
          priority, or action filter.
        </p>
      </>
    );
  }

  return (
    <>
      <Sparkles className="mx-auto h-8 w-8 text-muted-foreground" />

      <p className="mt-3 text-sm font-semibold">
        Your focused inbox is empty
      </p>

      <p className="mt-1 text-sm text-muted-foreground">
        Scan your Gmail to find
        relevant messages and turn
        them into clear actions.
      </p>
    </>
  );
}