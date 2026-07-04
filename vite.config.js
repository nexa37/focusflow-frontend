import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'

function ensureStaticFiles() {
  return {
    name: 'ensure-static-files',
    writeBundle() {
      const outDir = 'dist'
      if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })

      writeFileSync(
        `${outDir}/manifest.json`,
        JSON.stringify(
          {
            name: 'FocusFlow',
            short_name: 'FocusFlow',
            description: 'Personal productivity: tasks, goals, projects, reminders, contacts, and notes.',
            start_url: '/',
            display: 'standalone',
            background_color: '#000000',
            theme_color: '#000000',
            orientation: 'portrait',
          },
          null,
          2
        )
      )

      writeFileSync(
        `${outDir}/sw.js`,
        `// FocusFlow service worker for push notifications
self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  let payload;
  try {
    payload = event.data.json();
  } catch (e) {
    payload = { title: "FocusFlow", body: event.data.text() };
  }

  var title = payload.title || "FocusFlow";
  var options = {
    body: payload.body || "",
    tag: payload.tag || "focusflow-notification",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  var targetUrl = (event.notification.data && event.notification.data.url) || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url.includes(self.location.origin) && "focus" in client) {
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })
  );
});
`
      )
    },
  }
}

export default defineConfig({
  plugins: [react(), ensureStaticFiles()],
})
