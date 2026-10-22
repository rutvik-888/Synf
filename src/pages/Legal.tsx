import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { SiteContentRow } from '@/lib/types';
import { Reveal } from '@/components/Reveal';
import { FileText, Shield, Copyright } from 'lucide-react';
import { Link } from 'react-router-dom';

const META = {
  terms: { slug: 'terms', title: 'Terms', icon: FileText },
  privacy: { slug: 'privacy', title: 'Privacy Policy', icon: Shield },
  copyright: { slug: 'copyright', title: 'Copyright', icon: Copyright },
};

const DEFAULTS: Record<string, string> = {
  terms: `# Terms of Use

Welcome to Team Synf. By using this website you agree to these terms.

1. This site provides event information and links to external ticketing platforms. We do not sell tickets directly and are not responsible for third-party ticket providers.
2. Events may change, be postponed or cancelled. Always check the official event link before purchasing.
3. Don't submit abusive, illegal or spam content through our forms. We may ignore or block such submissions.
4. We may update these terms at any time. Continued use means you accept the updated terms.

This is draft legal text and should be reviewed by a qualified professional before launch. No registered legal entity or jurisdiction is claimed.`,
  privacy: `# Privacy Policy

We collect only what we need to run events and respond to enquiries.

1. Enquiries & applications: we store the information you submit to review and respond to it.
2. Insider list: we store your email (and optional first name) with your consent. You can unsubscribe at any time.
3. We do not sell your data.
4. You can request access to or deletion of your data by contacting us.
5. Consent is recorded with each submission.

This is draft legal text and should be reviewed by a qualified professional before launch. No registered legal entity or jurisdiction is claimed.`,
  copyright: `# Copyright

All content on this site — including event posters, photography, copy and design — is owned by Team Synf or used with permission.

Photographer, artist and collaborator credits are preserved where provided.

Do not reproduce, republish or reuse content from this site without written permission. To license or request use, contact us at synf.c@com.gh.

This is draft legal text and should be reviewed before launch.`,
};

export function Legal({ kind }: { kind: 'terms' | 'privacy' | 'copyright' }) {
  const meta = META[kind];
  const [content, setContent] = useState<SiteContentRow | null>(null);
  const [loading, setLoading] = useState(true);
  const Icon = meta.icon;

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('site_content').select('*').eq('slug', meta.slug).maybeSingle();
      setContent(data as SiteContentRow | null);
      setLoading(false);
    })();
  }, [meta.slug]);

  const body = content?.body || DEFAULTS[kind];

  return (
    <div className="bg-ink-950">
      <section className="container-synf py-24">
        <Reveal className="section-eyebrow"><Icon size={14} /> Legal</Reveal>
        <Reveal><h1 className="display-xl text-[clamp(2rem,7vw,5rem)]">{meta.title}</h1></Reveal>
      </section>
      <section className="container-synf pb-24">
        {loading ? <div className="h-64 animate-pulse rounded-2xl bg-ink-900" /> : (
          <Reveal>
            <div className="max-w-3xl whitespace-pre-wrap text-lg leading-relaxed text-white/75">{body}</div>
            <div className="mt-10 flex gap-3">
              {Object.values(META).filter(m => m.slug !== meta.slug).map(m => (
                <Link key={m.slug} to={`/${m.slug}`} className="btn-ghost">{m.title}</Link>
              ))}
            </div>
          </Reveal>
        )}
      </section>
    </div>
  );
}
