import type { CapacitorConfig } from '@capacitor/cli';

// Thin wrapper (same pattern as CCLAI): the native apps load the hosted
// site, so every git push updates the store apps instantly — no resubmission
// for content changes. The web app detects Capacitor and hides purchase
// paths to comply with App Store / Play billing rules.
const config: CapacitorConfig = {
  appId: 'uk.co.weddingplannerpro.mobile',
  appName: 'Wedding Planner Pro',
  webDir: 'dist',
  server: {
    url: 'https://www.weddingplannerpro.co.uk',
    allowNavigation: [
      'www.weddingplannerpro.co.uk',
      'weddingplannerpro.co.uk',
      'mrkotkgivhnydtrzyoct.supabase.co',
    ],
  },
  backgroundColor: '#FAF6EE',
  ios: {
    contentInset: 'automatic',
  },
  android: {
    allowMixedContent: false,
  },
};

export default config;
