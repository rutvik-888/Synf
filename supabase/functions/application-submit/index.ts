// Application submission handler:
// - Validates job is open and accepting applications
// - Saves application with server-generated sequential ID (#SYNF-APP-000001)
// - Sends applicant acknowledgement + internal notification emails via Resend
// - Logs all email attempts to email_logs

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOTIFY_EMAIL = "synf.c@com.gh";
const HONEYPOT_FIELD = "company_website";

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();

    if (body[HONEYPOT_FIELD]) {
      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { job_id, full_name, email, answers, consent_text } = body;

    if (!job_id || !full_name || !email || !answers || !consent_text) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify job exists, is published, and is within application window
    const { data: job, error: jobError } = await supabase
      .from("job_postings")
      .select("id, title, status, application_open, application_close, form_fields")
      .eq("id", job_id)
      .single();

    if (jobError || !job) {
      return new Response(JSON.stringify({ error: "Job not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (job.status !== "published") {
      return new Response(JSON.stringify({ error: "This position is no longer accepting applications." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const today = new Date().toISOString().split("T")[0];
    if (job.application_open && today < job.application_open) {
      return new Response(JSON.stringify({ error: "Applications for this position have not opened yet." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (job.application_close && today > job.application_close) {
      return new Response(JSON.stringify({ error: "The application deadline for this position has passed." }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate sequential application code using the database sequence
    const { data: seqVal, error: seqError } = await supabase.rpc("nextval_application_seq");
    if (seqError || !seqVal) {
      return new Response(JSON.stringify({ error: "Could not generate application ID" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const applicationCode = `#SYNF-APP-${String(seqVal).padStart(6, "0")}`;

    // Save the application
    const { data: app, error: insertError } = await supabase.from("applications").insert({
      job_id: job.id,
      application_code: applicationCode,
      form_snapshot: { fields: job.form_fields, title: job.title, consent_text },
      answers,
      full_name: String(full_name).slice(0, 200),
      email: String(email).slice(0, 300),
      phone: body.phone ? String(body.phone).slice(0, 50) : null,
      instagram: body.instagram ? String(body.instagram).slice(0, 100) : null,
      city: body.city ? String(body.city).slice(0, 100) : null,
      preferred_role: body.preferred_role ? String(body.preferred_role).slice(0, 100) : null,
      attachment_url: body.attachment_url ? String(body.attachment_url).slice(0, 2000) : null,
      status: "submitted",
      consent_text: String(consent_text).slice(0, 1000),
    }).select("id, application_code").single();

    if (insertError || !app) {
      return new Response(JSON.stringify({ error: "Could not save application" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Log initial status
    await supabase.from("application_status_history").insert({
      application_id: app.id,
      new_status: "submitted",
      note: "Application submitted",
    });

    // Send emails
    const submissionDate = new Date().toLocaleDateString("en-US", {
      weekday: "long", year: "numeric", month: "long", day: "numeric",
    });

    // Email A: Applicant acknowledgement
    const ackTemplate = await getTemplate(supabase, "application_acknowledgement");
    const ackBody = fillTemplate(ackTemplate.body, {
      applicant_name: full_name,
      job_title: job.title,
      application_id: applicationCode,
      submission_date: submissionDate,
      contact_email: NOTIFY_EMAIL,
    });

    const ackResult = await sendEmail(supabase, {
      to: email,
      subject: fillTemplate(ackTemplate.subject, { job_title: job.title, applicant_name: full_name }),
      body: ackBody,
      templateKey: "application_acknowledgement",
      applicationId: app.id,
    });

    // Email B: Internal notification
    const notifyTemplate = await getTemplate(supabase, "application_internal_notify");
    const notifyBody = fillTemplate(notifyTemplate.body, {
      applicant_name: full_name,
      job_title: job.title,
      application_id: applicationCode,
      submission_date: submissionDate,
    });

    const notifyResult = await sendEmail(supabase, {
      to: NOTIFY_EMAIL,
      subject: fillTemplate(notifyTemplate.subject, { applicant_name: full_name, job_title: job.title }),
      body: notifyBody,
      templateKey: "application_internal_notify",
      applicationId: app.id,
    });

    return new Response(JSON.stringify({
      success: true,
      application_id: applicationCode,
      email_sent: ackResult.ok,
    }), {
      status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function getTemplate(supabase: ReturnType<typeof createClient>, key: string): Promise<{ subject: string; body: string }> {
  const { data } = await supabase.from("email_templates").select("subject, body").eq("key", key).maybeSingle();
  if (data) return { subject: data.subject, body: data.body };
  return { subject: `Team Synf — ${key}`, body: "Template not found." };
}

function fillTemplate(text: string, vars: Record<string, string>): string {
  let result = text;
  for (const [key, value] of Object.entries(vars)) {
    result = result.replaceAll(`{{${key}}}`, value);
  }
  return result;
}

async function sendEmail(
  supabase: ReturnType<typeof createClient>,
  opts: { to: string; subject: string; body: string; templateKey: string; applicationId?: string }
): Promise<{ ok: boolean }> {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Team Synf <noreply@resend.dev>";

  if (!apiKey) {
    await supabase.from("email_logs").insert({
      template_key: opts.templateKey,
      to_address: opts.to,
      subject: opts.subject,
      status: "failed",
      error: "RESEND_API_KEY not configured",
      application_id: opts.applicationId,
    });
    return { ok: false };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: fromEmail, to: opts.to, subject: opts.subject, text: opts.body }),
    });

    if (!res.ok) {
      const errText = await res.text();
      await supabase.from("email_logs").insert({
        template_key: opts.templateKey,
        to_address: opts.to,
        subject: opts.subject,
        status: "failed",
        error: `Resend API error: ${res.status} ${errText}`,
        application_id: opts.applicationId,
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
      application_id: opts.applicationId,
    });
    return { ok: true };
  } catch (err) {
    await supabase.from("email_logs").insert({
      template_key: opts.templateKey,
      to_address: opts.to,
      subject: opts.subject,
      status: "failed",
      error: (err as Error).message,
      application_id: opts.applicationId,
    });
    return { ok: false };
  }
}
