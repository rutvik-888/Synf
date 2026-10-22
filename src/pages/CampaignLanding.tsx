import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import type { CampaignRow, CampaignSectionRow } from '@/lib/platform-types';
import { Reveal } from '@/components/Reveal';
import { ArrowRight, ArrowLeft, Sparkles, Flame, Calendar } from 'lucide-react';
import { countdown, formatDate } from '@/lib/format';

export function CampaignLanding() {
  const { slug } = useParams<{ slug: string }>();
  const [campaign, setCampaign] = useState<CampaignRow | null>(null);
  const [sections, setSections] = useState<CampaignSectionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: c } = await supabase.from('campaigns').select('*').eq('slug', slug).eq('landing_page_visible', true).in('status', ['live', 'completed']).maybeSingle();
      if (c) {
        setCampaign(c as CampaignRow);
        const { data: secs } = await supabase.from('campaign_sections').select('*').eq('campaign_id', (c as CampaignRow).id).eq('is_enabled', true).order('sort_order');
        setSections((secs as CampaignSectionRow[]) || []);
      }
      setLoading(false);
    })();
  }, [slug]);

  if (loading) return <div className="bg-ink-950 min-h-screen" />;
  if (!campaign) return (
    <div className="bg-ink-950 grid min-h-screen place-items-center">
      <div className="text-center">
        <h1 className="font-display text-6xl font-extrabold tracking-tightest">404</h1>
        <p className="mt-4 text-white/50">Campaign not found or not live.</p>
        <Link to="/" className="btn-ghost mt-6 inline-flex">Back home</Link>
      </div>
    </div>
  );

  const cd = campaign.start_date ? countdown(campaign.start_date) : null;

  return (
    <div className="bg-ink-950 min-h-screen">
      <section className="relative overflow-hidden">
        {campaign.cover_image_url && (
          <div className="absolute inset-0">
            <img src={campaign.cover_image_url} alt={campaign.name} className="h-full w-full object-cover opacity-35" />
            <div className="absolute inset-0 bg-gradient-to-b from-ink-950/50 via-ink-950/70 to-ink-950" />
          </div>
        )}
        <div className="absolute -left-40 top-0 h-[35rem] w-[35rem] rounded-full bg-synf-500/15 blur-[130px] animate-float" />
        <div className="absolute -right-40 bottom-0 h-[28rem] w-[28rem] rounded-full bg-violet-500/15 blur-[110px] animate-float" style={{ animationDelay: '5s' }} />
        <div className="grain pointer-events-none absolute inset-0 opacity-15" />

        <div className="container-synf relative py-24 sm:py-32">
          <span className="font-mono text-xs uppercase tracking-[0.3em] text-synf-400"><Sparkles size={14} className="inline" /> Campaign</span>
          <h1 className="mt-4 font-display text-5xl font-extrabold leading-[0.85] tracking-tightest sm:text-7xl lg:text-8xl">{campaign.headline || campaign.name}</h1>
          {campaign.subheadline && <p className="mt-4 max-w-2xl text-xl text-white/70">{campaign.subheadline}</p>}
          {cd && !cd.past && (
            <div className="mt-10 inline-flex items-center gap-6 rounded-2xl border border-synf-500/30 bg-ink-900/70 p-6 backdrop-blur-sm animate-glow-pulse">
              <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-synf-400"><Flame size={14} /> Starts in</div>
              <div className="flex items-center gap-4 font-mono">
                {[['Days', cd.days], ['Hours', cd.hours], ['Mins', cd.mins], ['Secs', cd.secs]].map(([l, v]) => (
                  <div key={l as string} className="text-center">
                    <span className="font-display text-3xl font-extrabold text-white">{String(v).padStart(2, '0')}</span>
                    <span className="block text-[10px] text-ink-500">{l}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {campaign.cta_label && campaign.cta_url && (
            <div className="mt-8"><a href={campaign.cta_url} target="_blank" rel="noopener noreferrer" className="btn-primary btn-lg group">{campaign.cta_label} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></a></div>
          )}
        </div>
      </section>

      {sections.map((s, i) => (
        <CampaignSection key={s.id} section={s} index={i} />
      ))}

      {sections.length === 0 && campaign.description && (
        <section className="container-synf py-16">
          <p className="mx-auto max-w-3xl text-xl leading-relaxed text-white/80">{campaign.description}</p>
        </section>
      )}
    </div>
  );
}

function CampaignSection({ section, index }: { section: CampaignSectionRow; index: number }) {
  const config = section.config || {};
  const isAlt = index % 2 === 1;

  if (section.section_type === 'editorial_text') {
    return (
      <section className="container-synf py-16">
        <Reveal>
          {section.title && <h2 className="mb-6 font-display text-3xl font-extrabold tracking-tight">{section.title}</h2>}
          <p className="max-w-3xl text-xl leading-relaxed text-white/80">{(config.text as string) || ''}</p>
        </Reveal>
      </section>
    );
  }

  if (section.section_type === 'media_gallery' && Array.isArray(config.images)) {
    return (
      <section className="container-synf py-16">
        {section.title && <Reveal><h2 className="mb-8 font-display text-3xl font-extrabold tracking-tight">{section.title}</h2></Reveal>}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(config.images as Array<{ url: string; alt?: string }>).map((img, i) => (
            <Reveal key={i} delay={i * 80}>
              <div className="overflow-hidden rounded-xl">
                <img src={img.url} alt={img.alt || ''} className="w-full object-cover transition-transform duration-700 hover:scale-105" />
              </div>
            </Reveal>
          ))}
        </div>
      </section>
    );
  }

  if (section.section_type === 'cta') {
    return (
      <section className="container-synf py-16">
        <Reveal>
          <div className="rounded-3xl border border-synf-500/30 bg-gradient-to-br from-synf-600/15 via-ink-900 to-ink-950 p-10 text-center sm:p-16">
            {section.title && <h2 className="font-display text-3xl font-extrabold tracking-tight sm:text-5xl">{section.title}</h2>}
            {(config.text as string) && <p className="mt-4 text-white/70">{config.text as string}</p>}
            {(config.cta_label as string) && (config.cta_url as string) && (
              <a href={config.cta_url as string} target="_blank" rel="noopener noreferrer" className="btn-primary btn-lg mt-8 group">{config.cta_label as string} <ArrowRight size={16} className="transition-transform group-hover:translate-x-1" /></a>
            )}
          </div>
        </Reveal>
      </section>
    );
  }

  if (section.section_type === 'countdown' && (config.target_date as string)) {
    const cd = countdown(config.target_date as string);
    return (
      <section className={`py-16 ${isAlt ? 'bg-ink-900/40' : ''}`}>
        <div className="container-synf text-center">
          {section.title && <h2 className="mb-8 font-display text-3xl font-extrabold tracking-tight">{section.title}</h2>}
          {cd && !cd.past && (
            <div className="inline-flex items-center gap-8 rounded-2xl border border-synf-500/30 bg-ink-900/70 p-8">
              {[['Days', cd.days], ['Hours', cd.hours], ['Mins', cd.mins], ['Secs', cd.secs]].map(([l, v]) => (
                <div key={l as string} className="text-center">
                  <span className="font-display text-4xl font-extrabold text-white sm:text-5xl">{String(v).padStart(2, '0')}</span>
                  <span className="block mt-1 text-xs text-ink-500">{l}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    );
  }

  return null;
}
