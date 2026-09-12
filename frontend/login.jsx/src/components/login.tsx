import { useState, useId } from "react";
import { Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5a4.7 4.7 0 0 1-2 3.1l3.2 2.5c1.9-1.7 3-4.3 3-7.4 0-.7-.1-1.4-.2-2.1H12z"
      />
      <path
        fill="#34A853"
        d="M6.6 14.3l-.7.6-2.5 2A9 9 0 0 0 12 21c2.4 0 4.5-.8 6-2.2l-3.2-2.5c-.8.6-1.9.9-2.8.9-2.3 0-4.3-1.5-5-3.6z"
      />
      <path
        fill="#FBBC05"
        d="M3.4 7.1A8.9 8.9 0 0 0 2.4 12c0 1.5.4 2.9 1 4.1l3.2-2.5a5.4 5.4 0 0 1 0-3.4L3.4 7.1z"
      />
      <path
        fill="#4285F4"
        d="M12 6.6c1.3 0 2.5.5 3.4 1.3l2.6-2.6A9 9 0 0 0 3.4 7.1l3.2 2.5c.7-2.1 2.7-3 5.4-3z"
      />
    </svg>
  );
}

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailError, setEmailError] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [formError, setFormError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const emailId = useId();
  const passwordId = useId();

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError("");

    const nextEmailError =
      !email.trim() || !EMAIL_REGEX.test(email)
        ? "Please enter a valid email address."
        : "";
    const nextPasswordError = !password ? "Password is required." : "";

    setEmailError(nextEmailError);
    setPasswordError(nextPasswordError);
    if (nextEmailError || nextPasswordError) return;

    setIsLoading(true);

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        setFormError("Invalid email or password");
        setIsLoading(false);
        return;
      }

      const data = await response.json();
      const token = data?.token ?? data?.access_token ?? data?.jwt;

      if (!token) {
        setFormError("Unable to complete sign in. Please try again.");
        setIsLoading(false);
        return;
      }

      sessionStorage.setItem("auth_token", token);
      window.location.href = "/dashboard";
    } catch {
      setFormError("Unable to reach the sign-in service. Please try again.");
      setIsLoading(false);
    }
  };

  const fieldClass =
    "h-12 w-full rounded-xl border border-input bg-card px-4 text-[0.9375rem] text-foreground transition-colors duration-200 placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-ring/25";

  return (
    <main className="flex min-h-screen w-full items-center justify-center overflow-x-hidden bg-background px-5 py-10 sm:px-6">
      <div className="w-full max-w-[27rem]">
        <div className="rounded-2xl border border-border bg-card px-6 py-9 sm:px-10 sm:py-11">
          <div className="flex flex-col items-center text-center">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <ShieldCheck className="h-5 w-5" aria-hidden="true" />
            </div>
            <h1 className="mt-6 text-[1.75rem] font-semibold tracking-tight text-foreground sm:text-3xl">
              Sign in
            </h1>
            <p className="mt-2.5 text-sm text-muted-foreground">
              Sign in to continue to your account
            </p>
          </div>

          <form onSubmit={handleSubmit} noValidate className="mt-8">
            <div>
              <label
                htmlFor={emailId}
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Email
              </label>
              <input
                id={emailId}
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={emailError ? "true" : undefined}
                aria-describedby={emailError ? `${emailId}-error` : undefined}
                className={fieldClass}
                placeholder="Enter your email"
              />
              {emailError && (
                <p
                  id={`${emailId}-error`}
                  className="mt-2 text-xs text-destructive"
                >
                  {emailError}
                </p>
              )}
            </div>

            <div className="mt-4">
              <label
                htmlFor={passwordId}
                className="mb-2 block text-sm font-medium text-foreground"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id={passwordId}
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={passwordError ? "true" : undefined}
                  aria-describedby={
                    passwordError ? `${passwordId}-error` : undefined
                  }
                  className={`${fieldClass} pr-12`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus:outline-none focus:ring-2 focus:ring-ring/40"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden="true" />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden="true" />
                  )}
                </button>
              </div>
              {passwordError && (
                <p
                  id={`${passwordId}-error`}
                  className="mt-2 text-xs text-destructive"
                >
                  {passwordError}
                </p>
              )}
            </div>

            <div className="mt-3 flex justify-end">
              <a
                href="/forgot-password"
                className="rounded text-sm font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                Forgot password?
              </a>
            </div>

            {formError && (
              <p role="alert" className="mt-4 text-sm text-destructive">
                {formError}
              </p>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="mt-6 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-primary text-[0.9375rem] font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary/90 active:bg-primary/80 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              )}
              {isLoading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="my-6 flex items-center gap-4">
            <span className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-wide text-muted-foreground">
              OR
            </span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <button
            type="button"
            className="flex h-12 w-full items-center justify-center gap-3 rounded-xl border border-border bg-card text-[0.9375rem] font-medium text-foreground transition-colors duration-200 hover:bg-muted focus:outline-none focus:ring-2 focus:ring-ring/40"
          >
            <GoogleIcon className="h-5 w-5" />
            Continue with Google
          </button>

          <p className="mt-8 text-center text-sm text-muted-foreground">
            Don&apos;t have an account?{" "}
            <a
              href="/signup"
              className="rounded font-medium text-primary transition-colors hover:text-primary/80 focus:outline-none focus:ring-2 focus:ring-ring/40"
            >
              Sign up
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
