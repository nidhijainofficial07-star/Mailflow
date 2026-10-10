
import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { ArrowLeft, Clock, Mail, Sparkles } from "lucide-react";
import { AppShell, Chip } from "@/components/AppShell";
import { supabase } from "@/lib/supabase";

type EmailDetails = {
  id: string;
  sender: string | null;
  subject: string | null;
  body: string | null;
  received_at: string | null;
  category: string | null;
  priority: string | null;
  deadline: string | null;
  summary: string | null;
  relevance_reason: string | null;
  gmail_email: string | null;
};

export const Route = createFileRoute("/email")({
  validateSearch: (search: Record<string, unknown>) => ({
id: typeof search["id"] === "string" ? search["id"] : "",  }),
  component: EmailDetailPage,
});

function EmailDetailPage() {
  const { id } = Route.useSearch();
  const [email, setEmail] = useState<EmailDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function loadEmail() {
      setLoading(true);
      setError("");

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        if (active) {
          setError("Please sign in to view this email.");
          setLoading(false);
        }
        return;
      }

      if (!id) {
        if (active) {
          setError("Email ID is missing.");
          setLoading(false);
        }
        return;
      }

      const { data, error: emailError } = await supabase
        .from("emails")
        .select(
          "id, sender, subject, body, received_at, category, priority, deadline, summary, relevance_reason, gmail_email",
        )
        .eq("id", id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;

      if (emailError) {
        console.error("Failed to load email:", emailError);
        setError("Could not load this email. Please try again.");
      } else if (!data) {
        setError("This email was not found or you don't have access to it.");
      } else {
        setEmail(data as EmailDetails);
      }

      setLoading(false);
    }

    void loadEmail();

    return () => {
      active = false;
    };
  }, [id]);

  return (
    <AppShell
      eyebrow="Relevant inbox"
      title={email?.subject || "Email details"}
      action={
        <Link
          to="/inbox"
          className="flex items-center gap-2 rounded-xl border bg-background px-4 py-2 text-sm font-semibold hover:bg-accent"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to inbox
        </Link>
      }
    >
      {loading ? (
        <div className="rounded-2xl border bg-card p-8 text-center text-muted-foreground">
          Loading email...
        </div>
      ) : error ? (
        <div className="rounded-2xl border bg-card p-8">
          <p className="font-semibold">{error}</p>
          <Link to="/inbox" className="mt-4 inline-block text-sm underline">
            Return to inbox
          </Link>
        </div>
      ) : email ? (
        <div className="space-y-4">
          <section className="rounded-2xl border bg-card p-6">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-accent p-3">
                <Mail className="h-5 w-5" />
              </div>

              <div className="min-w-0 flex-1">
                <h2 className="break-words text-xl font-semibold">
                  {email.subject || "No subject"}
                </h2>
                <p className="mt-2 break-words text-sm text-muted-foreground">
                  From: {email.sender || "Unknown sender"}
                </p>
                {email.gmail_email && (
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    Received in: {email.gmail_email}
                  </p>
                )}
                {email.received_at && (
                  <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" />
                    {new Date(email.received_at).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              <Chip>Important info</Chip>
              {email.category && <Chip>{email.category}</Chip>}
              {email.priority && <Chip>{email.priority} priority</Chip>}
            </div>
          </section>

          {(email.summary || email.relevance_reason) && (
            <section className="rounded-2xl border bg-card p-6">
              <h3 className="flex items-center gap-2 font-semibold">
                <Sparkles className="h-4 w-4" />
                AI insights
              </h3>

              {email.summary && (
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6">
                  {email.summary}
                </p>
              )}

              {email.relevance_reason && (
                <p className="mt-3 text-sm text-muted-foreground">
                  Why it matters: {email.relevance_reason}
                </p>
              )}

              {email.deadline && (
                <p className="mt-3 text-sm">
                  Deadline: {new Date(email.deadline).toLocaleString("en-IN")}
                </p>
              )}
            </section>
          )}

          <section className="rounded-2xl border bg-card p-6">
            <h3 className="font-semibold">Email content</h3>
            <div className="mt-4 whitespace-pre-wrap break-words text-sm leading-7">
              {email.body?.trim() || "No email body is available."}
            </div>
          </section>

          <p className="text-xs text-muted-foreground">
            This is a read-only view. MailFlow does not modify your Gmail message.
          </p>
        </div>
      ) : null}
    </AppShell>
  );
}