import { createFileRoute, Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import {
  Workflow,
  Sparkles,
  Mail,
  Layers,
  Eye,
  ShieldCheck,
  ArrowRight,
  ChevronRight,
  ListChecks,
  CalendarDays,
  FileText,
  Tag,
  History,
  ThumbsUp,
  Lock,
  UserCheck,
  Quote,
  Plus,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "MailFlow — Turn your inbox into a clear action plan.",
      },
      {
        name: "description",
        content:
          "MailFlow finds assignments, interviews, payments, and deadlines in Gmail and puts the next action first.",
      },
      {
        property: "og:title",
        content: "MailFlow — AI email-to-action assistant",
      },
      {
        property: "og:description",
        content:
          "Turn the emails that matter into a clear plan. Read-only Gmail access.",
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
  component: Landing,
});

function Logo({ light = false }: { light?: boolean }) {
  return (
    <div className="flex items-center gap-2">
      <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary text-primary-foreground">
        <Workflow className="h-4 w-4" />
      </span>

      <span
        className={`text-lg ${light ? "text-ink-foreground" : ""}`}
      >
        MailFlow
      </span>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-semibold uppercase tracking-wide text-brand">
      {children}
    </p>
  );
}

function SectionHead({
  eyebrow,
  title,
  sub,
}: {
  eyebrow: string;
  title: string;
  sub: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>

      <h2 className="mt-3 text-3xl md:text-4xl">{title}</h2>

      <p className="mt-4 text-muted-foreground">{sub}</p>
    </div>
  );
}

function Pill({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full bg-secondary px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
      {children}
    </span>
  );
}

function TaskRow({
  t,
  s,
  when,
}: {
  t: string;
  s: string;
  when: string;
}) {
  return (
    <div className="flex items-center gap-3 border-b py-3 last:border-0">
      <span className="h-4 w-4 rounded border" />

      <div className="flex-1">
        <p className="text-sm">{t}</p>

        <p className="text-xs text-muted-foreground">{s}</p>
      </div>

      <Pill>{when}</Pill>

      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </div>
  );
}

