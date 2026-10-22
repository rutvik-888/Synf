import { lazy, Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from '@/lib/auth';
import { ScrollToTop } from '@/components/ScrollToTop';
import { SiteLayout } from '@/components/SiteLayout';
import { AdminLayout } from '@/components/AdminLayout';
import { CrewLayout } from '@/components/CrewLayout';
import { CustomCursor } from '@/components/CustomCursor';
import { IntroScreen } from '@/components/IntroScreen';
import { RouteVisibilityGuard } from '@/components/RouteVisibilityGuard';
import { Home } from '@/pages/Home';
import { fetchLaunchConfig, isLaunchActive, type LaunchConfig } from '@/lib/launchConfig';
import { ComingSoon } from '@/pages/ComingSoon';

const EventsArchive = lazy(() => import('@/pages/EventsArchive').then(m => ({ default: m.EventsArchive })));
const EventDetail = lazy(() => import('@/pages/EventDetail').then(m => ({ default: m.EventDetail })));
const About = lazy(() => import('@/pages/About').then(m => ({ default: m.About })));
const People = lazy(() => import('@/pages/People').then(m => ({ default: m.People })));
const Collaborate = lazy(() => import('@/pages/Collaborate').then(m => ({ default: m.Collaborate })));
const Apply = lazy(() => import('@/pages/Apply').then(m => ({ default: m.Apply })));
const Jobs = lazy(() => import('@/pages/Jobs').then(m => ({ default: m.Jobs })));
const JobDetail = lazy(() => import('@/pages/JobDetail').then(m => ({ default: m.JobDetail })));
const JobApply = lazy(() => import('@/pages/JobApply').then(m => ({ default: m.JobApply })));
const Contact = lazy(() => import('@/pages/Contact').then(m => ({ default: m.Contact })));
const Legal = lazy(() => import('@/pages/Legal').then(m => ({ default: m.Legal })));
const NotFound = lazy(() => import('@/pages/NotFound').then(m => ({ default: m.NotFound })));
const CommunityWall = lazy(() => import('@/pages/CommunityWall').then(m => ({ default: m.CommunityWall })));
const Goods = lazy(() => import('@/pages/Goods').then(m => ({ default: m.Goods })));
const GoodsProductDetail = lazy(() => import('@/pages/Goods').then(m => ({ default: m.GoodsProductDetail })));
const SynfPass = lazy(() => import('@/pages/SynfPass').then(m => ({ default: m.SynfPass })));
const CampaignLanding = lazy(() => import('@/pages/CampaignLanding').then(m => ({ default: m.CampaignLanding })));

const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin').then(m => ({ default: m.AdminLogin })));
const AdminSignup = lazy(() => import('@/pages/admin/AdminSignup').then(m => ({ default: m.AdminSignup })));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard').then(m => ({ default: m.AdminDashboard })));
const AdminEvents = lazy(() => import('@/pages/admin/AdminEvents').then(m => ({ default: m.AdminEvents })));
const AdminEventEdit = lazy(() => import('@/pages/admin/AdminEventEdit').then(m => ({ default: m.AdminEventEdit })));
const AdminEnquiries = lazy(() => import('@/pages/admin/AdminEnquiries').then(m => ({ default: m.AdminEnquiries })));
const AdminApplications = lazy(() => import('@/pages/admin/AdminApplications').then(m => ({ default: m.AdminApplications })));
const AdminApplicationDetail = lazy(() => import('@/pages/admin/AdminApplicationDetail').then(m => ({ default: m.AdminApplicationDetail })));
const AdminJobs = lazy(() => import('@/pages/admin/AdminJobs').then(m => ({ default: m.AdminJobs })));
const AdminJobEdit = lazy(() => import('@/pages/admin/AdminJobEdit').then(m => ({ default: m.AdminJobEdit })));
const AdminEmailTemplates = lazy(() => import('@/pages/admin/AdminEmailTemplates').then(m => ({ default: m.AdminEmailTemplates })));
const AdminPeople = lazy(() => import('@/pages/admin/AdminPeople').then(m => ({ default: m.AdminPeople })));
const AdminTeam = lazy(() => import('@/pages/admin/AdminTeam').then(m => ({ default: m.AdminTeam })));
const AdminTeamOverview = lazy(() => import('@/pages/admin/AdminTeamOverview').then(m => ({ default: m.AdminTeamOverview })));
const AdminRoles = lazy(() => import('@/pages/admin/AdminRoles').then(m => ({ default: m.AdminRoles })));
const AdminInvitations = lazy(() => import('@/pages/admin/AdminInvitations').then(m => ({ default: m.AdminInvitations })));
const AdminSecurity = lazy(() => import('@/pages/admin/AdminSecurity').then(m => ({ default: m.AdminSecurity })));
const AdminFounder = lazy(() => import('@/pages/admin/AdminFounder').then(m => ({ default: m.AdminFounder })));
const AccountSetup = lazy(() => import('@/pages/admin/AccountSetup').then(m => ({ default: m.AccountSetup })));
const AdminContent = lazy(() => import('@/pages/admin/AdminContent').then(m => ({ default: m.AdminContent })));
const AdminContactSettings = lazy(() => import('@/pages/admin/AdminContactSettings').then(m => ({ default: m.AdminContactSettings })));
const AdminCommunity = lazy(() => import('@/pages/admin/AdminCommunity').then(m => ({ default: m.AdminCommunity })));
const AdminGoods = lazy(() => import('@/pages/admin/AdminGoods').then(m => ({ default: m.AdminGoods })));
const AdminGoodsEdit = lazy(() => import('@/pages/admin/AdminGoodsEdit').then(m => ({ default: m.AdminGoodsEdit })));
const AdminCampaigns = lazy(() => import('@/pages/admin/AdminCampaigns').then(m => ({ default: m.AdminCampaigns })));
const AdminContentCalendar = lazy(() => import('@/pages/admin/AdminContentCalendar').then(m => ({ default: m.AdminContentCalendar })));
const AdminBrandStudio = lazy(() => import('@/pages/admin/AdminBrandStudio').then(m => ({ default: m.AdminBrandStudio })));
const AdminSiteSections = lazy(() => import('@/pages/admin/AdminSiteSections').then(m => ({ default: m.AdminSiteSections })));
const AdminShopify = lazy(() => import('@/pages/admin/AdminShopify').then(m => ({ default: m.AdminShopify })));
const CrewPortal = lazy(() => import('@/pages/crew/CrewPortal').then(m => ({ default: m.CrewPortal })));

function PageFallback() {
  return <div className="min-h-screen bg-ink-950" />;
}

function SiteChrome() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin') || pathname.startsWith('/crew')) return null;
  return (
    <>
      <CustomCursor />
      <IntroScreen />
    </>
  );
}

