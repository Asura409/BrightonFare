import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

type Contact = {
  id: string;
  first_name: string;
  last_name: string | null;
  email: string;
  welcome_status: "pending" | "sent" | "failed";
};

const welcomeUrl = "https://city4christ.org/im-new/";
const consentVersion = "student-outreach-2026-09-v1";

function databaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Database is not configured");
  return { base: `${url.replace(/\/$/, "")}/rest/v1/outreach_contacts`, key };
}

async function databaseRequest(path: string, init: RequestInit) {
  const { base, key } = databaseConfig();
  const response = await fetch(base + path, {
    ...init,
    headers: {
      apikey: key,
      // New sb_secret_ keys belong on apikey only; legacy service_role JWTs
      // also need Authorization for PostgREST.
      ...(key.startsWith("sb_secret_") ? {} : { Authorization: `Bearer ${key}` }),
      "Content-Type": "application/json",
      ...init.headers,
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Database request failed (${response.status})`);
  return response;
}

async function findContact(email: string): Promise<Contact | undefined> {
  const query = new URLSearchParams({ select: "id,first_name,last_name,email,welcome_status", email: `eq.${email}`, limit: "1" });
  const response = await databaseRequest(`?${query}`, { method: "GET" });
  const contacts = (await response.json()) as Contact[];
  return contacts[0];
}

async function registerContact(input: { firstName: string; lastName: string; email: string; phone: string | null; phoneConsent: boolean }): Promise<Contact> {
  const consentAt = new Date().toISOString();
  const values = {
    first_name: input.firstName,
    last_name: input.lastName,
    email: input.email,
    phone: input.phone,
    phone_contact_opt_in: input.phoneConsent,
    phone_consented_at: input.phoneConsent ? consentAt : null,
    consent_at: consentAt,
    consent_version: consentVersion,
  };
  const response = await databaseRequest("?on_conflict=email&select=id,first_name,last_name,email,welcome_status", {
    method: "POST",
    headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ ...values, source: "brighton-university-qr" }),
  });
  const inserted = (await response.json()) as Contact[];
  if (inserted[0]) return inserted[0];
  const existing = await findContact(input.email);
  if (!existing) throw new Error("Contact could not be saved");
  const query = new URLSearchParams({ id: `eq.${existing.id}` });
  await databaseRequest(`?${query}`, { method: "PATCH", body: JSON.stringify(values) });
  return { ...existing, first_name: input.firstName, last_name: input.lastName };
}

async function setStatus(id: string, status: "sent" | "failed") {
  const query = new URLSearchParams({ id: `eq.${id}` });
  await databaseRequest(`?${query}`, {
    method: "PATCH",
    body: JSON.stringify({
      welcome_status: status,
      welcome_sent_at: status === "sent" ? new Date().toISOString() : null,
    }),
  });
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]!);
}

async function sendWelcome(contact: Contact) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) throw new Error("Email is not configured");
  const name = escapeHtml(contact.first_name);
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "Idempotency-Key": `brightonfare-welcome-${contact.id}`,
    },
    body: JSON.stringify({
      from,
      to: [contact.email],
      reply_to: "info@city4christ.org",
      subject: "Lovely to meet you — City4Christ",
      text: `Hi ${contact.first_name},\n\nThanks for connecting with us. City4Christ is a Christian community in Hove where you're welcome to explore faith, meet people and join us for worship.\n\nIf you'd like to learn more, our I'm New page explains what to expect: ${welcomeUrl}\n\nWhether or not you decide to visit, we're glad we met you.\n\nThe City4Christ team\n2 Rutland Road, Hove, BN3 5FF\n\nYou received this one-time email because you requested an introduction through our student outreach form. Questions? Reply to this email.`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#18372b;line-height:1.65"><p>Hi ${name},</p><p>Thanks for connecting with us. City4Christ is a Christian community in Hove where you're welcome to explore faith, meet people and join us for worship.</p><p>If you'd like to learn more, our <a href="${welcomeUrl}">I'm New page</a> explains what to expect.</p><p>Whether or not you decide to visit, we're glad we met you.</p><p>The City4Christ team<br>2 Rutland Road, Hove, BN3 5FF</p><hr style="border:0;border-top:1px solid #ddd"><small>You received this one-time email because you requested an introduction through our student outreach form. Questions? Reply to this email.</small></div>`,
    }),
  });
  if (!response.ok) throw new Error(`Email request failed (${response.status})`);
}

export async function POST(request: NextRequest) {
  try {
    if (Number(request.headers.get("content-length") ?? 0) > 4096) {
      return NextResponse.json({ error: "The form is too large." }, { status: 413 });
    }
    const input = await request.json();
    if (typeof input !== "object" || input === null) throw new SyntaxError("Invalid form");
    if (input.website) return NextResponse.json({ ok: true });

    const firstName = typeof input.firstName === "string" ? input.firstName.trim().replace(/\s+/g, " ") : "";
    const lastName = typeof input.lastName === "string" ? input.lastName.trim().replace(/\s+/g, " ") : "";
    const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
    const phone = typeof input.phone === "string" ? input.phone.trim() : "";
    if (!firstName || firstName.length > 80 || !lastName || lastName.length > 80 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || (phone && !/^\+?[0-9 ()-]{7,25}$/.test(phone))) {
      return NextResponse.json({ error: "Please check your name, email and phone number." }, { status: 400 });
    }
    if (input.emailConsent !== true) {
      return NextResponse.json({ error: "Please review and agree to how your details will be used." }, { status: 400 });
    }
    if (input.phoneConsent === true && !phone) {
      return NextResponse.json({ error: "A phone number is needed for phone follow-up." }, { status: 400 });
    }
    const phoneConsent = input.phoneConsent === true;
    const contact = await registerContact({ firstName, lastName, email, phone: phoneConsent ? phone : null, phoneConsent });
    if (contact.welcome_status === "sent") return NextResponse.json({ ok: true });

    try {
      await sendWelcome(contact);
      await setStatus(contact.id, "sent");
    } catch (error) {
      console.error("Welcome delivery failed", error);
      await setStatus(contact.id, "failed").catch((dbError) => console.error("Could not record delivery failure", dbError));
      return NextResponse.json({ error: "We couldn't send your email just now. Please try again." }, { status: 503 });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof SyntaxError) return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
    console.error("Student form failed", error);
    return NextResponse.json({ error: "The form is unavailable right now. Please try again later." }, { status: 503 });
  }
}
