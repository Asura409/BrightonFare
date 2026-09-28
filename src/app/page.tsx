"use client";

import { FormEvent, useState } from "react";

type Status = "idle" | "sending" | "success" | "error";

export default function Home() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const fields = new FormData(form);
    setStatus("sending");
    setError("");
    try {
      const response = await fetch("/api/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: fields.get("name"),
          email: fields.get("email"),
          website: fields.get("website"),
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error || "We couldn't send your email just now. Please try again.");
      }
      form.reset();
      setStatus("success");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Please try again.");
      setStatus("error");
    }
  }

  return <main className="shell">
    <div className="ambient ambient-one" /><div className="ambient ambient-two" />
    <section className="card" aria-labelledby="heading">
      <div className="eyebrow"><span className="sparkle">✦</span> CITY4CHRIST · BRIGHTON & HOVE</div>
      {status === "success" ? <div className="success" role="status">
        <div className="success-icon">✓</div>
        <h1 id="heading">Check your inbox.</h1>
        <p>Your introduction is on its way. If you don’t see it soon, check your spam folder too.</p>
        <button className="secondary" onClick={() => setStatus("idle")}>Start again</button>
      </div> : <>
        <div className="hero-mark" aria-hidden="true">✳</div>
        <h1 id="heading">It was lovely<br />meeting you.</h1>
        <p className="intro">Want to learn a little more about City4Christ? Leave your details and we’ll email you a short introduction. What you do next is entirely up to you.</p>
        <form onSubmit={submit}>
          <label htmlFor="name">Your name</label>
          <input id="name" name="name" type="text" autoComplete="given-name" maxLength={80} placeholder="First name" required />
          <label htmlFor="email">Email address</label>
          <input id="email" name="email" type="email" autoComplete="email" maxLength={254} placeholder="you@example.com" required />
          <div className="trap" aria-hidden="true"><label htmlFor="website">Website</label><input id="website" name="website" tabIndex={-1} autoComplete="off" /></div>
          <p className="privacy-note">We’ll use your details to send the introduction you requested. Read our <a href="/privacy">privacy notice</a>.</p>
          {status === "error" && <p className="error" role="alert">{error}</p>}
          <button className="primary" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending…" : "Email me the introduction"}<span aria-hidden="true">→</span></button>
        </form>
      </>}
    </section>
    <footer>City4Christ Church · Brighton & Hove</footer>
  </main>;
}
