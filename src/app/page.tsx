"use client";

import { FormEvent, useRef, useState } from "react";

type Status = "idle" | "sending" | "success" | "error";
type Details = { firstName: string; lastName: string; email: string; phone: string; website: string };

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");
  const [details, setDetails] = useState<Details | null>(null);
  const [emailConsent, setEmailConsent] = useState(false);
  const [phoneConsent, setPhoneConsent] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const form = useRef<HTMLFormElement>(null);

  function review(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const fields = new FormData(event.currentTarget);
    setDetails({
      firstName: String(fields.get("firstName") ?? ""),
      lastName: String(fields.get("lastName") ?? ""),
      email: String(fields.get("email") ?? ""),
      phone: String(fields.get("phone") ?? ""),
      website: String(fields.get("website") ?? ""),
    });
    setEmailConsent(false);
    setPhoneConsent(false);
    dialog.current?.showModal();
  }

  function closeDialog() {
    dialog.current?.close();
    setDetails(null);
  }

  async function submit() {
    if (!details || !emailConsent || (phoneConsent && !details.phone.trim())) return;
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...details,
          emailConsent,
          phoneConsent,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "We couldn't send your email just now. Please try again.");
      }
      form.current?.reset();
      closeDialog();
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
      setStatus("error");
      closeDialog();
    }
  }

  return <main className="shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <section className="card" aria-labelledby="heading">
      <img className="brand-logo" src="/city4christ_logo.jpeg" alt="City4Christ — The House of Good News" />
      <div className="eyebrow">CITY4CHRIST · BRIGHTON & HOVE</div>
      {status === "success" ? <div className="success" role="status">
        <div className="success-icon">✓</div>
        <h1 id="heading">Check your inbox.</h1>
        <p>Your introduction is on its way. If you don’t see it soon, check your spam folder too.</p>
        <button className="secondary" onClick={() => setStatus("idle")}>Start again</button>
      </div> : <>
        <div className="hero-mark" aria-hidden="true">✳</div>
        <h1 id="heading">It was lovely<br />meeting you.</h1>
        <p className="intro">Want to learn a little more about City4Christ? Leave your details and we’ll email you a short introduction.</p>
        <form ref={form} onSubmit={review}>
          <label htmlFor="firstName">First name</label>
          <input id="firstName" name="firstName" type="text" autoComplete="given-name" maxLength={80} placeholder="First name" required />
          <label htmlFor="lastName">Last name</label>
          <input id="lastName" name="lastName" type="text" autoComplete="family-name" maxLength={80} placeholder="Last name" required />
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
          <label htmlFor="phone">Phone number <span className="optional">(optional)</span></label>
          <input id="phone" name="phone" type="tel" autoComplete="tel" maxLength={25} placeholder="e.g. +44 7700 900000" />
          <div className="trap" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <p className="privacy-note">You’ll review how we use your details before sending them. Read our <a href="/privacy">privacy notice</a>.</p>
          {status === "error" && <p className="error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={status === "sending"}>Review and continue<span aria-hidden="true">→</span></button>
        </form>
      </>}
    </section>
    <dialog ref={dialog} className="consent-dialog" aria-labelledby="consent-heading" onClose={() => setDetails(null)}>
      <h2 id="consent-heading">Before you send your details</h2>
      <p>City4Christ will save your first name, last name and email address to send you <strong>one introductory email</strong> with a link to our I’m New page. This does not sign you up for ongoing emails.</p>
      <label className="check"><input type="checkbox" checked={emailConsent} onChange={(event) => setEmailConsent(event.target.checked)} /><span>I agree to City4Christ using my name and email for this one-time introduction.</span></label>
      <p>If you entered a phone number, you can separately choose whether our outreach team may contact you about visiting City4Christ. We won’t save your number unless you choose this.</p>
      <label className="check"><input type="checkbox" checked={phoneConsent} onChange={(event) => setPhoneConsent(event.target.checked)} disabled={!details?.phone.trim()} /><span>City4Christ may call or text me once about a visit. <strong>Optional.</strong></span></label>
      <p className="dialog-note">Your choices are recorded with your submission. See our <a href="/privacy" target="_blank" rel="noopener noreferrer">privacy notice</a> or email info@city4christ.org to ask us to delete your details.</p>
      {phoneConsent && !details?.phone.trim() && <p className="error">Enter a phone number first.</p>}
      <div className="dialog-actions"><button type="button" className="secondary" onClick={closeDialog} disabled={status === "sending"}>Go back</button><button type="button" className="primary" onClick={submit} disabled={!emailConsent || status === "sending"}>{status === "sending" ? "Sending…" : "Agree and send"}</button></div>
    </dialog>
    <footer>City4Christ Church · Brighton & Hove<br /><strong>24/7 Prayer Line:</strong> <a href="tel:+4401273021777">+44 01273 021777</a></footer>
  </main>;
}
