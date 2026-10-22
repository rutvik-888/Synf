import { SUPABASE_URL } from './supabase';
import { supabase } from './supabase';

export async function adminSignup(body: { email: string; password: string; fullName: string; inviteCode: string }): Promise<{ success?: boolean; role?: string; founder?: boolean; default_secret?: string; message?: string; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/admin-signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Signup failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' }
  }
}

export async function submitPublicForm(body: Record<string, unknown>): Promise<{ success?: boolean; error?: string; reference_number?: string; emailSent?: boolean }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/public-form`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Submission failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' }
  }
}

export async function submitApplication(body: {
  job_id: string;
  full_name: string;
  email: string;
  phone?: string;
  instagram?: string;
  city?: string;
  preferred_role?: string;
  answers: Record<string, unknown>;
  consent_text: string;
  attachment_url?: string;
  company_website?: string;
}): Promise<{ success?: boolean; application_id?: string; email_sent?: boolean; error?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/application-submit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Application submission failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' }
  }
}

export async function applicationAction(body: {
  action: 'approve' | 'under_review' | 'invite_interview' | 'reschedule_interview' | 'cancel_interview' | 'reject' | 'retry_email';
  application_id: string;
  note?: string;
  rejection_reason?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  timezone?: string;
  platform?: string;
  meeting_link?: string;
  instructions?: string;
  interviewer_name?: string;
  interview_id?: string;
  email_log_id?: string;
}): Promise<{ success?: boolean; email_sent?: boolean; error?: string }> {
  try {
    const { data: session } = await supabase.auth.getSession();
    const token = session.session?.access_token || '';
    const res = await fetch(`${SUPABASE_URL}/functions/v1/application-action`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        'apikey': token,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Action failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' }
  }
}

// ============================================================
// Team Accounts API
// ============================================================

async function getAuthHeaders(): Promise<Record<string, string>> {
  const { data: session } = await supabase.auth.getSession();
  const token = session.session?.access_token || '';
  return {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`,
  };
}

export async function teamAccountsAction(body: Record<string, unknown>): Promise<{ success?: boolean; error?: string; [key: string]: unknown }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/team-accounts`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Action failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function loginSecretAction(body: Record<string, unknown>): Promise<{ success?: boolean; valid?: boolean; error?: string; [key: string]: unknown }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/login-secret`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Action failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}

export async function rolesPermissionsAction(body: Record<string, unknown>): Promise<{ success?: boolean; error?: string; [key: string]: unknown }> {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${SUPABASE_URL}/functions/v1/roles-permissions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) return { error: data.error || 'Action failed' };
    return data;
  } catch {
    return { error: 'Network error. Please try again.' };
  }
}
