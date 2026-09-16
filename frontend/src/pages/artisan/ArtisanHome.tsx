import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import BottomNav from '../../components/BottomNav';
import ShowMeFab from '../../components/guide-hand/ShowMeFab';
import { NotificationBell } from '../../components/notifications/NotificationBell';
import { useGuidanceStore } from '../../stores/guidanceStore';
import { useDashboardStore } from '../../stores/dashboardStore';
import api from '../../lib/api';

export default function ArtisanHome() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<any>(null);
  const [fetchedWorkflow, setFetchedWorkflow] = useState<any>(null);
  
  const { metrics, loading, fetchMetrics } = useDashboardStore();

  useEffect(() => {
    let mounted = true;
    const fetchGuidance = async () => {
      const { guidanceLevel, isActive, completedWorkflows, startWorkflow } = useGuidanceStore.getState();
      if (guidanceLevel === 'off') return;
      try {
        const res = await api.get('/guidance/current?screen=artisan_home');
        if (res.data && mounted) {
          setFetchedWorkflow(res.data);
          if (!isActive && !completedWorkflows.includes(res.data.id)) {
            startWorkflow(res.data);
          }
        }
      } catch (e) {
        console.error("Guidance fetch error:", e);
      }
    };
    fetchGuidance();
    return () => { mounted = false; };
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const res = await api.get('/artisans/me');
        setProfile(res.data);
      } catch (err) {
        console.error("Profile fetch error:", err);
      }
    };
    fetchProfile();
    fetchMetrics();
  }, [fetchMetrics]);

  if (loading || !metrics) return <div className="min-h-screen bg-surface flex items-center justify-center font-semibold text-on-surface-variant">{t('common.loading')}</div>;

  const artisanName = profile?.artisan_name?.split(' ')[0] || t('auth.artisan');

  return (
    <div className="w-full min-h-screen bg-surface flex flex-col relative pb-24">
      <header className="fixed top-0 inset-x-0 mobile-shell-width z-40 bg-surface pt-safe">
        <div className="h-16 px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-3xl">handshake</span>
            <div className="flex flex-col">
              <span className="font-extrabold text-on-surface tracking-tight text-xl leading-none">{t('app.name')}</span>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">{t('auth.artisan')}</span>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <NotificationBell />
            <button 
              onClick={() => navigate('/artisan/profile')}
              className="w-10 h-10 rounded-full bg-surface-container-highest overflow-hidden flex items-center justify-center text-on-surface-variant shadow-sm hover:opacity-90 transition-opacity border-2 border-surface"
            >
              {profile?.profile_photo_url ? (
                <img src={profile.profile_photo_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span className="material-symbols-outlined">person</span>
              )}
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 px-6 pt-24 pb-8 w-full max-w-lg mx-auto space-y-8">
        
        <section className="flex flex-col">
          <h1 className="text-3xl font-extrabold text-on-surface tracking-tight flex items-center gap-2">
            {t('artisan_home.welcome')}, {artisanName} <span className="inline-block animate-[wave_2s_ease-in-out_infinite] origin-[70%_70%]">👋</span>
          </h1>
          <p className="text-sm font-medium text-on-surface-variant mt-1.5">
            {t('artisan_home.greeting_prefix')}
          </p>
        </section>

        <section className="w-full">
          <button 
            data-guide-id="add-product-button"
            id="add-product-button" 
            onClick={() => navigate('/artisan/product/create')}
            className="w-full relative overflow-hidden bg-primary text-on-primary rounded-[24px] p-6 shadow-md active:scale-[0.98] transition-all flex flex-col text-left group"
          >
            <div className="absolute -right-12 -top-12 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none"></div>
            
            <div className="flex flex-col gap-1 mb-6 relative z-10">
              <span className="text-2xl font-extrabold leading-tight tracking-tight">{t('artisan_home.createProduct')}</span>
              <span className="text-sm font-medium text-white/80">{t('artisan_home.listCrafts')}</span>
            </div>

            <div className="flex items-center justify-between w-full relative z-10">
              <div className="flex items-center gap-3 bg-white/20 px-4 py-2 rounded-full backdrop-blur-sm">
                 <span className="text-sm font-bold tracking-wide">{t('artisan_home.startCreating')}</span>
              </div>
              <div className="w-12 h-12 rounded-full bg-white text-primary flex items-center justify-center shadow-lg group-hover:scale-105 transition-transform">
                <span className="material-symbols-outlined text-2xl">add_photo_alternate</span>
              </div>
            </div>
          </button>
        </section>

        {/* Dashboard Grid Upgrade */}
        <section className="grid grid-cols-2 gap-4">
          <div className="col-span-2 bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-5 flex items-center justify-between shadow-sm cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/artisan/orders')}>
            <div>
              <p className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{t('artisan_home.totalEarnings')}</p>
              <p className="text-3xl font-black text-on-surface">₹{metrics.orders.total_value.toLocaleString()}</p>
            </div>
            <div className="w-14 h-14 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-3xl">account_balance_wallet</span>
            </div>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col cursor-pointer hover:border-primary/30 transition-colors" onClick={() => navigate('/artisan/products')}>
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">inventory_2</span>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{t('artisan_home.products')}</span>
            </div>
            <span className="text-3xl font-black text-on-surface leading-none">{metrics.total_products}</span>
            <span className="text-xs font-medium text-tertiary mt-2">{metrics.published_products} {t('artisan_home.published')}</span>
          </div>
          
          <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex flex-col cursor-pointer hover:border-primary/30 transition-colors relative" onClick={() => navigate('/artisan/enquiries')}>
            {metrics.new_enquiries > 0 && <span className="absolute top-3 right-3 w-3 h-3 rounded-full bg-error ring-4 ring-surface-container-lowest animate-pulse"></span>}
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-on-surface-variant text-lg">forum</span>
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider mb-1">{t('artisan_home.enquiriesHome')}</span>
            </div>
            <span className="text-3xl font-black text-on-surface leading-none">{metrics.new_enquiries}</span>
            <span className="text-xs font-medium text-secondary mt-2">{t('artisan_home.newRequests')}</span>
          </div>
        </section>

        {/* Marketplace Tools */}
        <section className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-1 shadow-sm">
          <div className="flex items-center justify-between p-3 border-b border-outline-variant/20">
            <span className="text-sm font-bold text-on-surface tracking-wide">{t('artisan_home.quickTools')}</span>
          </div>
          <div className="grid grid-cols-3 divide-x divide-outline-variant/20">
            <div className="p-4 flex flex-col items-center text-center cursor-pointer hover:bg-surface-container-low transition-colors rounded-bl-2xl" onClick={() => navigate('/artisan/conversations')}>
              <span className="material-symbols-outlined text-primary mb-2 text-2xl">chat</span>
              <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">{t('artisan_home.messages')}</span>
            </div>
            
            <div className="p-4 flex flex-col items-center text-center cursor-pointer hover:bg-surface-container-low transition-colors" onClick={() => navigate('/artisan/reviews')}>
              <span className="material-symbols-outlined text-tertiary mb-2 text-2xl">star_rate</span>
              <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">{t('artisan_home.reviews')}</span>
            </div>

            <div className="p-4 flex flex-col items-center text-center cursor-pointer hover:bg-surface-container-low transition-colors rounded-br-2xl" onClick={() => navigate('/artisan/analytics')}>
              <span className="material-symbols-outlined text-secondary mb-2 text-2xl">insert_chart</span>
              <span className="text-[11px] font-bold text-on-surface uppercase tracking-wider">{t('artisan_home.analytics')}</span>
            </div>
          </div>
        </section>

        {/* Recent Activity */}
        <section className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between px-1">
            <span className="text-lg font-bold text-on-surface">{t('artisan_home.recentActivity')}</span>
            <button onClick={() => navigate('/artisan/orders')} className="text-sm font-bold text-primary hover:underline">
              {t('artisan_home.seeAllActivity')}
            </button>
          </div>
          
          <div className="flex flex-col gap-3">
            {metrics.recent_activity.length > 0 ? (
              metrics.recent_activity.slice(0,3).map((activity: any) => (
                <div key={activity.id} className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-4 shadow-sm flex items-center gap-4 hover:border-primary/30 transition-colors cursor-pointer">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <span className="material-symbols-outlined">local_shipping</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-on-surface text-base truncate">
                      {t('artisan_home.order')}{activity.orders.display_id}
                    </p>
                    <p className="text-sm font-medium text-on-surface-variant truncate mt-0.5">
                      {t('artisan_home.statusUpdatedTo')} <span className="text-primary font-bold">{activity.to_status}</span>
                    </p>
                  </div>
                </div>
              ))
            ) : (
              <div className="bg-surface-container-lowest border border-outline-variant/30 rounded-2xl p-8 shadow-sm flex flex-col items-center justify-center text-center">
                <div className="w-16 h-16 bg-surface-container-high rounded-full flex items-center justify-center mb-3">
                   <span className="material-symbols-outlined text-on-surface-variant text-2xl">history</span>
                </div>
                <p className="text-sm font-bold text-on-surface">{t('artisan_home.noRecentActivity')}</p>
                <p className="text-xs text-on-surface-variant mt-1">{t('artisan_home.latestUpdatesAppearHere')}</p>
              </div>
            )}
          </div>
        </section>

      </main>
      
      {fetchedWorkflow && (
        <ShowMeFab workflow={fetchedWorkflow} />
      )}

      <BottomNav />
    </div>
  );
}
