// ============================================================
// Platform Expansion Types
// ============================================================

export interface BrandConfigRow {
  id: string;
  key: string;
  value: Record<string, unknown>;
  is_active: boolean;
  updated_at: string;
  created_at: string;
}

export interface BrandThemeRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  config: Record<string, unknown>;
  is_system: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FrequencyCategoryRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type ArticleStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'archived';

export const ARTICLE_STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  published: 'Published',
  archived: 'Archived',
};

export interface FrequencyArticleRow {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  excerpt: string | null;
  body: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  gallery: Array<{ url: string; alt?: string; caption?: string }> | null;
  embedded_media: Array<{ type: string; url: string; title?: string }> | null;
  category_id: string | null;
  tags: string[] | null;
  author_name: string | null;
  author_id: string | null;
  status: ArticleStatus;
  is_featured: boolean;
  is_pinned: boolean;
  layout: string;
  seo_title: string | null;
  seo_description: string | null;
  seo_image_url: string | null;
  published_at: string | null;
  scheduled_for: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: FrequencyCategoryRow | null;
}

export interface InsideStoryTypeRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type StoryStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'published' | 'archived';

export interface InsideStoryRow {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  body: string | null;
  cover_image_url: string | null;
  cover_image_alt: string | null;
  gallery: Array<{ url: string; alt?: string; caption?: string }> | null;
  story_type_id: string | null;
  tags: string[] | null;
  contributor_credits: Array<{ name: string; role?: string }> | null;
  related_person_id: string | null;
  related_event_id: string | null;
  status: StoryStatus;
  is_featured: boolean;
  published_at: string | null;
  scheduled_for: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  story_type?: InsideStoryTypeRow | null;
}

export interface CommunityProfileRow {
  id: string;
  user_id: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
  interests: string[] | null;
  preferred_categories: string[] | null;
  social_links: Array<{ label: string; url: string }> | null;
  is_public: boolean;
  notification_preferences: Record<string, boolean> | null;
  created_at: string;
  updated_at: string;
}

export interface SavedEventRow {
  id: string;
  user_id: string;
  event_id: string;
  created_at: string;
}

export interface AttendanceBadgeRow {
  id: string;
  user_id: string;
  event_id: string;
  verified_by: string | null;
  verified_at: string;
  method: string;
}

export interface CommunityWallCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type WallPostStatus = 'pending' | 'approved' | 'rejected' | 'archived' | 'removed';

export const WALL_STATUS_LABELS: Record<WallPostStatus, string> = {
  pending: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  archived: 'Archived',
  removed: 'Removed',
};

export interface CommunityWallPostRow {
  id: string;
  media_url: string;
  media_type: 'image' | 'video';
  thumbnail_url: string | null;
  caption: string | null;
  category_id: string | null;
  event_id: string | null;
  campaign_id: string | null;
  contributor_name: string | null;
  contributor_user_id: string | null;
  is_anonymous: boolean;
  status: WallPostStatus;
  consent_confirmed: boolean;
  contact_email: string | null;
  moderation_notes: string | null;
  moderated_by: string | null;
  moderated_at: string | null;
  is_featured: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
  category?: CommunityWallCategoryRow | null;
}

export type CampaignStatus = 'draft' | 'in_review' | 'approved' | 'scheduled' | 'live' | 'paused' | 'completed' | 'archived';

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  scheduled: 'Scheduled',
  live: 'Live',
  paused: 'Paused',
  completed: 'Completed',
  archived: 'Archived',
};

export interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  internal_notes: string | null;
  category: string | null;
  tags: string[] | null;
  owner_id: string | null;
  status: CampaignStatus;
  theme_id: string | null;
  start_date: string | null;
  end_date: string | null;
  timezone: string;
  hero_media_url: string | null;
  poster_url: string | null;
  cover_image_url: string | null;
  gallery: Array<{ url: string; alt?: string }> | null;
  headline: string | null;
  subheadline: string | null;
  cta_label: string | null;
  cta_url: string | null;
  landing_page_visible: boolean;
  social_title: string | null;
  social_description: string | null;
  social_image_url: string | null;
  utm_params: Record<string, string> | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  sections?: CampaignSectionRow[];
}

export interface CampaignSectionRow {
  id: string;
  campaign_id: string;
  section_type: string;
  title: string | null;
  config: Record<string, unknown>;
  sort_order: number;
  is_enabled: boolean;
  created_at: string;
}

export interface CampaignRelationRow {
  id: string;
  campaign_id: string;
  related_type: string;
  related_id: string;
  sort_order: number;
  created_at: string;
}

export interface GoodsCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export type GoodsAvailability = 'coming_soon' | 'available' | 'limited' | 'sold_out' | 'discontinued';

export const GOODS_AVAILABILITY_LABELS: Record<GoodsAvailability, string> = {
  coming_soon: 'Coming Soon',
  available: 'Available',
  limited: 'Limited Availability',
  sold_out: 'Sold Out',
  discontinued: 'Discontinued',
};

export interface GoodsProductRow {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category_id: string | null;
  images: Array<{ url: string; alt?: string }> | null;
  price: number | null;
  currency: string;
  availability_status: GoodsAvailability;
  external_purchase_url: string | null;
  tags: string[] | null;
  is_featured: boolean;
  campaign_id: string | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: GoodsCategoryRow | null;
  variants?: GoodsVariantRow[];
}

export interface GoodsVariantRow {
  id: string;
  product_id: string;
  variant_type: string;
  variant_value: string;
  sort_order: number;
  created_at: string;
}

export interface SecretDropRow {
  id: string;
  slug: string;
  title: string;
  teaser_description: string | null;
  poster_url: string | null;
  teaser_media_url: string | null;
  reveal_at: string | null;
  timezone: string;
  campaign_id: string | null;
  related_event_id: string | null;
  related_product_id: string | null;
  status: 'draft' | 'scheduled' | 'live' | 'paused' | 'completed' | 'cancelled' | 'archived';
  is_visible: boolean;
  allow_notifications: boolean;
  sort_order: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  stages?: SecretDropStageRow[];
}

export interface SecretDropStageRow {
  id: string;
  drop_id: string;
  stage_number: number;
  stage_name: string;
  stage_text: string | null;
  media_url: string | null;
  cta_label: string | null;
  cta_url: string | null;
  reveal_at: string | null;
  is_revealed: boolean;
  created_at: string;
}

export interface EventFaqCategoryRow {
  id: string;
  name: string;
  slug: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
}

export interface EventFaqRow {
  id: string;
  event_id: string;
  category_id: string | null;
  question: string;
  answer: string;
  sort_order: number;
  is_published: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  category?: EventFaqCategoryRow | null;
}

export interface SiteSectionRow {
  id: string;
  key: string;
  label: string;
  is_visible: boolean;
  sort_order: number;
  updated_by: string | null;
  updated_at: string;
  created_at: string;
}
