import { useEffect } from 'react';

const SITE_URL = 'https://synf.bolt.host';
const SITE_NAME = 'Team Synf';
const DEFAULT_DESC = 'Team Synf — student-led creative collective in Hyderabad. Parties, nightlife, DJ nights, music events and curated experiences. We don\'t do ordinary.';
const DEFAULT_OG_IMAGE = '/synf-mark.svg';

interface SeoOptions {
  title: string;
  description?: string;
  path?: string;
  image?: string;
  type?: 'website' | 'article' | 'profile' | 'music.event';
  publishedTime?: string;
  modifiedTime?: string;
  author?: string;
  keywords?: string[];
  noindex?: boolean;
  jsonLd?: object | object[];
}

function ensureMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector(`meta[${attr}="${key}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function ensureLink(rel: string, href: string) {
  let el = document.head.querySelector(`link[rel="${rel}"]`) as HTMLLinkElement | null;
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function ensureJsonLd(id: string, data: object | object[]) {
  let el = document.getElementById(id) as HTMLScriptElement | null;
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

function removeJsonLd(id: string) {
  document.getElementById(id)?.remove();
}

export function useSeo(opts: SeoOptions) {
  const { title, description, path, image, type, publishedTime, modifiedTime, author, keywords, noindex, jsonLd } = opts;

  useEffect(() => {
    const fullTitle = title.includes(SITE_NAME) ? title : `${title} — ${SITE_NAME}`;
    const desc = description || DEFAULT_DESC;
    const url = path ? `${SITE_URL}${path}` : SITE_URL;
    const img = image || `${SITE_URL}${DEFAULT_OG_IMAGE}`;
    const ogType = type || 'website';

    document.title = fullTitle;
    ensureMeta('name', 'description', desc);

    if (keywords && keywords.length) {
      ensureMeta('name', 'keywords', keywords.join(', '));
    }

    ensureLink('canonical', url);

    if (noindex) {
      ensureMeta('name', 'robots', 'noindex, nofollow');
    } else {
      ensureMeta('name', 'robots', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    ensureMeta('name', 'author', author || SITE_NAME);

    ensureMeta('property', 'og:title', fullTitle);
    ensureMeta('property', 'og:description', desc);
    ensureMeta('property', 'og:type', ogType);
    ensureMeta('property', 'og:url', url);
    ensureMeta('property', 'og:site_name', SITE_NAME);
    ensureMeta('property', 'og:image', img);
    ensureMeta('property', 'og:locale', 'en_IN');

    if (publishedTime) ensureMeta('property', 'article:published_time', publishedTime);
    if (modifiedTime) ensureMeta('property', 'article:modified_time', modifiedTime);

    ensureMeta('name', 'twitter:card', 'summary_large_image');
    ensureMeta('name', 'twitter:title', fullTitle);
    ensureMeta('name', 'twitter:description', desc);
    ensureMeta('name', 'twitter:image', img);
    ensureMeta('name', 'twitter:site', '@team.synf');

    // JSON-LD
    if (jsonLd) {
      const arr = Array.isArray(jsonLd) ? jsonLd : [jsonLd];
      arr.forEach((d, i) => ensureJsonLd(`seo-jsonld-${i}`, d));
      // Clean up any extra from previous render
      for (let i = arr.length; i < 10; i++) removeJsonLd(`seo-jsonld-${i}`);
    } else {
      for (let i = 0; i < 10; i++) removeJsonLd(`seo-jsonld-${i}`);
    }

    return () => {
      // Clean up JSON-LD on unmount
      for (let i = 0; i < 10; i++) removeJsonLd(`seo-jsonld-${i}`);
    };
  }, [title, description, path, image, type, publishedTime, modifiedTime, author, keywords, noindex, jsonLd]);
}

// Pre-built JSON-LD generators

export function organizationJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: SITE_URL,
    description: DEFAULT_DESC,
    sameAs: [
      'https://www.instagram.com/team.synf/',
    ],
    logo: `${SITE_URL}/synf-mark.svg`,
  };
}

export function websiteJsonLd() {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: SITE_NAME,
    url: SITE_URL,
    potentialAction: {
      '@type': 'SearchAction',
      target: `${SITE_URL}/events?q={search_term_string}`,
      'query-input': 'required name=search_term_string',
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: item.name,
      item: `${SITE_URL}${item.path}`,
    })),
  };
}

export function eventJsonLd(ev: {
  title: string;
  subtitle?: string | null;
  description?: string | null;
  start_at?: string | null;
  end_at?: string | null;
  status: string;
  venue_name?: string | null;
  venue_city?: string | null;
  venue_address?: string | null;
  cover_image_url?: string | null;
  ticket_url?: string | null;
  music_genres?: string[] | null;
  slug: string;
  credits?: { name: string; role: string }[];
}) {
  const url = `${SITE_URL}/events/${ev.slug}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'MusicEvent',
    name: ev.title,
    description: ev.subtitle || ev.description || '',
    startDate: ev.start_at || undefined,
    endDate: ev.end_at || undefined,
    eventStatus: ev.status === 'cancelled' ? 'https://schema.org/EventCancelled'
      : ev.status === 'postponed' ? 'https://schema.org/EventPostponed'
      : 'https://schema.org/EventScheduled',
    eventAttendanceMode: 'https://schema.org/OfflineEventAttendanceMode',
    url,
    image: ev.cover_image_url || undefined,
    location: {
      '@type': 'Place',
      name: ev.venue_name || 'Venue TBC',
      address: {
        '@type': 'PostalAddress',
        addressLocality: ev.venue_city || undefined,
        streetAddress: ev.venue_address || undefined,
        addressCountry: 'IN',
      },
    },
    offers: ev.ticket_url ? {
      '@type': 'Offer',
      url: ev.ticket_url,
      availability: ev.status === 'sold_out' ? 'https://schema.org/SoldOut' : 'https://schema.org/InStock',
      validFrom: ev.start_at || undefined,
    } : undefined,
    genre: ev.music_genres || undefined,
    performer: ev.credits
      ?.filter(c => /dj|artist|performer|headlin/i.test(c.role))
      .map(c => ({ '@type': 'Person', name: c.name })),
    organizer: {
      '@type': 'Organization',
      name: SITE_NAME,
      url: SITE_URL,
    },
  };
}

