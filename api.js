const API_URL = import.meta.env.VITE_API_URL || "https://focus-flow-vipw.onrender.com";

async function request(path, options = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API error ${res.status}: ${text}`);
  }
  if (res.status === 204) return null;
  return res.json();
}

export const api = {
  base: API_URL,

  list: (resource) => request(`/api/${resource}`),
  create: (resource, data) => request(`/api/${resource}`, { method: "POST", body: JSON.stringify(data) }),
  update: (resource, id, data) => request(`/api/${resource}/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  remove: (resource, id) => request(`/api/${resource}/${id}`, { method: "DELETE" }),

  getVapidKey: () => request("/api/push/vapid-public-key"),
  subscribePush: (subscription) => request("/api/push/subscribe", { method: "POST", body: JSON.stringify(subscription) }),
  unsubscribePush: (endpoint) => request("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) }),
  testPush: () => request("/api/push/test", { method: "POST" }),
};
