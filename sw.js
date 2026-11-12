// Service worker for the optional "Background upload" toggle. Keep it next to index.html.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

async function tell(msg) {
  const all = await self.clients.matchAll({ includeUncontrolled: true });
  all.forEach(c => c.postMessage(msg));
}

// Chrome finished sending the file(s)
self.addEventListener('backgroundfetchsuccess', e => {
  const reg = e.registration;
  e.waitUntil((async () => {
    let ok = true, error = '';
    try {
      for (const rec of await reg.matchAll()) {
        const res = await rec.responseReady;
        if (!res.ok) { ok = false; error = 'Uploader error ' + res.status; continue; }
        let j = null;
        try { j = await res.json(); } catch (err) {}
        if (!j || !j.ok) { ok = false; error = (j && j.error) || 'Uploader gave no valid answer'; }
      }
    } catch (err) { ok = false; error = 'No answer from Drive'; }
    await e.updateUI({ title: ok ? 'Uploaded ✓' : 'Upload failed' });
    await tell({ id: reg.id, ok, error });
  })());
});

// Chrome gave up (network, storage, etc.)
self.addEventListener('backgroundfetchfail', e => {
  e.waitUntil((async () => {
    await e.updateUI({ title: 'Upload failed' });
    await tell({ id: e.registration.id, ok: false, error: 'Chrome could not finish (' + (e.registration.failureReason || 'unknown') + ')' });
  })());
});

self.addEventListener('backgroundfetchabort', e => e.waitUntil(tell({ id: e.registration.id, ok: false, error: 'Cancelled' })));
self.addEventListener('backgroundfetchclick', e => e.waitUntil(self.clients.openWindow('./')));