function Landing() {
  return (
    <div className="min-h-screen bg-background font-sans text-foreground">
      <header className="sticky top-0 z-20 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
          <Logo />

          <nav className="hidden gap-8 text-sm text-muted-foreground md:flex">
            <a href="#how">How it works</a>
            <a href="#lives">For students</a>
            <a href="#lives">For work</a>
            <a href="#privacy">Privacy</a>
            <a href="#faq">FAQ</a>
          </nav>

          <div className="flex gap-2">
            <Link
              to="/login"
              className="rounded-lg border px-3 py-2 text-sm font-medium transition-colors hover:bg-accent"
            >
              Sign in
            </Link>

            <Link
              to="/connect"
              className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Continue with Google
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-ink text-ink-foreground">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-6 py-20 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-brand">
              <Sparkles className="h-3.5 w-3.5" />
              AI email-to-action assistant
            </p>

            <h1 className="mt-5 text-4xl leading-tight md:text-5xl">
              Your inbox is full. Your day shouldn't be.
            </h1>

            <p className="mt-5 text-ink-muted">
              MailFlow finds assignments, interview requests, payments,
              events, and deadlines—then puts the next action first.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                to="/connect"
                className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
              >
                <Mail className="h-4 w-4" />
                Continue with Google
              </Link>

              <a
                href="#how"
                className="rounded-lg bg-background px-4 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
              >
                See how it works
              </a>
            </div>

            <p className="mt-6 flex items-center gap-2 text-xs text-ink-muted">
              <ShieldCheck className="h-4 w-4 text-brand" />
              Read-only Gmail access · Never sends, edits, moves, archives, or
              deletes email
            </p>
          </div>

          <div className="rounded-2xl bg-card p-5 text-card-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <p className="flex items-center gap-2 text-sm font-semibold">
                <Sparkles className="h-4 w-4" />
                What should I do today?
              </p>

              <Pill>AI sorted</Pill>
            </div>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                ["Inbox", "connected"],
                ["AI", "relevance"],
                ["Tasks", "extracted"],
              ].map(([label, value], index) => (
                <div
                  key={label}
                  className={`rounded-xl p-3 ${
                    index === 0 ? "bg-surface" : "bg-accent"
                  }`}
                >
                  <p className="text-2xl">{label}</p>

                  <p className="text-xs text-muted-foreground">{value}</p>
                </div>
              ))}
            </div>

            <div className="mt-3">
              <TaskRow
                t="Submit assignment"
                s="College · Deadline extracted from email"
                when="Today"
              />

              <TaskRow
                t="Confirm interview time"
                s="Work · Response requested by email"
                when="Tomorrow"
              />

              <TaskRow
                t="Pay upcoming bill"
                s="Payment · Due date detected"
                when="Upcoming"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Problem */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead
            eyebrow="The inbox problem"
            title="Important work is buried inside ordinary email"
            sub="Campus updates, recruiting threads, bills, calendar changes, and newsletters all arrive in one stream. MailFlow separates the action from the noise without creating another inbox to manage."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              [
                Mail,
                "Deadlines hide in paragraphs",
                "A due date can sit halfway through a long message or attached PDF.",
              ],
              [
                Layers,
                "Everything looks equally urgent",
                "A promotion and an interview request receive the same visual weight in Gmail.",
              ],
              [
                Eye,
                "Rereading drains attention",
                "You repeatedly reopen threads just to remember what needs to happen next.",
              ],
            ].map(([Icon, title, description]) => (
              <Card
                key={title as string}
                Icon={Icon as LucideIcon}
                title={title as string}
                description={description as string}
              />
            ))}
          </div>
        </div>
      </section>

      {/* How */}
      <section id="how" className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead
            eyebrow="How MailFlow filters"
            title="From inbox noise to one clear action list"
            sub="MailFlow reads for relevance, extracts what needs doing, and orders the result by urgency, deadline, and impact."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-4">
            {[
              [
                "Scan for signal",
                "Reviews recent Gmail messages and identifies direct requests, meaningful updates, dates, and commitments.",
              ],
              [
                "Filter the noise",
                "Promotions and generic newsletters stay in Gmail but never clutter your MailFlow workspace.",
              ],
              [
                "Extract the action",
                "Turns email language into a concrete next step with source, category, priority, and deadline.",
              ],
              [
                "Build your day",
                "Ranks urgent work first and suggests calm reminders so nothing important slips through.",
              ],
            ].map(([title, description], index) => (
              <div
                key={title}
                className="rounded-2xl border bg-card p-5"
              >
                <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-xs text-primary-foreground">
                  {index + 1}
                </span>

                <p className="mt-4 font-semibold">{title}</p>

                <p className="mt-2 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-6 rounded-2xl bg-ink p-8 text-ink-foreground md:grid-cols-3">
            {[
              ["Inbox input", "Gmail", "Read-only messages"],
              ["Relevant context", "AI", "Important emails identified"],
              [
                "Actionable now",
                "Tasks",
                "Deadlines and next steps extracted",
              ],
            ].map(([eyebrow, title, description], index) => (
              <div
                key={eyebrow}
                className="flex items-center gap-4"
              >
                <div className="flex-1">
                  <p className="text-xs font-semibold uppercase text-ink-muted">
                    {eyebrow}
                  </p>

                  <p className="mt-2 text-4xl">{title}</p>

                  <p className="mt-2 text-xs text-ink-muted">
                    {description}
                  </p>
                </div>

                {index < 2 && (
                  <ArrowRight className="hidden h-5 w-5 text-ink-muted md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead
            eyebrow="Action-first by design"
            title="Know what to do—without living in your inbox"
            sub="MailFlow preserves the source context while shaping every relevant message into a calm, useful plan."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              [
                ListChecks,
                "Prioritized daily plan",
                "See the actions that matter today, ordered by deadline and impact.",
              ],
              [
                CalendarDays,
                "Deadline extraction",
                "Dates become visible reminders across college, work, payments, events, and life.",
              ],
              [
                FileText,
                "Original context",
                "Verify the summary against a read-only email excerpt whenever you need it.",
              ],
              [
                Tag,
                "Useful categories",
                "College, work, payment, event, and personal examples stay easy to scan.",
              ],
              [
                History,
                "Completion history",
                "Keep track of tasks you've completed and review your finished actions.",
              ],
              [
                ThumbsUp,
                "Clear action status",
                "See whether an email needs action or is simply important information.",
              ],
            ].map(([Icon, title, description]) => (
              <Card
                key={title as string}
                Icon={Icon as LucideIcon}
                title={title as string}
                description={description as string}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Privacy */}
      <section
        id="privacy"
        className="bg-ink py-20 text-ink-foreground"
      >
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-6 md:grid-cols-2">
          <div>
            <p className="flex items-center gap-2 text-xs font-semibold uppercase text-brand">
              <ShieldCheck className="h-4 w-4" />
              Read-only Gmail access
            </p>

            <h2 className="mt-4 text-3xl md:text-4xl">
              Your Gmail stays yours.
            </h2>

            <p className="mt-4 text-ink-muted">
              MailFlow can read relevant email content and metadata to identify
              actions. It cannot send, edit, move, archive, or delete messages.
              Filtered emails remain untouched in Gmail.
            </p>
          </div>

          <div className="space-y-4 rounded-2xl bg-ink-soft p-6">
          {[
  {
    Icon: Eye,
    title: "Read content only",
    description:
      "Classify relevance and summarize actions, dates, and context.",
  },
  {
    Icon: Lock,
    title: "No write permissions",
    description:
      "MailFlow has no ability to change anything in Gmail.",
  },
  {
    Icon: UserCheck,
    title: "You stay in control",
    description:
      "Disconnect your Gmail connection whenever you choose.",
  },
].map(({ Icon, title, description }) => (
  <div key={title} className="flex gap-4">
    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink">
      <Icon className="h-4 w-4" />
    </span>

    <div>
      <p className="text-sm font-semibold">{title}</p>
      <p className="text-sm text-ink-muted">{description}</p>
    </div>
  </div>
))}
          </div>
        </div>
      </section>

      {/* Lives */}
      <section id="lives" className="bg-surface py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead
            eyebrow="Built for full lives"
            title="From syllabus deadlines to client follow-ups"
            sub="MailFlow adapts to the commitments already arriving in your inbox."
          />

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            <LifeCard
              tag="For students"
              title="Keep college logistics from becoming homework."
              description="See assignments, advising notes, tuition payments, campus events, and internship replies in one prioritized plan."
              rows={[
                [
                  "Submit college assignment",
                  "Deadline detected · College",
                  "Today",
                ],
                [
                  "Register for upcoming course",
                  "Registration deadline · College",
                  "Tomorrow",
                ],

                [
                  "Pay upcoming college fee",
                  "Due date detected · Payment",
                  "Upcoming",
                ],
              ]}
            />

            <LifeCard
              tag="For professionals"
              title="Turn requests and follow-ups into momentum."
              description="Capture interview scheduling, project approvals, invoices, event RSVPs, and personal errands without inbox triage."
              rows={[
                [
                  "Confirm interview time",
                  "Response requested · Work",
                  "Today",
                ],
                [
                  "Review project approval request",
                  "Deadline detected · Work",
                  "Tomorrow",
                ],
                [
                  "RSVP to upcoming event",
                  "Event date detected · Event",
                  "Upcoming",
                ],
              ]}
            />
          </div>
        </div>
      </section>

      {/* Why MailFlow */}
      <section className="py-20">
        <div className="mx-auto max-w-6xl px-6">
          <SectionHead
            eyebrow="Why MailFlow"
            title="A calmer way to keep up"
            sub="MailFlow turns relevant emails into clear actions while keeping your original Gmail inbox untouched."
          />

          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              [
                "Turn important emails into clear next steps.",
                "Action-first workflow",
              ],
              [
                "Keep promotions and newsletters out of your focused workspace.",
                "Noise filtering",
              ],
              [
                "Your Gmail stays untouched with read-only access.",
                "Privacy by design",
              ],
            ].map(([quote, label]) => (
              <figure
                key={label}
                className="rounded-2xl border bg-card p-6"
              >
                <Quote className="h-5 w-5" />

                <blockquote className="mt-3">
                  “{quote}”
                </blockquote>

                <figcaption className="mt-4 text-xs font-semibold text-muted-foreground">
                  {label}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="bg-surface py-20">
        <div className="mx-auto max-w-3xl px-6">
          <SectionHead
            eyebrow="FAQ"
            title="Questions, answered plainly"
            sub="Everything you need to know before connecting Gmail."
          />

          <div className="mt-10 divide-y border-y">
            {[
              [
                "Does MailFlow change my Gmail inbox?",
                "No. Access is read-only. MailFlow cannot send, edit, move, archive, or delete email.",
              ],
              [
                "What happens to newsletters and promotions?",
                "They remain untouched in Gmail and are simply filtered from your focused MailFlow workspace.",
              ],
              [
                "How does MailFlow decide what matters?",
                "MailFlow uses AI to identify requests, deadlines, meaningful updates, and other emails that may require your attention. Promotions and generic newsletters are filtered from the MailFlow workspace.",
              ],
              [
                "Can I restore a completed or dismissed task?",
                "Yes. Completed & dismissed history lets you review tasks that have already been completed.",
              ],
              [
                "Can I disconnect Gmail?",
                "Yes. You can disconnect your Gmail connection when you choose. MailFlow uses read-only Gmail access and does not modify your messages.",
              ],
            ].map(([question, answer]) => (
              <details
                key={question}
                className="group py-5"
                open
              >
                <summary className="flex cursor-pointer list-none items-center justify-between font-semibold">
                  {question}

                  <Plus className="h-4 w-4 transition group-open:rotate-45" />
                </summary>

                <p className="mt-2 text-sm text-muted-foreground">
                  {answer}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-ink py-24 text-center text-ink-foreground">
        <Sparkles className="mx-auto h-6 w-6 text-brand" />

        <h2 className="mx-auto mt-4 max-w-xl text-4xl">
          Turn the emails that matter into a clear plan.
        </h2>

        <p className="mt-4 text-ink-muted">
          Sign in with Google and let MailFlow surface the next action—not
          another inbox.
        </p>

        <Link
          to="/connect"
          className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          <Mail className="h-4 w-4" />
          Continue with Google
        </Link>

        <p className="mt-5 text-xs text-ink-muted">
          Read-only access · Revoke anytime · Your data, your control
        </p>
      </section>

      <footer className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6 text-xs text-muted-foreground">
        <Logo />

        <span>© 2026 MailFlow · Privacy · Terms · Security</span>
      </footer>
    </div>
  );
}

function Card({
  Icon,
  title,
  description,
}: {
  Icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <span className="grid h-9 w-9 place-items-center rounded-lg bg-secondary">
        <Icon className="h-4 w-4" />
      </span>

      <p className="mt-5 font-semibold">{title}</p>

      <p className="mt-2 text-sm text-muted-foreground">{description}</p>
    </div>
  );
}

function LifeCard({
  tag,
  title,
  description,
  rows,
}: {
  tag: string;
  title: string;
  description: string;
  rows: string[][];
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <Pill>{tag}</Pill>

      <p className="mt-4 text-xl">{title}</p>

      <p className="mt-2 text-sm text-muted-foreground">
        {description}
      </p>

      <div className="mt-4">
        {rows.map(([action, detail, when]) => (
          <TaskRow
            key={action}
            t={action ?? ""}
            s={detail ?? ""}
            when={when ?? ""}
          />
        ))}
      </div>
    </div>
  );
}