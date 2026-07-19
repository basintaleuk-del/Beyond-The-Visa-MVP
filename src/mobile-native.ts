import { Capacitor } from '@capacitor/core';
import { App } from '@capacitor/app';
import { Browser } from '@capacitor/browser';
import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Dialog } from '@capacitor/dialog';
import { Haptics, ImpactStyle } from '@capacitor/haptics';
import { Keyboard } from '@capacitor/keyboard';
import { Network } from '@capacitor/network';
import { Preferences } from '@capacitor/preferences';
import { PushNotifications, type Token } from '@capacitor/push-notifications';
import { Share } from '@capacitor/share';
import { SplashScreen } from '@capacitor/splash-screen';
import { StatusBar, Style } from '@capacitor/status-bar';
import { Toast } from '@capacitor/toast';

declare global {
  interface Window {
    btvSupabase?: any;
    BTVNative?: {
      share: (title: string, text: string, url?: string) => Promise<void>;
      chooseProfilePhoto: () => Promise<string | null>;
      enablePush: () => Promise<boolean>;
    };
  }
}

const native = Capacitor.isNativePlatform();
if (native) {
  document.documentElement.classList.add('capacitor-native', `capacitor-${Capacitor.getPlatform()}`);
  void startNativeShell();
}

async function startNativeShell() {
  installNetworkBanner();
  installPullToRefresh();
  installHaptics();
  installOAuthBridge();
  installNativeBack();
  exposeNativeFeatures();

  try {
    await StatusBar.setOverlaysWebView({ overlay: false });
    await StatusBar.setStyle({ style: matchMedia('(prefers-color-scheme: dark)').matches ? Style.Dark : Style.Light });
    await Keyboard.setAccessoryBarVisible({ isVisible: true });
  } catch (error) {
    console.debug('Native chrome setup skipped', error);
  } finally {
    await SplashScreen.hide().catch(() => undefined);
  }
}

function installNetworkBanner() {
  const banner = document.createElement('div');
  banner.className = 'btv-native-network';
  banner.setAttribute('role', 'status');
  banner.textContent = 'You are offline. Saved content remains available.';
  document.body.append(banner);

  const update = (connected: boolean) => banner.classList.toggle('is-visible', !connected);
  void Network.getStatus().then(status => update(status.connected));
  void Network.addListener('networkStatusChange', status => update(status.connected));
}

function installPullToRefresh() {
  const indicator = document.createElement('div');
  indicator.className = 'btv-pull-indicator';
  indicator.setAttribute('aria-hidden', 'true');
  indicator.textContent = '↻';
  document.body.append(indicator);
  let startY = 0;
  let pulling = false;

  addEventListener('touchstart', event => {
    if (scrollY > 0 || event.touches.length !== 1) return;
    startY = event.touches[0].clientY;
    pulling = true;
  }, { passive: true });
  addEventListener('touchmove', event => {
    if (!pulling) return;
    const distance = event.touches[0].clientY - startY;
    indicator.classList.toggle('is-visible', distance > 55);
  }, { passive: true });
  addEventListener('touchend', () => {
    if (!pulling) return;
    pulling = false;
    const refresh = indicator.classList.contains('is-visible');
    if (!refresh) return;
    indicator.classList.add('is-refreshing');
    setTimeout(() => location.reload(), 120);
  }, { passive: true });
}

function installHaptics() {
  document.addEventListener('click', event => {
    const target = event.target as Element | null;
    if (target?.closest('button, .nav, [role="button"]')) {
      void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined);
    }
  }, { passive: true });
}

function installOAuthBridge() {
  document.addEventListener('click', event => {
    const button = (event.target as Element | null)?.closest('#googleAuthV69');
    if (!button) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void beginOAuth('google');
  }, true);

  void App.addListener('appUrlOpen', event => completeOAuth(event.url));
}

