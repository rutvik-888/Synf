// Public form submission handler: validates input server-side, saves to the database,
// generates a reference number, and sends email notifications via Resend.
// If RESEND_API_KEY is not configured, submissions still save and failures are logged.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const DEFAULT_NOTIFY_EMAIL = "synf.c@com.gh";
const HONEYPOT_FIELD = "company_website";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { kind } = body as { kind: "enquiry" | "application" | "subscriber" };

    // Honeypot: if filled, silently accept and discard (bot trap)
    if (body[HONEYPOT_FIELD]) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Load contact settings
    let notifyEmail = DEFAULT_NOTIFY_EMAIL;
    let ackEnabled = true;
    let internalNotifyEnabled = true;
    const { data: settingsRow } = await supabase
      .from("site_content")
      .select("data")
      .eq("slug", "contact_settings")
      .maybeSingle();
    if (settingsRow?.data) {
      const d = settingsRow.data as Record<string, unknown>;
      if (d.internal_recipient) notifyEmail = String(d.internal_recipient);
      if (d.acknowledgement_email_enabled === false) ackEnabled = false;
      if (d.internal_notification_enabled === false) internalNotifyEnabled = false;
    }

    if (kind === "enquiry") {
      const e = body;
      if (!e.full_name || !e.email || !e.message) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate email format
      const emailStr = String(e.email).slice(0, 300);
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr)) {
        return new Response(JSON.stringify({ error: "Invalid email address" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Rate limit: max 5 enquiries per email per hour
      const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
      const { count } = await supabase
        .from("enquiries")
        .select("id", { count: "exact", head: true })
        .eq("email", emailStr)
        .gte("created_at", oneHourAgo);
      if (count && count >= 5) {
        return new Response(JSON.stringify({ error: "Too many submissions. Please try again later." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Generate reference number atomically
      const { data: refData, error: refErr } = await supabase.rpc("generate_enquiry_reference");
      if (refErr || !refData) {
        return new Response(JSON.stringify({ error: "Could not generate reference number" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const referenceNumber = refData as string;

      const { data, error } = await supabase.from("enquiries").insert({
        reference_number: referenceNumber,
        full_name: String(e.full_name).slice(0, 200),
        email: emailStr,
        phone: e.phone ? String(e.phone).slice(0, 50) : null,
        brand: e.brand ? String(e.brand).slice(0, 200) : null,
        category: e.category ? String(e.category).slice(0, 100) : null,
        category_id: e.category_id || null,
        subject: e.subject ? String(e.subject).slice(0, 300) : null,
        organization: e.organization ? String(e.organization).slice(0, 200) : null,
        preferred_contact_method: e.preferred_contact_method ? String(e.preferred_contact_method).slice(0, 20) : null,
        event_name: e.event_name ? String(e.event_name).slice(0, 200) : null,
        preferred_date: e.preferred_date || null,
        venue_city: e.venue_city ? String(e.venue_city).slice(0, 200) : null,
        budget_range: e.budget_range ? String(e.budget_range).slice(0, 100) : null,
        audience_size: e.audience_size ? String(e.audience_size).slice(0, 100) : null,
        message: String(e.message).slice(0, 5000),
        links: e.links ? String(e.links).slice(0, 2000) : null,
        consent_text: e.consent_text ? String(e.consent_text).slice(0, 1000) : null,
      }).select("id").single();

      if (error) {
        return new Response(JSON.stringify({ error: "Could not save submission" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const visitorName = String(e.full_name).slice(0, 200);
      const categoryLabel = e.category ? String(e.category) : "General";
      const subjectText = e.subject ? String(e.subject) : "(no subject)";
      const messagePreview = String(e.message).slice(0, 500);
      const websiteUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", "") || "https://team-synf.com";
      const adminLink = `${websiteUrl}/admin/enquiries`;

      // Send visitor acknowledgement email
      let ackSent = false;
      if (ackEnabled) {
        const { data: ackTpl } = await supabase
          .from("email_templates")
          .select("subject, body")
          .eq("key", "enquiry_acknowledgement")
          .maybeSingle();

        let ackSubject = `We received your message — ${referenceNumber}`;
        let ackBody = `Hi ${visitorName},\n\nThank you for reaching out to Team Synf. We've received your enquiry and it's been logged in our system.\n\nReference: ${referenceNumber}\nCategory: ${categoryLabel}\nSubject: ${subjectText}\n\nOur team will review your message and get back to you if a response is appropriate. Please keep your reference number handy for any future correspondence about this enquiry.\n\n— Team Synf`;

        if (ackTpl) {
          ackSubject = fillTemplate(ackTpl.subject, {
            reference_number: referenceNumber,
            visitor_name: visitorName,
            category: categoryLabel,
            subject: subjectText,
            website_url: websiteUrl,
          });
          ackBody = fillTemplate(ackTpl.body, {
            reference_number: referenceNumber,
            visitor_name: visitorName,
            category: categoryLabel,
            subject: subjectText,
            website_url: websiteUrl,
          });
        }

        ackSent = (await sendEmail(supabase, {
          to: emailStr,
          subject: ackSubject,
          body: ackBody,
          templateKey: "enquiry_acknowledgement",
          payload: { enquiryId: data.id, referenceNumber },
        })).ok;
      }

      // Send internal notification email
      let internalSent = false;
      if (internalNotifyEnabled) {
        const { data: notifyTpl } = await supabase
          .from("email_templates")
          .select("subject, body")
          .eq("key", "enquiry_internal_notify")
          .maybeSingle();

        let notifySubject = `New enquiry: ${referenceNumber} — ${subjectText}`;
        let notifyBody = `A new enquiry has been received.\n\nReference: ${referenceNumber}\nFrom: ${visitorName} <${emailStr}>\nCategory: ${categoryLabel}\nSubject: ${subjectText}\n\nMessage:\n${messagePreview}\n\nSubmitted: ${new Date().toISOString()}\n\nView in admin panel → ${adminLink}\n\n— Team Synf System`;

        if (notifyTpl) {
          notifySubject = fillTemplate(notifyTpl.subject, {
            reference_number: referenceNumber,
            visitor_name: visitorName,
            visitor_email: emailStr,
            category: categoryLabel,
            subject: subjectText,
            message_preview: messagePreview,
            submitted_at: new Date().toISOString(),
            admin_link: adminLink,
          });
          notifyBody = fillTemplate(notifyTpl.body, {
            reference_number: referenceNumber,
            visitor_name: visitorName,
            visitor_email: emailStr,
            category: categoryLabel,
            subject: subjectText,
            message_preview: messagePreview,
            submitted_at: new Date().toISOString(),
            admin_link: adminLink,
          });
        }

        internalSent = (await sendEmail(supabase, {
          to: notifyEmail,
          subject: notifySubject,
          body: notifyBody,
          templateKey: "enquiry_internal_notify",
          payload: { enquiryId: data.id, referenceNumber },
        })).ok;
      }

      // Log activity
      await supabase.from("enquiry_activity").insert({
        enquiry_id: data.id,
        actor_id: null,
        action: "created",
        detail: `Enquiry submitted with reference ${referenceNumber}`,
      });

      return new Response(JSON.stringify({
        success: true,
        reference_number: referenceNumber,
        emailSent: ackSent || internalSent,
      }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "subscriber") {
      const s = body;
      if (!s.email) {
        return new Response(JSON.stringify({ error: "Email is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { error } = await supabase.from("subscribers").upsert({
        email: String(s.email).slice(0, 300),
        first_name: s.first_name ? String(s.first_name).slice(0, 100) : null,
        consent_text: s.consent_text ? String(s.consent_text).slice(0, 1000) : null,
        consent_at: new Date().toISOString(),
        unsubscribed_at: null,
      }, { onConflict: "email" });

      if (error) {
        return new Response(JSON.stringify({ error: "Could not subscribe" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const notifyResult = await sendEmail(supabase, {
        to: notifyEmail,
        subject: `New insider list signup: ${s.email}`,
        body: `New subscriber joined the insider list.\n\nEmail: ${s.email}\nName: ${s.first_name || "-"}\n\nView all subscribers in admin panel.`,
        templateKey: "subscriber_notify",
        payload: { email: s.email },
      });

      return new Response(JSON.stringify({ success: true, emailSent: notifyResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (kind === "application") {
      const a = body;
      if (!a.full_name || !a.email || !a.answers || !a.form_snapshot) {
        return new Response(JSON.stringify({ error: "Missing required fields" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { data, error } = await supabase.from("applications").insert({
        form_id: a.form_id || null,
        form_snapshot: a.form_snapshot,
        answers: a.answers,
        full_name: String(a.full_name).slice(0, 200),
        email: String(a.email).slice(0, 300),
        phone: a.phone ? String(a.phone).slice(0, 50) : null,
        instagram: a.instagram ? String(a.instagram).slice(0, 100) : null,
        city: a.city ? String(a.city).slice(0, 100) : null,
        preferred_role: a.preferred_role ? String(a.preferred_role).slice(0, 100) : null,
        consent_text: a.consent_text ? String(a.consent_text).slice(0, 1000) : null,
      }).select("id").single();

      if (error) {
        return new Response(JSON.stringify({ error: "Could not save application" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const notifyResult = await sendEmail(supabase, {
        to: notifyEmail,
        subject: `New application from ${a.full_name}`,
        body: `New recruitment application received.\n\nName: ${a.full_name}\nEmail: ${a.email}\nPhone: ${a.phone || "-"}\nInstagram: ${a.instagram || "-"}\nCity: ${a.city || "-"}\nPreferred role: ${a.preferred_role || "-"}\n\nReview in admin panel → Applications.`,
        templateKey: "application_notify",
        payload: { applicationId: data.id },
      });

      return new Response(JSON.stringify({ success: true, emailSent: notifyResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown submission kind" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

function fillTemplate(text: string, vars: Record<string, string>): string {
  let r = text;
  for (const [k, v] of Object.entries(vars)) r = r.split(`{{${k}}}`).join(v);
  return r;
}

async function sendEmail(
  supabase: ReturnType<typeof createClient>,
  opts: { to: string; subject: string; body: string; templateKey: string; payload: Record<string, unknown> }
): Promise<{ ok: boolean }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Team Synf <noreply@resend.dev>";

  if (!apiKey) {
    await supabase.from("email_logs").insert({
      template_key: opts.templateKey,
      to_address: opts.to,
      subject: opts.subject,
      status: "failed",
      error: "RESEND_API_KEY not configured — submission saved, email not sent",
      payload: opts.payload,
    });
    return { ok: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: opts.to,
        subject: opts.subject,
        text: opts.body,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await supabase.from("email_logs").insert({
        template_key: opts.templateKey,
        to_address: opts.to,
        subject: opts.subject,
        status: "failed",
        error: `Resend API error: ${res.status} ${errText}`,
        payload: opts.payload,
      });
      return { ok: false };
    }

    const resData = await res.json();
    await supabase.from("email_logs").insert({
      template_key: opts.templateKey,
      to_address: opts.to,
      subject: opts.subject,
      status: "sent",
      provider_message_id: resData.id || null,
      payload: opts.payload,
    });
    return { ok: true };
  } catch (err) {
    await supabase.from("email_logs").insert({
      template_key: opts.templateKey,
      to_address: opts.to,
      subject: opts.subject,
      status: "failed",
      error: (err as Error).message,
      payload: opts.payload,
    });
    return { ok: false };
  }
}