export function personJsonLd(person: {
  name: string;
  role?: string | null;
  bio?: string | null;
  slug: string;
  portrait_url?: string | null;
  instagram_url?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: person.name,
    jobTitle: person.role || undefined,
    description: person.bio || undefined,
    url: `${SITE_URL}/people`,
    image: person.portrait_url || undefined,
    sameAs: person.instagram_url ? [person.instagram_url] : undefined,
  };
}

export function jobPostingJsonLd(job: {
  title: string;
  description: string;
  slug: string;
  department?: string | null;
  location?: string | null;
  employment_type?: string | null;
  posted_at?: string | null;
  status: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'JobPosting',
    title: job.title,
    description: job.description,
    datePosted: job.posted_at || new Date().toISOString(),
    hiringOrganization: {
      '@type': 'Organization',
      name: SITE_NAME,
      sameAs: SITE_URL,
    },
    jobLocation: {
      '@type': 'Place',
      address: {
        '@type': 'PostalAddress',
        addressLocality: job.location || 'Hyderabad',
        addressCountry: 'IN',
      },
    },
    employmentType: job.employment_type || 'PART_TIME',
    validThrough: job.status === 'closed' ? new Date().toISOString() : undefined,
  };
}

export function productJsonLd(product: {
  name: string;
  description?: string | null;
  slug: string;
  price?: number | null;
  currency?: string;
  images?: Array<{ url: string; alt?: string }> | null;
  availability_status?: string;
  external_purchase_url?: string | null;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description || '',
    image: product.images?.map(i => i.url) || undefined,
    offers: {
      '@type': 'Offer',
      url: product.external_purchase_url || `${SITE_URL}/goods/${product.slug}`,
      price: product.price || 0,
      priceCurrency: product.currency || 'INR',
      availability: product.availability_status === 'out_of_stock'
        ? 'https://schema.org/OutOfStock'
        : 'https://schema.org/InStock',
    },
    brand: { '@type': 'Brand', name: SITE_NAME },
  };
}

export function collectionPageJsonLd(name: string, path: string, itemCount?: number) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name,
    url: `${SITE_URL}${path}`,
    numberOfItems: itemCount,
    isPartOf: { '@type': 'WebSite', name: SITE_NAME, url: SITE_URL },
  };
}

export { SITE_URL, SITE_NAME };
