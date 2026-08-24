/* Service worker mínimo para notificaciones push de Polla Breve */

self.addEventListener("push", (event) => {
  let payload = { title: "Polla Breve", body: "Tienes una nueva notificación" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // ignore parse errors, use default
  }

  const options = {
    body: payload.body,
    icon: "https://res.cloudinary.com/ddqbnr9vo/image/upload/v1780536995/logo_white_lxc6na.png",
    badge: "https://res.cloudinary.com/ddqbnr9vo/image/upload/v1780536995/logo_white_lxc6na.png",
    data: { url: payload.url || "/" },
  };

  event.waitUntil(self.registration.showNotification(payload.title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/";
  event.waitUntil(
    self.clients.matchAll({ type: "window" }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
        existing.navigate(url);
        return;
      }
      return self.clients.openWindow(url);
    })
  );
});