async function beginOAuth(provider: 'google' | 'apple' | 'facebook') {
  const client = window.btvSupabase;
  if (!client?.auth) return showError('The secure sign-in service is still loading.');
  const redirectTo = 'org.beyondthevisa.app://auth/callback';
  const { data, error } = await client.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
      queryParams: provider === 'google' ? { access_type: 'offline', prompt: 'consent' } : undefined,
    },
  });
  if (error || !data?.url) return showError(error?.message || 'Sign-in could not be started.');
  await Browser.open({ url: data.url, presentationStyle: 'popover' });
}

async function completeOAuth(url: string) {
  if (!url.startsWith('org.beyondthevisa.app://auth/callback')) return;
  const client = window.btvSupabase;
  if (!client?.auth) return;
  await Browser.close().catch(() => undefined);
  const parsed = new URL(url);
  const code = parsed.searchParams.get('code');
  const hash = new URLSearchParams(parsed.hash.replace(/^#/, ''));
  try {
    if (code) {
      const { error } = await client.auth.exchangeCodeForSession(code);
      if (error) throw error;
    } else if (hash.get('access_token') && hash.get('refresh_token')) {
      const { error } = await client.auth.setSession({
        access_token: hash.get('access_token'),
        refresh_token: hash.get('refresh_token'),
      });
      if (error) throw error;
    } else {
      throw new Error(parsed.searchParams.get('error_description') || 'The sign-in response was incomplete.');
    }
    location.reload();
  } catch (error: any) {
    showError(error?.message || 'Sign-in could not be completed.');
  }
}

function installNativeBack() {
  void App.addListener('backButton', async ({ canGoBack }) => {
    const visibleDialog = document.querySelector<HTMLElement>('[role="dialog"]:not([hidden]), .modal:not([hidden])');
    if (visibleDialog) {
      visibleDialog.querySelector<HTMLElement>('button[aria-label*="Close"], .close, [data-close]')?.click();
      return;
    }
    if (canGoBack && history.length > 1) history.back();
    else {
      const { value } = await Dialog.confirm({ title: 'Close Beyond The Visa?', message: 'Your progress is saved securely.', okButtonTitle: 'Close' });
      if (value) await App.exitApp();
    }
  });
}

function exposeNativeFeatures() {
  window.BTVNative = {
    async share(title, text, url = location.href) {
      await Share.share({ title, text, url, dialogTitle: 'Share from Beyond The Visa' });
    },
    async chooseProfilePhoto() {
      try {
        const photo = await Camera.getPhoto({
          quality: 82,
          allowEditing: true,
          resultType: CameraResultType.DataUrl,
          source: CameraSource.Prompt,
          width: 1200,
          height: 1200,
        });
        return photo.dataUrl || null;
      } catch {
        return null;
      }
    },
    enablePush,
  };
}

async function enablePush() {
  const permission = await PushNotifications.requestPermissions();
  if (permission.receive !== 'granted') return false;
  await PushNotifications.register();
  await Preferences.set({ key: 'btv-push-enabled', value: 'true' });
  void PushNotifications.addListener('registration', token => savePushToken(token));
  void PushNotifications.addListener('registrationError', error => showError(error.error));
  void PushNotifications.addListener('pushNotificationActionPerformed', action => {
    const destination = action.notification.data?.url;
    if (typeof destination === 'string' && destination.startsWith('https://beyondthevisa.org')) location.href = destination;
  });
  await Toast.show({ text: 'Notifications enabled' });
  return true;
}

async function savePushToken(token: Token) {
  const client = window.btvSupabase;
  const { data } = await client?.auth?.getUser?.() || {};
  if (!data?.user || !client?.from) return;
  const { error } = await client.from('push_subscriptions').upsert({
    user_id: data.user.id,
    token: token.value,
    platform: Capacitor.getPlatform(),
    updated_at: new Date().toISOString(),
  }, { onConflict: 'token' });
  if (error) console.warn('Push token could not be synced', error.message);
}

function showError(message: string) {
  void Dialog.alert({ title: 'Beyond The Visa', message });
}

