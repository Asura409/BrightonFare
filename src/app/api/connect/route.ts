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
const instagramUrl = "https://www.instagram.com/city4christ_uob?stkn=MXd0M3c4dnJ4cWZsOQ%3D%3D&utm_source=qr";
const whatsappUrl = "https://chat.whatsapp.com/EPUL3XkUvJo2kLLLquaPPi?s=qs&p=i&mlu=0&ilr=4";
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
  if (!response.ok) {
    const details = (await response.text().catch(() => "")).slice(0, 300);
    throw new Error(`Database request failed (${response.status})${details ? `: ${details}` : ""}`);
  }
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
  const instagramHtmlUrl = escapeHtml(instagramUrl);
  const whatsappHtmlUrl = escapeHtml(whatsappUrl);
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
      subject: "Welcome to City4Christ — we're glad you're here",
      text: `Hi ${contact.first_name},

It was lovely meeting you. Welcome to City4Christ!

WHO WE ARE
City4Christ is a vibrant Christian community in Brighton & Hove. We're a place where students and people from every background can belong, build genuine friendships and discover what it means to follow Jesus.

WHAT WE DO
We gather to worship, learn from the Bible, pray and grow together. Throughout the week, we also create opportunities to connect, ask honest questions about faith and serve our city. Whether church is familiar to you or completely new, there's a place for you here.

HERE'S HOW TO GET CONNECTED

I'm New — find out what to expect when you visit:
${welcomeUrl}

Instagram — follow @city4christ_uob for student updates and events:
${instagramUrl}

WhatsApp — join the student community chat:
${whatsappUrl}

We'd love to see you soon. If you have any questions, simply reply to this email.

With love,
The City4Christ team
2 Rutland Road, Hove, BN3 5FF

You received this one-time welcome email because you requested an introduction through our student outreach form.`,
      html: `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background-color:#edf3f0;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">Meet the City4Christ family and find your next step.</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#edf3f0;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;background-color:#ffffff;border:1px solid #e1eae4;border-radius:18px;overflow:hidden;">
            <tr>
              <td style="padding:38px 40px 18px;font-family:Arial,Helvetica,sans-serif;color:#336f5d;font-size:12px;font-weight:700;letter-spacing:2px;">
                <span style="color:#b98848;font-size:18px;vertical-align:-1px;">&#10022;</span>&nbsp; CITY4CHRIST · BRIGHTON &amp; HOVE
              </td>
            </tr>
            <tr>
              <td style="padding:8px 40px 40px;font-family:Arial,Helvetica,sans-serif;color:#18372b;">
                <p style="margin:0 0 12px;font-size:16px;line-height:1.7;">Hi ${name},</p>
                <h1 style="margin:0 0 22px;font-family:Georgia,'Times New Roman',serif;font-size:38px;line-height:1.12;font-weight:400;letter-spacing:-1px;color:#152a28;">Welcome — we're so glad you're here.</h1>
                <p style="margin:0 0 26px;font-size:16px;line-height:1.7;color:#53645e;">It was lovely meeting you. Thanks for taking a moment to connect with us.</p>

                <h2 style="margin:0 0 8px;font-size:13px;line-height:1.4;letter-spacing:1.5px;color:#336f5d;">WHO WE ARE</h2>
                <p style="margin:0 0 24px;font-size:16px;line-height:1.7;color:#3f554c;">City4Christ is a vibrant Christian community in Brighton &amp; Hove. We're a place where students and people from every background can belong, build genuine friendships and discover what it means to follow Jesus.</p>

                <h2 style="margin:0 0 8px;font-size:13px;line-height:1.4;letter-spacing:1.5px;color:#336f5d;">WHAT WE DO</h2>
                <p style="margin:0 0 28px;font-size:16px;line-height:1.7;color:#3f554c;">We gather to worship, learn from the Bible, pray and grow together. Throughout the week, we also create opportunities to connect, ask honest questions about faith and serve our city. Whether church is familiar to you or completely new, there's a place for you here.</p>

                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;background-color:#f3f7f4;border-radius:12px;">
                  <tr><td style="padding:25px 24px 12px;font-family:Arial,Helvetica,sans-serif;font-size:13px;font-weight:700;letter-spacing:1.5px;color:#336f5d;">YOUR NEXT STEPS</td></tr>
                  <tr><td style="padding:0 24px 14px;font-family:Arial,Helvetica,sans-serif;"><a href="${welcomeUrl}" style="display:block;padding:14px 16px;background-color:#225b43;border-radius:8px;color:#ffffff;font-size:15px;font-weight:700;text-align:center;text-decoration:none;">Visit our I'm New page &nbsp;→</a></td></tr>
                  <tr><td style="padding:0 24px 10px;font-family:Arial,Helvetica,sans-serif;"><a href="${instagramHtmlUrl}" style="display:block;padding:12px 16px;border:1px solid #bfd1c6;border-radius:8px;color:#225b43;font-size:15px;font-weight:700;text-align:center;text-decoration:none;">Follow @city4christ_uob on Instagram</a></td></tr>
                  <tr><td style="padding:0 24px 24px;font-family:Arial,Helvetica,sans-serif;"><a href="${whatsappHtmlUrl}" style="display:block;padding:12px 16px;border:1px solid #bfd1c6;border-radius:8px;color:#225b43;font-size:15px;font-weight:700;text-align:center;text-decoration:none;">Join our student WhatsApp community</a></td></tr>
                </table>

                <p style="margin:28px 0 0;font-size:16px;line-height:1.7;color:#3f554c;">We'd love to see you soon. If you have any questions, simply reply to this email.</p>
                <p style="margin:20px 0 0;font-size:16px;line-height:1.7;color:#3f554c;">With love,<br><strong>The City4Christ team</strong><br>2 Rutland Road, Hove, BN3 5FF</p>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 40px;background-color:#18372b;font-family:Arial,Helvetica,sans-serif;color:#cbd9d2;font-size:11px;line-height:1.6;text-align:center;">You received this one-time welcome email because you requested an introduction through our student outreach form.</td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`,
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
