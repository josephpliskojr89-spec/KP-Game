/* Service worker — cache key rides the version lockstep. */
'use strict';
const CACHE = 'kpam-0.10.8';
const V = '0.10.8';
const PRECACHE = [
  '.',
  'index.html',
  'manifest.json',
  'icon.svg',
  'css/app.css?v=' + V,
  'js/engine/constants.js?v=' + V,
  'js/engine/kernel.js?v=' + V,
  'js/engine/rng.js?v=' + V,
  'js/engine/data.js?v=' + V,
  'js/engine/person.js?v=' + V,
  'js/engine/blurbs.js?v=' + V,
  'js/engine/development.js?v=' + V,
  'js/engine/relationships.js?v=' + V,
  'js/engine/scouting.js?v=' + V,
  'js/engine/network.js?v=' + V,
  'js/engine/publiceye.js?v=' + V,
  'js/engine/fame.js?v=' + V,
  'js/engine/bookings.js?v=' + V,
  'js/engine/product.js?v=' + V,
  'js/engine/money.js?v=' + V,
  'js/engine/commerce.js?v=' + V,
  'js/engine/pipeline.js?v=' + V,
  'js/engine/medical.js?v=' + V,
  'js/engine/market.js?v=' + V,
  'js/engine/hires.js?v=' + V,
  'js/engine/rituals.js?v=' + V,
  'js/engine/japan.js?v=' + V,
  'js/engine/broadcast.js?v=' + V,
  'js/engine/scandal.js?v=' + V,
  'js/engine/schools.js?v=' + V,
  'js/engine/practice.js?v=' + V,
  'js/engine/songs.js?v=' + V,
  'js/engine/group.js?v=' + V,
  'js/engine/debut.js?v=' + V,
  'js/engine/events.js?v=' + V,
  'js/engine/career.js?v=' + V,
  'js/engine/gen.js?v=' + V,
  'js/engine/memory.js?v=' + V,
  'js/engine/social.js?v=' + V,
  'js/engine/discourse.js?v=' + V,
  'js/engine/industry.js?v=' + V,
  'js/engine/risefall.js?v=' + V,
  'js/engine/calendar.js?v=' + V,
  'js/engine/shows.js?v=' + V,
  'js/engine/regions.js?v=' + V,
  'js/engine/tongue.js?v=' + V,
  'js/engine/sagas.js?v=' + V,
  'js/engine/tour.js?v=' + V,
  'js/engine/fandom.js?v=' + V,
  'js/engine/deals.js?v=' + V,
  'js/engine/gigs.js?v=' + V,
  'js/engine/hiatus.js?v=' + V,
  'js/engine/catalog.js?v=' + V,
  'js/engine/gravity.js?v=' + V,
  'js/engine/badblood.js?v=' + V,
  'js/engine/festivals.js?v=' + V,
  'js/engine/military.js?v=' + V,
  'js/engine/awards.js?v=' + V,
  'js/engine/life.js?v=' + V,
  'js/engine/scenes.js?v=' + V,
  'js/engine/meeting.js?v=' + V,
  'js/engine/mandate.js?v=' + V,
  'js/engine/persona.js?v=' + V,
  'js/engine/secret.js?v=' + V,
  'js/engine/door.js?v=' + V,
  'js/engine/scars.js?v=' + V,
  'js/engine/staff.js?v=' + V,
  'js/engine/tenure.js?v=' + V,
  'js/engine/contracts.js?v=' + V,
  'js/engine/society.js?v=' + V,
  'js/engine/year.js?v=' + V,
  'js/engine/constituency.js?v=' + V,
  'js/engine/credits.js?v=' + V,
  'js/engine/founding.js?v=' + V,
  'js/engine/tracks.js?v=' + V,
  'js/engine/sim.js?v=' + V,
  'js/engine/newgame.js?v=' + V,
  'js/engine/save.js?v=' + V,
  'js/ui/components.js?v=' + V,
  'js/ui/views_desk.js?v=' + V,
  'js/ui/views_talent.js?v=' + V,
  'js/ui/views_groups.js?v=' + V,
  'js/ui/views_studio.js?v=' + V,
  'js/ui/views_industry.js?v=' + V,
  'js/ui/app.js?v=' + V,
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request, { ignoreSearch: false }).then(hit =>
      hit || fetch(e.request).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match('index.html'))
    )
  );
});
