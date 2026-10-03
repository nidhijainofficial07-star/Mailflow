import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { supabase } from "@/lib/supabase";
import { Workflow, Mail, Lock, User } from "lucide-react";

export const Route = createFileRoute("/login")({
  component: Login,
});

function Login() {
  const navigate = useNavigate();

  const [isSignUp, setIsSignUp] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "success">(
    "error",
  );

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (loading) return;

    setLoading(true);
    setMessage("");

    try {
      const trimmedEmail = email.trim();

      if (!trimmedEmail) {
        setMessageType("error");
        setMessage("Please enter your email address.");
        return;
      }

      if (password.length < 6) {
        setMessageType("error");
        setMessage("Password must be at least 6 characters.");
        return;
      }

      if (isSignUp) {
        if (!fullName.trim()) {
          setMessageType("error");
          setMessage("Please enter your name.");
          return;
        }

        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim(),
            },
          },
        });

        if (error) {
          setMessageType("error");
          setMessage(error.message);
          return;
        }

        if (!data.session) {
          setMessageType("success");
          setMessage(
            "Account created! Please check your email to confirm your account.",
          );
          return;
        }

        await navigate({
          to: "/today",
        });

        return;
      }

      const { data, error } =
        await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

      if (error) {
        setMessageType("error");
        setMessage(error.message);
        return;
      }

      if (!data.session) {
        setMessageType("error");
        setMessage("Login failed. Please try again.");
        return;
      }

      await navigate({
        to: "/today",
      });
    } catch (error) {
      console.error("Authentication error:", error);

      setMessageType("error");
      setMessage("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  function toggleMode() {
    setIsSignUp((current) => !current);
    setMessage("");
    setMessageType("error");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <div className="w-full max-w-md">
        <div className="text-center">
          <div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-foreground text-background">
            <Workflow className="h-7 w-7" />
          </div>

          <h1 className="mt-5 text-3xl font-semibold">MailFlow</h1>

          <p className="mt-2 text-muted-foreground">
            From Inbox to Action.
          </p>
        </div>

        <div className="mt-8 rounded-2xl border bg-card p-6 shadow-sm">
          <h2 className="text-xl font-semibold">
            {isSignUp ? "Create your account" : "Welcome back"}
          </h2>

          <p className="mt-1 text-sm text-muted-foreground">
            {isSignUp
              ? "Start turning your emails into actions."
              : "Sign in to continue to your MailFlow dashboard."}
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 space-y-4"
          >
            {isSignUp && (
              <div>
                <label
                  htmlFor="full-name"
                  className="text-sm font-medium"
                >
                  Full name
                </label>

                <div className="relative mt-2">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                  <input
                    id="full-name"
                    type="text"
                    value={fullName}
                    onChange={(event) =>
                      setFullName(event.target.value)
                    }
                    placeholder="Your name"
                    autoComplete="name"
                    className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 outline-none transition focus:ring-2 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="text-sm font-medium"
              >
                Email
              </label>

              <div className="relative mt-2">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) =>
                    setEmail(event.target.value)
                  }
                  placeholder="you@example.com"
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 outline-none transition focus:ring-2 focus:ring-primary"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="password"
                className="text-sm font-medium"
              >
                Password
              </label>

              <div className="relative mt-2">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />

                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(event) =>
                    setPassword(event.target.value)
                  }
                  placeholder="••••••••"
                  autoComplete={
                    isSignUp ? "new-password" : "current-password"
                  }
                  minLength={6}
                  required
                  className="w-full rounded-xl border bg-background py-3 pl-10 pr-4 outline-none transition focus:ring-2 focus:ring-primary"
                />
              </div>

              <p className="mt-1.5 text-xs text-muted-foreground">
                Minimum 6 characters.
              </p>
            </div>

            {message && (
              <div
                role="alert"
                className={`rounded-xl px-4 py-3 text-sm ${
                  messageType === "success"
                    ? "bg-secondary text-foreground"
                    : "bg-destructive/10 text-destructive"
                }`}
              >
                {message}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-foreground py-3 font-semibold text-background transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading
                ? isSignUp
                  ? "Creating account..."
                  : "Signing in..."
                : isSignUp
                  ? "Create account"
                  : "Sign in"}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {isSignUp
              ? "Already have an account?"
              : "Don't have an account?"}{" "}
            <button
              type="button"
              onClick={toggleMode}
              className="font-semibold text-foreground underline-offset-4 hover:underline"
            >
              {isSignUp ? "Sign in" : "Create one"}
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Your account is secured through Supabase authentication.
        </p>
      </div>
    </div>
  );
}