"use client";

import OneSignal from "react-onesignal";

let initialized = false;

export async function initOneSignal(): Promise<void> {
  if (initialized || typeof window === "undefined") return;
  initialized = true;

  await OneSignal.init({
    appId: process.env.NEXT_PUBLIC_ONESIGNAL_APP_ID!,
    notifyButton: { enable: false },
    serviceWorkerPath: "/OneSignalSDKWorker.js",
    allowLocalhostAsSecureOrigin: process.env.NODE_ENV === "development",
  });
}

export async function requestPermission(): Promise<boolean> {
  await initOneSignal();
  const permission = await OneSignal.Notifications.requestPermission();
  return permission;
}

export async function setExternalUserId(userId: string): Promise<void> {
  await initOneSignal();
  await OneSignal.login(userId);
}

export async function setEventTags(eventIds: string[]): Promise<void> {
  await initOneSignal();
  const tags: Record<string, string> = {};
  eventIds.forEach((id) => (tags[`event_${id}`] = "true"));
  await OneSignal.User.addTags(tags);
}
