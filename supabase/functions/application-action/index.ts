// Application action handler (authenticated):
// - approve: set status to approved, send welcome email
// - invite_interview: save interview, set status, send invitation email
// - reschedule_interview: update interview, send rescheduled email
// - cancel_interview: set interview cancelled, send cancellation email
// - reject: set status rejected with reason, send rejection email
// - under_review: set status to under_review
// - retry_email: resend a failed email by log id
// All actions require authenticated staff with recruitment_manager+ permissions.

import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const NOTIFY_EMAIL = "synf.c@com.gh";

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

    const authHeader = req.headers.get("Authorization") || "";
    const apiKey = req.headers.get("apikey") || "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // Verify the caller's session
    const userClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      apiKey || Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: authHeader } },
      }
    );
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the user's role
    const { data: profile } = await supabase
      .from("team_profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();
    const role = profile?.role || (user.app_metadata?.role as string) || "viewer";

    const allowedRoles = ["owner", "admin", "recruitment_manager"];
    if (!allowedRoles.includes(role)) {
      return new Response(JSON.stringify({ error: "Insufficient permissions" }), {
        status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, application_id } = body;

    if (!action || !application_id) {
      return new Response(JSON.stringify({ error: "Missing action or application_id" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load application
    const { data: app, error: appError } = await supabase
      .from("applications")
      .select("id, application_code, full_name, email, status, job_id, rejection_reason")
      .eq("id", application_id)
      .single();
    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Load job title
    let jobTitle = "Unknown Role";
    if (app.job_id) {
      const { data: job } = await supabase.from("job_postings").select("title").eq("id", app.job_id).maybeSingle();
      if (job) jobTitle = job.title;
    }

    // ========== APPROVE ==========
    if (action === "approve") {
      if (app.status === "approved") {
        return new Response(JSON.stringify({ error: "Application already approved" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const oldStatus = app.status;
      await supabase.from("applications").update({
        status: "approved",
        decision_at: new Date().toISOString(),
        assigned_reviewer: user.id,
      }).eq("id", app.id);

      await supabase.from("application_status_history").insert({
        application_id: app.id,
        old_status: oldStatus,
        new_status: "approved",
        actor_id: user.id,
        note: body.note || "Application approved",
      });

      await supabase.from("activity_log").insert({
        actor_id: user.id,
        action: "application_approved",
        target_type: "applications",
        target_id: app.id,
        summary: `Approved ${app.full_name} for ${jobTitle} (${app.application_code})`,
      });

      const tpl = await getTemplate(supabase, "application_approval");
      const emailBody = fillTemplate(tpl.body, {
        applicant_name: app.full_name,
        job_title: jobTitle,
        application_id: app.application_code,
        contact_email: NOTIFY_EMAIL,
      });
      const emailResult = await sendEmail(supabase, {
        to: app.email,
        subject: fillTemplate(tpl.subject, { applicant_name: app.full_name }),
        body: emailBody,
        templateKey: "application_approval",
        applicationId: app.id,
        sentBy: user.id,
      });

      return new Response(JSON.stringify({ success: true, email_sent: emailResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== UNDER REVIEW ==========
    if (action === "under_review") {
      const oldStatus = app.status;
      await supabase.from("applications").update({
        status: "under_review",
        reviewed_at: new Date().toISOString(),
        assigned_reviewer: user.id,
      }).eq("id", app.id);

      await supabase.from("application_status_history").insert({
        application_id: app.id,
        old_status: oldStatus,
        new_status: "under_review",
        actor_id: user.id,
        note: body.note || "Moved to review",
      });

      return new Response(JSON.stringify({ success: true }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== INVITE INTERVIEW ==========
    if (action === "invite_interview") {
      const { scheduled_at, duration_minutes, timezone, platform, meeting_link, instructions, interviewer_name } = body;
      if (!scheduled_at || !meeting_link) {
        return new Response(JSON.stringify({ error: "Interview date and meeting link are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const oldStatus = app.status;
      await supabase.from("interviews").insert({
        application_id: app.id,
        scheduled_at,
        duration_minutes: duration_minutes || 30,
        timezone: timezone || "Asia/Kolkata",
        platform: platform || null,
        meeting_link,
        instructions: instructions || null,
        interviewer_name: interviewer_name || null,
        status: "scheduled",
        created_by: user.id,
      });

      await supabase.from("applications").update({ status: "interview_invited" }).eq("id", app.id);

      await supabase.from("application_status_history").insert({
        application_id: app.id,
        old_status: oldStatus,
        new_status: "interview_invited",
        actor_id: user.id,
        note: `Interview scheduled for ${scheduled_at}`,
      });

      await supabase.from("activity_log").insert({
        actor_id: user.id,
        action: "interview_scheduled",
        target_type: "applications",
        target_id: app.id,
        summary: `Scheduled interview with ${app.full_name} (${app.application_code})`,
      });

      const tpl = await getTemplate(supabase, "interview_invitation");
      const interviewDate = new Date(scheduled_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const interviewTime = new Date(scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const emailBody = fillTemplate(tpl.body, {
        applicant_name: app.full_name,
        job_title: jobTitle,
        application_id: app.application_code,
        interview_date: interviewDate,
        interview_time: interviewTime,
        timezone: timezone || "Asia/Kolkata",
        interview_duration: String(duration_minutes || 30),
        meeting_link,
        additional_instructions: instructions || "",
      });
      const emailResult = await sendEmail(supabase, {
        to: app.email,
        subject: fillTemplate(tpl.subject, { job_title: jobTitle }),
        body: emailBody,
        templateKey: "interview_invitation",
        applicationId: app.id,
        sentBy: user.id,
      });

      return new Response(JSON.stringify({ success: true, email_sent: emailResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== RESCHEDULE INTERVIEW ==========
    if (action === "reschedule_interview") {
      const { interview_id, scheduled_at, duration_minutes, timezone, meeting_link, instructions } = body;
      if (!interview_id || !scheduled_at || !meeting_link) {
        return new Response(JSON.stringify({ error: "Interview ID, date, and meeting link required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabase.from("interviews").update({
        scheduled_at,
        duration_minutes: duration_minutes || 30,
        timezone: timezone || "Asia/Kolkata",
        meeting_link,
        instructions: instructions || null,
        status: "rescheduled",
        updated_at: new Date().toISOString(),
      }).eq("id", interview_id);

      await supabase.from("application_status_history").insert({
        application_id: app.id,
        old_status: app.status,
        new_status: "interview_invited",
        actor_id: user.id,
        note: `Interview rescheduled to ${scheduled_at}`,
      });

      const tpl = await getTemplate(supabase, "interview_rescheduled");
      const interviewDate = new Date(scheduled_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
      const interviewTime = new Date(scheduled_at).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
      const emailBody = fillTemplate(tpl.body, {
        applicant_name: app.full_name,
        job_title: jobTitle,
        application_id: app.application_code,
        interview_date: interviewDate,
        interview_time: interviewTime,
        timezone: timezone || "Asia/Kolkata",
        interview_duration: String(duration_minutes || 30),
        meeting_link,
        additional_instructions: instructions || "",
      });
      const emailResult = await sendEmail(supabase, {
        to: app.email,
        subject: fillTemplate(tpl.subject, { job_title: jobTitle }),
        body: emailBody,
        templateKey: "interview_rescheduled",
        applicationId: app.id,
        sentBy: user.id,
      });

      return new Response(JSON.stringify({ success: true, email_sent: emailResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== CANCEL INTERVIEW ==========
    if (action === "cancel_interview") {
      const { interview_id } = body;
      if (!interview_id) {
        return new Response(JSON.stringify({ error: "Interview ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: interview } = await supabase.from("interviews").select("scheduled_at").eq("id", interview_id).maybeSingle();

      await supabase.from("interviews").update({
        status: "cancelled",
        updated_at: new Date().toISOString(),
      }).eq("id", interview_id);

      await supabase.from("application_status_history").insert({
        application_id: app.id,
        old_status: app.status,
        new_status: "under_review",
        actor_id: user.id,
        note: "Interview cancelled",
      });

      await supabase.from("applications").update({ status: "under_review" }).eq("id", app.id);

      const tpl = await getTemplate(supabase, "interview_cancelled");
      const interviewDate = interview ? new Date(interview.scheduled_at).toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }) : "N/A";
      const emailBody = fillTemplate(tpl.body, {
        applicant_name: app.full_name,
        job_title: jobTitle,
        application_id: app.application_code,
        interview_date: interviewDate,
        contact_email: NOTIFY_EMAIL,
      });
      const emailResult = await sendEmail(supabase, {
        to: app.email,
        subject: fillTemplate(tpl.subject, { job_title: jobTitle }),
        body: emailBody,
        templateKey: "interview_cancelled",
        applicationId: app.id,
        sentBy: user.id,
      });

      return new Response(JSON.stringify({ success: true, email_sent: emailResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== REJECT ==========
    if (action === "reject") {
      if (app.status === "rejected") {
        return new Response(JSON.stringify({ error: "Application already rejected" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const { rejection_reason } = body;
      if (!rejection_reason) {
        return new Response(JSON.stringify({ error: "Rejection reason is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const oldStatus = app.status;
      await supabase.from("applications").update({
        status: "rejected",
        rejection_reason: String(rejection_reason).slice(0, 500),
        decision_at: new Date().toISOString(),
        assigned_reviewer: user.id,
      }).eq("id", app.id);

      await supabase.from("application_status_history").insert({
        application_id: app.id,
        old_status: oldStatus,
        new_status: "rejected",
        actor_id: user.id,
        note: `Rejected: ${rejection_reason}`,
      });

      await supabase.from("activity_log").insert({
        actor_id: user.id,
        action: "application_rejected",
        target_type: "applications",
        target_id: app.id,
        summary: `Rejected ${app.full_name} for ${jobTitle} (${app.application_code})`,
      });

      const tpl = await getTemplate(supabase, "application_rejection");
      const emailBody = fillTemplate(tpl.body, {
        applicant_name: app.full_name,
        job_title: jobTitle,
        application_id: app.application_code,
        rejection_reason: rejection_reason,
      });
      const emailResult = await sendEmail(supabase, {
        to: app.email,
        subject: fillTemplate(tpl.subject, { job_title: jobTitle }),
        body: emailBody,
        templateKey: "application_rejection",
        applicationId: app.id,
        sentBy: user.id,
      });

      return new Response(JSON.stringify({ success: true, email_sent: emailResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ========== RETRY EMAIL ==========
    if (action === "retry_email") {
      const { email_log_id } = body;
      if (!email_log_id) {
        return new Response(JSON.stringify({ error: "Email log ID required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: log } = await supabase.from("email_logs").select("*").eq("id", email_log_id).maybeSingle();
      if (!log) {
        return new Response(JSON.stringify({ error: "Email log not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const apiKeyEnv = Deno.env.get("RESEND_API_KEY");
      const fromEmail = Deno.env.get("RESEND_FROM_EMAIL") || "Team Synf <noreply@resend.dev>";

      if (!apiKeyEnv) {
        return new Response(JSON.stringify({ error: "RESEND_API_KEY not configured" }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      try {
        const res = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKeyEnv}`, "Content-Type": "application/json" },
          body: JSON.stringify({ from: fromEmail, to: log.to_address, subject: log.subject, text: log.payload?.body || "" }),
        });

        if (!res.ok) {
          const errText = await res.text();
          await supabase.from("email_logs").update({
            status: "failed",
            error: `Retry failed: ${res.status} ${errText}`,
            attempts: (log.attempts || 1) + 1,
          }).eq("id", email_log_id);
          return new Response(JSON.stringify({ success: false, error: "Retry failed" }), {
            status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        const resData = await res.json();
        await supabase.from("email_logs").update({
          status: "sent",
          provider_message_id: resData.id,
          attempts: (log.attempts || 1) + 1,
          error: null,
        }).eq("id", email_log_id);

        return new Response(JSON.stringify({ success: true }), {
          status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (err) {
        await supabase.from("email_logs").update({
          status: "failed",
          error: `Retry error: ${(err as Error).message}`,
          attempts: (log.attempts || 1) + 1,
        }).eq("id", email_log_id);
        return new Response(JSON.stringify({ success: false, error: "Retry failed" }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    }

    // ========== TEST EMAIL ==========
    if (action === "test_email") {
      const { template_key, to } = body;
      if (!template_key || !to) {
        return new Response(JSON.stringify({ error: "template_key and to are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const tpl = await getTemplate(supabase, template_key);
      const sampleVars: Record<string, string> = {
        applicant_name: "Test Applicant",
        job_title: "Test Role",
        application_id: "#SYNF-APP-000000",
        submission_date: new Date().toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
        interview_date: "Monday, January 1, 2027",
        interview_time: "4:00 PM",
        timezone: "Asia/Kolkata",
        interview_duration: "30",
        meeting_link: "https://meet.google.com/test-test-test",
        rejection_reason: "Test rejection reason",
        additional_instructions: "This is a test email.",
        contact_email: NOTIFY_EMAIL,
      };
      const emailResult = await sendEmail(supabase, {
        to,
        subject: `[TEST] ${fillTemplate(tpl.subject, sampleVars)}`,
        body: fillTemplate(tpl.body, sampleVars),
        templateKey: template_key,
        sentBy: user.id,
      });
      return new Response(JSON.stringify({ success: true, email_sent: emailResult.ok }), {
        status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
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
  opts: { to: string; subject: string; body: string; templateKey: string; applicationId?: string; sentBy?: string }
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
      sent_by: opts.sentBy,
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
        sent_by: opts.sentBy,
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
      sent_by: opts.sentBy,
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
      sent_by: opts.sentBy,
    });
    return { ok: false };
  }
}