function LaunchGate() {
  const { pathname } = useLocation();
  const [config, setConfig] = useState<LaunchConfig | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetchLaunchConfig().then(c => {
      setConfig(c);
      setChecked(true);
    });
  }, []);

  // Don't gate admin, crew, or campaign/legal pages — those need to stay accessible
  const exempt = pathname.startsWith('/admin') ||
    pathname.startsWith('/crew') ||
    pathname.startsWith('/campaigns/') ||
    pathname.startsWith('/terms') ||
    pathname.startsWith('/privacy') ||
    pathname.startsWith('/copyright');

  if (exempt || !checked) return null;
  if (!isLaunchActive(config)) return null;

  return <ComingSoon config={config!} onLaunch={() => window.location.reload()} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route element={<SiteLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/events" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><EventsArchive /></RouteVisibilityGuard></Suspense>} />
            <Route path="/events/:slug" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><EventDetail /></RouteVisibilityGuard></Suspense>} />
            <Route path="/about" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><About /></RouteVisibilityGuard></Suspense>} />
            <Route path="/people" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><People /></RouteVisibilityGuard></Suspense>} />
            <Route path="/collaborate" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><Collaborate /></RouteVisibilityGuard></Suspense>} />
            <Route path="/apply" element={<Suspense fallback={<PageFallback />}><Apply /></Suspense>} />
            <Route path="/jobs" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><Jobs /></RouteVisibilityGuard></Suspense>} />
            <Route path="/jobs/:slug" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><JobDetail /></RouteVisibilityGuard></Suspense>} />
            <Route path="/jobs/:slug/apply" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><JobApply /></RouteVisibilityGuard></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><Contact /></RouteVisibilityGuard></Suspense>} />
            <Route path="/frequency" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
            <Route path="/frequency/:slug" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
            <Route path="/inside-synf" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
            <Route path="/inside-synf/:slug" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
            <Route path="/community" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><CommunityWall /></RouteVisibilityGuard></Suspense>} />
            <Route path="/goods" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><Goods /></RouteVisibilityGuard></Suspense>} />
            <Route path="/goods/:slug" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><GoodsProductDetail /></RouteVisibilityGuard></Suspense>} />
            <Route path="/drops" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
            <Route path="/drops/:slug" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
            <Route path="/pass" element={<Suspense fallback={<PageFallback />}><RouteVisibilityGuard><SynfPass /></RouteVisibilityGuard></Suspense>} />
            <Route path="/campaigns/:slug" element={<Suspense fallback={<PageFallback />}><CampaignLanding /></Suspense>} />
            <Route path="/terms" element={<Suspense fallback={<PageFallback />}><Legal kind="terms" /></Suspense>} />
            <Route path="/privacy" element={<Suspense fallback={<PageFallback />}><Legal kind="privacy" /></Suspense>} />
            <Route path="/copyright" element={<Suspense fallback={<PageFallback />}><Legal kind="copyright" /></Suspense>} />
            <Route path="*" element={<Suspense fallback={<PageFallback />}><NotFound /></Suspense>} />
          </Route>

          <Route path="/admin/login" element={<Suspense fallback={<PageFallback />}><AdminLogin /></Suspense>} />
          <Route path="/admin/signup" element={<Suspense fallback={<PageFallback />}><AdminSignup /></Suspense>} />
          <Route path="/admin/setup" element={<Suspense fallback={<PageFallback />}><AccountSetup /></Suspense>} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<Suspense fallback={<PageFallback />}><AdminDashboard /></Suspense>} />
            <Route path="overview" element={<Suspense fallback={<PageFallback />}><AdminTeamOverview /></Suspense>} />
            <Route path="events" element={<Suspense fallback={<PageFallback />}><AdminEvents /></Suspense>} />
            <Route path="events/new" element={<Suspense fallback={<PageFallback />}><AdminEventEdit /></Suspense>} />
            <Route path="events/:id" element={<Suspense fallback={<PageFallback />}><AdminEventEdit /></Suspense>} />
            <Route path="enquiries" element={<Suspense fallback={<PageFallback />}><AdminEnquiries /></Suspense>} />
            <Route path="applications" element={<Suspense fallback={<PageFallback />}><AdminApplications /></Suspense>} />
            <Route path="applications/:id" element={<Suspense fallback={<PageFallback />}><AdminApplicationDetail /></Suspense>} />
            <Route path="jobs" element={<Suspense fallback={<PageFallback />}><AdminJobs /></Suspense>} />
            <Route path="jobs/new" element={<Suspense fallback={<PageFallback />}><AdminJobEdit /></Suspense>} />
            <Route path="jobs/:id" element={<Suspense fallback={<PageFallback />}><AdminJobEdit /></Suspense>} />
            <Route path="templates" element={<Suspense fallback={<PageFallback />}><AdminEmailTemplates /></Suspense>} />
            <Route path="people" element={<Suspense fallback={<PageFallback />}><AdminPeople /></Suspense>} />
            <Route path="team" element={<Suspense fallback={<PageFallback />}><AdminTeam /></Suspense>} />
            <Route path="roles" element={<Suspense fallback={<PageFallback />}><AdminRoles /></Suspense>} />
            <Route path="invitations" element={<Suspense fallback={<PageFallback />}><AdminInvitations /></Suspense>} />
            <Route path="security" element={<Suspense fallback={<PageFallback />}><AdminSecurity /></Suspense>} />
            <Route path="founder" element={<Suspense fallback={<PageFallback />}><AdminFounder /></Suspense>} />
            <Route path="content" element={<Suspense fallback={<PageFallback />}><AdminContent /></Suspense>} />
            <Route path="contact-settings" element={<Suspense fallback={<PageFallback />}><AdminContactSettings /></Suspense>} />
            <Route path="community" element={<Suspense fallback={<PageFallback />}><AdminCommunity /></Suspense>} />
            <Route path="goods" element={<Suspense fallback={<PageFallback />}><AdminGoods /></Suspense>} />
            <Route path="goods/new" element={<Suspense fallback={<PageFallback />}><AdminGoodsEdit /></Suspense>} />
            <Route path="goods/:id" element={<Suspense fallback={<PageFallback />}><AdminGoodsEdit /></Suspense>} />
            <Route path="campaigns" element={<Suspense fallback={<PageFallback />}><AdminCampaigns /></Suspense>} />
            <Route path="content-calendar" element={<Suspense fallback={<PageFallback />}><AdminContentCalendar /></Suspense>} />
            <Route path="brand-studio" element={<Suspense fallback={<PageFallback />}><AdminBrandStudio /></Suspense>} />
            <Route path="site-sections" element={<Suspense fallback={<PageFallback />}><AdminSiteSections /></Suspense>} />
            <Route path="shopify" element={<Suspense fallback={<PageFallback />}><AdminShopify /></Suspense>} />
          </Route>

          <Route path="/crew" element={<CrewLayout />}>
            <Route index element={<Suspense fallback={<PageFallback />}><CrewPortal /></Suspense>} />
          </Route>
        </Routes>
        <SiteChrome />
        <LaunchGate />
      </BrowserRouter>
    </AuthProvider>
  );
}
