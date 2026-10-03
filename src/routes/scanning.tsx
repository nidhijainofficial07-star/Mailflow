import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  Workflow,
  Check,
  Loader2,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export const Route = createFileRoute("/scanning")({
  head: () => ({
    meta: [
      { title: "Scanning your inbox — MailFlow" },
      {
        name: "description",
        content:
          "MailFlow is reading your recent emails and building today's plan.",
      },
      {
        property: "og:title",
        content: "Scanning your inbox — MailFlow",
      },
      {
        property: "og:description",
        content:
          "MailFlow reads recent Gmail messages and turns relevant ones into actions.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Scanning,
});

const steps = [
  "Reading recent emails",
  "Filtering promotions & newsletters",
  "Finding deadlines and actions",
  "Prioritizing your day",
];

const SELECTED_GMAIL_KEY = "mailflow_selected_gmail";

type SavedEmail = {
  relevant?: boolean | null;
};

type ScanResponse = {
  success?: boolean;
  error?: string;
  message?: string;
  gmail_email?: string;
  scanned_count?: number;
  relevant_count?: number;
  filtered_count?: number;
  saved_emails?: SavedEmail[];
};

function Scanning() {
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const [stats, setStats] = useState({
    scanned: 0,
    relevant: 0,
    filtered: 0,
  });

  useEffect(() => {
    let cancelled = false;

    async function runScan() {
      try {
        setProgress(10);
        setCurrentStep(0);

        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          throw new Error("Please log in before scanning Gmail.");
        }

        const selectedGmail =
          window.localStorage.getItem(SELECTED_GMAIL_KEY);

        if (!selectedGmail) {
          throw new Error(
            "No Gmail account is selected. Please connect a Gmail account first.",
          );
        }

        if (cancelled) return;

        setProgress(25);
        setCurrentStep(1);

        const response = await fetch(
          "https://fwdcpjtmqipqnsapksbr.supabase.co/functions/v1/process-gmail",
          {
            method: "POST",
            headers: {
              Authorization: `Bearer ${session.access_token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              gmail_email: selectedGmail,
            }),
          },
        );

        let data: ScanResponse;

        try {
          data = await response.json();
        } catch {
          throw new Error(
            "The scan service returned an invalid response.",
          );
        }

        console.log("PROCESS GMAIL RESULT:", data);

        if (!response.ok || !data.success) {
          throw new Error(
            data.error ||
              data.message ||
              "Gmail scan failed.",
          );
        }

        if (cancelled) return;

        const savedEmails = data.saved_emails ?? [];

        const relevantFromEmails = savedEmails.filter(
          (email) => email.relevant === true,
        ).length;

        const filteredFromEmails = savedEmails.filter(
          (email) => email.relevant === false,
        ).length;

        setStats({
          scanned: data.scanned_count ?? 0,
          relevant:
            data.relevant_count ?? relevantFromEmails,
          filtered:
            data.filtered_count ?? filteredFromEmails,
        });

        setProgress(55);
        setCurrentStep(2);

        await new Promise((resolve) =>
          setTimeout(resolve, 500),
        );

        if (cancelled) return;

        setProgress(80);
        setCurrentStep(3);

        await new Promise((resolve) =>
          setTimeout(resolve, 500),
        );

        if (cancelled) return;

        setProgress(100);
        setCurrentStep(3);
        setDone(true);
      } catch (scanError) {
        console.error("Gmail scan error:", scanError);

        if (cancelled) return;

        setError(
          scanError instanceof Error
            ? scanError.message
            : "Something went wrong while scanning Gmail.",
        );
      }
    }

    void runScan();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="grid min-h-screen place-items-center bg-ink px-4 font-sans text-ink-foreground">
        <div className="w-full max-w-md text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-soft">
            <AlertCircle className="h-6 w-6" />
          </span>

          <h1 className="mt-6 text-3xl">
            Scan failed
          </h1>

          <p className="mt-3 text-sm text-ink-muted">
            {error}
          </p>

          <div className="mt-6 flex gap-3">
            <button
              onClick={() => {
                window.location.reload();
              }}
              className="flex-1 rounded-xl bg-ink-foreground py-3 font-semibold text-ink"
            >
              Try again
            </button>

            <Link
              to="/inbox"
              className="flex-1 rounded-xl bg-ink-soft py-3 font-semibold text-ink-foreground"
            >
              Back to inbox
            </Link>
          </div>

          <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-muted">
            <ShieldCheck className="h-4 w-4" />
            Read-only. MailFlow never deletes or sends email.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-ink px-4 font-sans text-ink-foreground">
      <div className="w-full max-w-md text-center">
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-ink-soft">
          <Workflow className="h-6 w-6" />
        </span>

        <h1 className="mt-6 text-3xl">
          {done
            ? "Your plan is ready"
            : "Scanning your inbox…"}
        </h1>

        <p className="mt-2 text-ink-muted">
          {done
            ? `${stats.scanned} emails scanned`
            : "MailFlow is processing your recent Gmail messages."}
        </p>

        <div className="mt-6 h-1.5 rounded-full bg-ink-soft">
          <div
            className="h-1.5 rounded-full bg-ink-foreground transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />
        </div>

        <ul className="mt-8 space-y-3 text-left">
          {steps.map((step, index) => (
            <li
              key={step}
              className={`flex items-center gap-3 rounded-xl bg-ink-soft px-4 py-3 text-sm ${
                index > currentStep && !done
                  ? "opacity-50"
                  : ""
              }`}
            >
              {index < currentStep || done ? (
                <Check className="h-4 w-4 text-brand" />
              ) : index === currentStep ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span className="h-4 w-4" />
              )}

              {step}
            </li>
          ))}
        </ul>

        {done && (
          <>
            <div className="mt-6 grid grid-cols-3 gap-2">
              <div className="rounded-xl bg-ink-soft p-3">
                <p className="text-xl font-semibold">
                  {stats.scanned}
                </p>
                <p className="text-xs text-ink-muted">
                  Scanned
                </p>
              </div>

              <div className="rounded-xl bg-ink-soft p-3">
                <p className="text-xl font-semibold">
                  {stats.relevant}
                </p>
                <p className="text-xs text-ink-muted">
                  Relevant
                </p>
              </div>

              <div className="rounded-xl bg-ink-soft p-3">
                <p className="text-xl font-semibold">
                  {stats.filtered}
                </p>
                <p className="text-xs text-ink-muted">
                  Filtered
                </p>
              </div>
            </div>

            <Link
              to="/today"
              className="mt-8 block rounded-xl bg-ink-foreground py-3 font-semibold text-ink"
            >
              See today's plan
            </Link>
          </>
        )}

        <p className="mt-8 flex items-center justify-center gap-2 text-xs text-ink-muted">
          <ShieldCheck className="h-4 w-4" />
          Read-only. MailFlow never deletes or sends email.
        </p>
      </div>
    </div>
  );
}