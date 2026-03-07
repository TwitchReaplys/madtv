import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";

import { env } from "@/lib/env";

function normalizeBaseUrl(url: string) {
  return url.replace(/\/$/, "");
}

export function buildCreatorWebUrl(creatorSlug: string, tierId?: string) {
  const base = normalizeBaseUrl(env.EXPO_PUBLIC_APP_WEB_URL);
  const target = new URL(`${base}/c/${creatorSlug}`);

  if (tierId) {
    target.searchParams.set("tier", tierId);
  }

  target.searchParams.set("source", "mobile-app");

  return target.toString();
}

export function buildBillingWebUrl() {
  const base = normalizeBaseUrl(env.EXPO_PUBLIC_APP_WEB_URL);
  return `${base}/dashboard/viewer`;
}

export async function openExternalUrl(url: string) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    await WebBrowser.openBrowserAsync(url, {
      presentationStyle: WebBrowser.WebBrowserPresentationStyle.FORM_SHEET,
    });
    return;
  }

  await Linking.openURL(url);
}
