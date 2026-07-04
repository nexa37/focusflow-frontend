import { api } from "./api.js";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return { status: "unsupported" };
  }

  const { publicKey, configured } = await api.getVapidKey();
  if (!configured || !publicKey) {
    return { status: "not-configured" };
  }

  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    return { status: "denied" };
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey),
      });
    }
    await api.subscribePush(subscription.toJSON());
    return { status: "subscribed" };
  } catch (err) {
    console.error("Push subscription failed:", err);
    return { status: "error", error: err };
  }
}

export async function getPushStatus() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) return "unsupported";
  if (Notification.permission === "denied") return "denied";
  const registration = await navigator.serviceWorker.ready.catch(() => null);
  if (!registration) return "unsupported";
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? "subscribed" : "not-subscribed";
}
