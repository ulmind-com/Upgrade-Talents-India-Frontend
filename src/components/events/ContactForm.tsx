"use client";

import { useState } from "react";
import { Send } from "lucide-react";
import { Field, FormAlert, Input } from "@/components/ui/Form";
import { Button } from "@/components/ui/Primitives";

/**
 * The backend exposes no public contact-submission endpoint, so this form
 * composes a prefilled email to the published support address instead of
 * posting to an endpoint that does not exist.
 */
export default function ContactForm({ supportUrl, email }: { supportUrl?: string; email?: string }) {
  const [name, setName] = useState("");
  const [from, setFrom] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [sent, setSent] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Tell us your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(from)) errs.from = "Enter a valid email so we can reply.";
    if (message.trim().length < 10) errs.message = "Add a few more details (at least 10 characters).";
    setErrors(errs);
    if (Object.keys(errs).length) return;

    const to = email || "";
    const body = encodeURIComponent(`${message}\n\n—\n${name}\n${from}`);
    const subj = encodeURIComponent(subject || `Enquiry from ${name}`);
    window.location.href = `mailto:${to}?subject=${subj}&body=${body}`;
    setSent(true);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-[var(--radius-lg)] border border-[var(--border)] bg-[var(--surface)] p-7 md:p-9">
      <h2 className="font-display text-xl font-bold uppercase">Send a message</h2>

      <div aria-live="polite" className="empty:hidden">
        {sent && <FormAlert tone="success">Your email client is open with the message ready to send.</FormAlert>}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Your name" error={errors.name} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} autoComplete="name" value={name} onChange={(e) => setName(e.target.value)}
              aria-describedby={describedBy} invalid={invalid} placeholder="Full name" />
          )}
        </Field>
        <Field label="Email" error={errors.from} required>
          {({ id, describedBy, invalid }) => (
            <Input id={id} type="email" inputMode="email" autoComplete="email" value={from}
              onChange={(e) => setFrom(e.target.value)} aria-describedby={describedBy} invalid={invalid} placeholder="you@example.com" />
          )}
        </Field>
      </div>

      <Field label="Subject">
        {({ id }) => <Input id={id} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="What's this about?" />}
      </Field>

      <Field label="Message" error={errors.message} required>
        {({ id, describedBy, invalid }) => (
          <textarea
            id={id} rows={6} value={message} onChange={(e) => setMessage(e.target.value)}
            aria-describedby={describedBy} aria-invalid={invalid || undefined}
            placeholder="Tell us a little about your enquiry…"
            className={`w-full resize-y rounded-xl border bg-[var(--bg-elevated)] p-4 text-[15px] outline-none transition-colors placeholder:text-[var(--fg-subtle)] focus:border-[var(--accent)] ${invalid ? "border-[var(--danger)]" : "border-[var(--border)]"}`}
          />
        )}
      </Field>

      <Button type="submit" size="lg" className="mt-1 w-full">
        Send message <Send className="size-4" aria-hidden />
      </Button>

      {supportUrl && (
        <p className="text-center text-[13px] text-[var(--fg-muted)]">
          Need help with a booking?{" "}
          <a href={supportUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-[var(--accent)] underline-offset-4 hover:underline">
            Visit the help centre
          </a>
        </p>
      )}
    </form>
  );
}
