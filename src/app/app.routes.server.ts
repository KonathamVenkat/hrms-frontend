import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // Nothing in this app is safe to prerender/SSR: the authenticated shell
  // depends on localStorage-based JWT auth (invisible to the server), and
  // even the login page does client-side redirect checks and loads i18n
  // translations over HTTP, which can't resolve during a server build.
  // Client-side (SPA) rendering only, app-wide.
  {
    path: '**',
    renderMode: RenderMode.Client,
  },
];
