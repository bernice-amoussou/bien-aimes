"use client";

import { Eye, EyeOff, LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useId, useRef, useState, type FormEvent } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { FieldError, Input, Label } from "@/components/ui/field";
import { useI18n } from "@/lib/i18n/locale-provider";
import type { Dictionary } from "@/lib/i18n/dictionaries/fr";
import { getBrowserSupabase } from "@/lib/supabase/browser";
import { isSupabaseConfigured } from "@/lib/supabase/config";

type LoginErrors = Partial<
  Record<"email" | "password", Exclude<keyof Dictionary["login"]["errors"], "summary">>
>;
type AuthError = keyof Dictionary["login"]["authErrors"];

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function validate(email: string, password: string): LoginErrors {
  const errors: LoginErrors = {};
  if (!email.trim()) errors.email = "emailRequired";
  else if (!EMAIL_PATTERN.test(email.trim())) errors.email = "emailInvalid";
  if (!password) errors.password = "passwordRequired";
  return errors;
}

function mapAuthError(error: { code?: string; status?: number; message: string }): AuthError {
  if (error.code === "invalid_credentials") return "invalidCredentials";
  if (error.code === "email_not_confirmed") return "emailNotConfirmed";
  if (error.status === 429 || error.code === "over_request_rate_limit") return "rateLimited";
  if (error.status === 0 || /fetch|network/i.test(error.message)) return "network";
  return "unknown";
}

/** Destination après connexion : uniquement une page de l'administration. */
function nextPath(): string {
  const next = new URLSearchParams(window.location.search).get("next");
  return next && /^\/admin(\/|$)/.test(next) ? next : "/admin";
}

/** Connexion de l'équipe via Supabase Auth (e-mail + mot de passe). */
export function LoginForm() {
  const { t } = useI18n();
  const router = useRouter();
  const id = useId();
  const emailRef = useRef<HTMLInputElement>(null);
  const passwordRef = useRef<HTMLInputElement>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState<LoginErrors>({});
  const [submitted, setSubmitted] = useState(false);
  const [pending, setPending] = useState(false);
  const [authError, setAuthError] = useState<AuthError | null>(null);
  const [success, setSuccess] = useState(false);
  const configured = isSupabaseConfigured();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const nextErrors = validate(email, password);
    setErrors(nextErrors);
    setSubmitted(true);
    setAuthError(null);
    if (nextErrors.email) return emailRef.current?.focus();
    if (nextErrors.password) return passwordRef.current?.focus();
    if (!configured) return;

    setPending(true);
    try {
      const { error } = await getBrowserSupabase().auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) {
        setAuthError(mapAuthError(error));
        setPending(false);
        passwordRef.current?.select();
        return;
      }
    } catch {
      setAuthError("network");
      setPending(false);
      return;
    }
    setSuccess(true);
    router.replace(nextPath());
    router.refresh();
  }

  // Après une première tentative, les erreurs se mettent à jour pendant la saisie.
  function revalidate(nextEmail: string, nextPassword: string) {
    if (submitted) setErrors(validate(nextEmail, nextPassword));
  }

  return (
    <form noValidate onSubmit={handleSubmit} className="space-y-5">
      <div>
        <Label htmlFor={`${id}-email`}>{t.login.email}</Label>
        <Input
          ref={emailRef}
          id={`${id}-email`}
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder={t.login.emailPlaceholder}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            revalidate(e.target.value, password);
          }}
          aria-invalid={errors.email ? true : undefined}
          aria-describedby={errors.email ? `${id}-email-error` : undefined}
        />
        <FieldError id={`${id}-email-error`}>
          {errors.email && t.login.errors[errors.email]}
        </FieldError>
      </div>

      <div>
        <Label htmlFor={`${id}-password`}>{t.login.password}</Label>
        <div className="relative">
          <Input
            ref={passwordRef}
            id={`${id}-password`}
            type={showPassword ? "text" : "password"}
            autoComplete="current-password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              revalidate(email, e.target.value);
            }}
            className="pr-12"
            aria-invalid={errors.password ? true : undefined}
            aria-describedby={errors.password ? `${id}-password-error` : undefined}
          />
          <button
            type="button"
            onClick={() => setShowPassword((value) => !value)}
            aria-label={showPassword ? t.login.hidePassword : t.login.showPassword}
            aria-pressed={showPassword}
            aria-controls={`${id}-password`}
            className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-ink-muted hover:bg-paper-deep hover:text-ink"
          >
            {showPassword ? (
              <EyeOff aria-hidden="true" className="size-4" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden="true" className="size-4" strokeWidth={1.75} />
            )}
          </button>
        </div>
        <FieldError id={`${id}-password-error`}>
          {errors.password && t.login.errors[errors.password]}
        </FieldError>
      </div>

      <Button type="submit" size="lg" className="w-full" disabled={pending || success || !configured}>
        {(pending || success) && (
          <LoaderCircle aria-hidden="true" className="size-4 animate-spin" strokeWidth={1.75} />
        )}
        {pending || success ? t.login.submitting : t.login.submit}
      </Button>

      <div aria-live="polite">
        {authError && (
          <Alert tone="error" role="alert">
            {t.login.authErrors[authError]}
          </Alert>
        )}
        {success && (
          <Alert tone="success" title={t.login.successTitle}>
            {t.login.successText}
          </Alert>
        )}
      </div>
    </form>
  );
}
