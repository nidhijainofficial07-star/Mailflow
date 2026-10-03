import { useSyncExternalStore } from "react";
import { supabase } from "./supabase";

export type Status =
  | "active"
  | "completed"
  | "dismissed";

export type Task = {
  id: string;
  title: string;
  from: string;
  email: string;
  initials: string;
  org: string;
  cat: string;
  pri: "High" | "Medium" | "Low";
  when: string;
  received: string;
  subject: string;
  analysis: string;
  why: string;
  action: string;
  deadline: string;
  deadlineRaw: string | null;
  reminder: string;
  body: string[];
  attachment?: string;
  resolvedOn?: string;
  status: Status;
};

const SELECTED_GMAIL_KEY =
  "mailflow_selected_gmail";

const EMPTY_TASKS: Task[] = [];

let snapshot: Task[] = [];
let loaded = false;
let loading = false;

let realtimeStarted = false;
let realtimeChannel:
  | ReturnType<typeof supabase.channel>
  | null = null;

let currentUserId: string | null = null;
let currentGmail: string | null = null;

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((listener) => {
    listener();
  });
}

function getSelectedGmail(): string | null {
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
  value: unknown,
): string {
  const category = String(
    value ?? "",
  )
    .trim()
    .toLowerCase();

  switch (category) {
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
  value: unknown,
): "High" | "Medium" | "Low" {
  const priority = String(
    value ?? "",
  )
    .trim()
    .toLowerCase();

  if (priority === "high") {
    return "High";
  }

  if (priority === "low") {
    return "Low";
  }

  return "Medium";
}

function formatDeadline(
  deadline: string | null,
): string {
  if (!deadline) {
    return "No deadline";
  }

  const date = new Date(deadline);

  if (Number.isNaN(date.getTime())) {
    return deadline;
  }

  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatReceived(
  dateValue: string | null,
): string {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getInitials(
  name: string,
): string {
  const cleaned = name.trim();

  if (!cleaned) {
    return "?";
  }

  const parts = cleaned
    .split(/\s+/)
    .filter(Boolean);

  if (parts.length === 1) {
    return (
      parts[0]
        ?.slice(0, 2)
        .toUpperCase() ?? "?"
    );
  }

  const first =
    parts.at(0) ?? "";

  const last =
    parts.at(-1) ?? "";

  return (
    (
      first.charAt(0) +
      last.charAt(0)
    ).toUpperCase() || "?"
  );
}

function mapTask(
  row: any,
  email: any,
): Task {
  const sender = String(
    email?.sender ||
      "MailFlow",
  );

  const subject = String(
    email?.subject ||
      row.title ||
      "MailFlow task",
  );

  const body = String(
    email?.body ||
      row.description ||
      "",
  );

  /*
   * Normalize task status.
   */
  const status: Status =
    row.status === "dismissed"
      ? "dismissed"
      : row.completed === true ||
          row.status === "completed"
        ? "completed"
        : "active";

  /*
   * Normalize priority from Supabase.
   *
   * Examples:
   * HIGH   -> High
   * high   -> High
   * High   -> High
   * medium -> Medium
   * LOW    -> Low
   */
  const priority =
    normalizePriority(
      row.priority,
    );

  /*
   * Normalize category from Supabase.
   *
   * Examples:
   * college -> College
   * WORK    -> Work
   * payment -> Payment
   */
  const category =
    normalizeCategory(
      row.category,
    );

  const deadlineRaw =
    row.deadline
      ? String(row.deadline)
      : null;

  return {
    id: String(row.id),

    title: String(
      row.title ||
        "Untitled task",
    ),

    from: sender,

    email: sender,

    initials:
      getInitials(sender),

    /*
     * Organization shown in the UI.
     * Using category here keeps the
     * existing UI compatible.
     */
    org: category,

    /*
     * Actual category.
     */
    cat: category,

    /*
     * Normalized priority.
     */
    pri: priority,

    when:
      formatDeadline(
        deadlineRaw,
      ),

    received:
      formatReceived(
        email?.received_at
          ? String(
              email.received_at,
            )
          : null,
      ),

    subject,

    analysis: String(
      row.description ||
        "Task extracted from your email.",
    ),

    why:
      priority === "High"
        ? "This task was marked high priority."
        : "This task was identified from a relevant email.",

    action: String(
      row.title ||
        "Complete this task.",
    ),

    deadline:
      formatDeadline(
        deadlineRaw,
      ),

    deadlineRaw,

    reminder: "",

    body: body.trim()
      ? [body]
      : [],

    status,

    resolvedOn:
      status === "completed"
        ? String(
            row.updated_at ||
              row.created_at ||
              "",
          )
        : undefined,
  };
}

async function loadTasks() {
  if (loading) {
    return;
  }

  loading = true;

  try {
    const {
      data: {
        user,
      },
      error: userError,
    } =
      await supabase.auth.getUser();

    if (
      userError ||
      !user
    ) {
      snapshot = [];
      loaded = true;

      currentUserId = null;
      currentGmail = null;

      notify();

      return;
    }

    const selectedGmail =
      getSelectedGmail();

    currentUserId =
      user.id;

    currentGmail =
      selectedGmail;

    /*
     * No Gmail account selected.
     */
    if (!selectedGmail) {
      snapshot = [];
      loaded = true;

      notify();

      return;
    }

    /*
     * STEP 1
     *
     * Get emails ONLY for the
     * currently selected Gmail account.
     */
    const {
      data: accountEmails,
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
          gmail_email
        `)
        .eq(
          "user_id",
          user.id,
        )
        .eq(
          "gmail_email",
          selectedGmail,
        );

    if (emailError) {
      console.error(
        "Failed to load account emails:",
        emailError,
      );

      snapshot = [];
      loaded = true;

      notify();

      return;
    }

    /*
     * This Gmail account has
     * no emails yet.
     */
    if (
      !accountEmails ||
      accountEmails.length === 0
    ) {
      snapshot = [];
      loaded = true;

      notify();

      startRealtime(
        user.id,
      );

      return;
    }

    /*
     * Get IDs of emails belonging
     * to the selected Gmail account.
     */
    const emailIds =
      accountEmails.map(
        (email) =>
          String(email.id),
      );

    /*
     * STEP 2
     *
     * Get tasks connected ONLY
     * to those email IDs.
     */
    const {
      data: taskRows,
      error: taskError,
    } =
      await supabase
        .from("tasks")
        .select("*")
        .eq(
          "user_id",
          user.id,
        )
        .in(
          "email_id",
          emailIds,
        )
        .order(
          "deadline",
          {
            ascending: true,
            nullsFirst: false,
          },
        );

    if (taskError) {
      console.error(
        "Failed to load tasks:",
        taskError,
      );

      snapshot = [];
      loaded = true;

      notify();

      return;
    }

    /*
     * Map email ID -> email.
     */
    const emailMap =
      new Map(
        accountEmails.map(
          (email) => [
            String(email.id),
            email,
          ],
        ),
      );

    /*
     * Convert Supabase rows
     * into MailFlow Task objects.
     */
    snapshot =
      (taskRows ?? [])
        .map((row) => {
          const email =
            emailMap.get(
              String(
                row.email_id,
              ),
            );

          if (!email) {
            return null;
          }

          return mapTask(
            row,
            email,
          );
        })
        .filter(
          (
            task,
          ): task is Task =>
            task !== null,
        );

    /*
     * Debug information.
     */
    console.log(
      "MAILFLOW TASK DEBUG",
      {
        selectedGmail,
        accountEmails:
          accountEmails.length,
        emailIds:
          emailIds.length,
        taskRows:
          taskRows?.length ?? 0,
        mappedTasks:
          snapshot.length,
        categories:
          snapshot.map(
            (task) =>
              task.cat,
          ),
        priorities:
          snapshot.map(
            (task) =>
              task.pri,
          ),
      },
    );

    loaded = true;

    notify();

    startRealtime(
      user.id,
    );
  } catch (error) {
    console.error(
      "Task loading error:",
      error,
    );
  } finally {
    loading = false;
  }
}

function startRealtime(
  userId: string,
) {
  /*
   * Already listening for
   * this user.
   */
  if (
    realtimeStarted &&
    currentUserId === userId
  ) {
    return;
  }

  /*
   * Remove old channel.
   */
  if (realtimeChannel) {
    void supabase.removeChannel(
      realtimeChannel,
    );

    realtimeChannel =
      null;
  }

  realtimeStarted = true;

  realtimeChannel =
    supabase
      .channel(
        `mailflow-tasks-${userId}`,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "tasks",
          filter:
            `user_id=eq.${userId}`,
        },
        () => {
          void refreshTasks();
        },
      )
      .subscribe(
        (status) => {
          if (
            status ===
            "CHANNEL_ERROR"
          ) {
            console.error(
              "Task realtime connection failed.",
            );
          }
        },
      );
}

async function refreshTasks() {
  loaded = false;

  await loadTasks();
}

export function setStatus(
  id: string,
  status: Status,
) {
  void updateTaskStatus(
    id,
    status,
  );
}

async function updateTaskStatus(
  id: string,
  status: Status,
) {
  try {
    const {
      data: {
        user,
      },
    } =
      await supabase.auth.getUser();

    if (!user) {
      console.error(
        "No logged-in user found.",
      );

      return;
    }

    const completed =
      status === "completed";

    const {
      error,
    } =
      await supabase
        .from("tasks")
        .update({
          completed,

          status:
            status ===
            "dismissed"
              ? "dismissed"
              : completed
                ? "completed"
                : "pending",
        })
        .eq(
          "id",
          id,
        )
        .eq(
          "user_id",
          user.id,
        );

    if (error) {
      console.error(
        "Failed to update task:",
        error,
      );

      return;
    }

    /*
     * Update UI immediately
     * without waiting for realtime.
     */
    snapshot =
      snapshot.map(
        (task): Task => {
          if (
            task.id !== id
          ) {
            return task;
          }

          return {
            ...task,

            status,

            resolvedOn:
              status ===
              "completed"
                ? new Date().toISOString()
                : undefined,
          };
        },
      );

    notify();
  } catch (error) {
    console.error(
      "Task status update error:",
      error,
    );
  }
}

function handleGmailChanged() {
  const newGmail =
    getSelectedGmail();

  /*
   * Nothing changed.
   */
  if (
    newGmail === currentGmail
  ) {
    return;
  }

  /*
   * Clear old account's data
   * immediately.
   */
  snapshot = [];

  loaded = false;
  loading = false;

  currentGmail =
    newGmail;

  notify();

  /*
   * Load the newly selected
   * Gmail account.
   */
  void loadTasks();
}

if (
  typeof window !==
  "undefined"
) {
  window.addEventListener(
    "mailflow-gmail-changed",
    handleGmailChanged,
  );
}

export function useTasks(): Task[] {
  const tasks =
    useSyncExternalStore(
      (callback) => {
        listeners.add(
          callback,
        );

        return () => {
          listeners.delete(
            callback,
          );
        };
      },

      /*
       * Client snapshot.
       */
      () => snapshot,

      /*
       * IMPORTANT:
       * Do NOT use () => [] here.
       *
       * A new array on every call
       * causes the React warning:
       * "The result of getServerSnapshot
       * should be cached..."
       */
      () => EMPTY_TASKS,
    );

  /*
   * Start loading once.
   */
  if (
    !loaded &&
    !loading
  ) {
    void loadTasks();
  }

  return tasks;
}

export function exportCsv(
  tasks: Task[],
) {
  const rows = [
    [
      "Task",
      "From",
      "Category",
      "Priority",
      "Status",
      "Deadline",
    ],

    ...tasks.map(
      (task) => [
        task.title,
        task.from,
        task.cat,
        task.pri,
        task.status,
        task.deadline,
      ],
    ),
  ];

  const csv =
    rows
      .map((row) =>
        row
          .map(
            (cell) =>
              `"${String(
                cell,
              ).replace(
                /"/g,
                '""',
              )}"`,
          )
          .join(","),
      )
      .join("\n");

  const url =
    URL.createObjectURL(
      new Blob([csv], {
        type: "text/csv",
      }),
    );

  const a =
    document.createElement(
      "a",
    );

  a.href = url;

  a.download =
    "mailflow-history.csv";

  a.click();

  URL.revokeObjectURL(
    url,
  );
}