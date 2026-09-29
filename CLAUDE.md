# eHRMS — Angular Frontend

Angular frontend for the HRMS system, consuming the `employee` Spring Boot backend (`http://localhost:8082`, package `com.hrms`, port 8082 — see that project's `CLAUDE.md`).

## Workspace context

This is **one of three apps in a single Angular CLI workspace** (`C:\angular-workspace`), not a standalone project:

- `projects/ehrms` — this app
- `projects/e-invoicing`
- `projects/mss-invoice`

They share one root `package.json`, one root `tsconfig.json` (with per-app `tsconfig.app.json`/`tsconfig.spec.json` references), and one `angular.json` with all three registered as separate `projectType: application` entries. Dependency versions are shared workspace-wide — bumping a package for `ehrms` affects the other two apps too, so check before upgrading.

Run commands **scoped to this project** with the `--project`/positional flag, e.g.:
```
ng serve ehrms
ng build ehrms
ng test ehrms
```
Running a bare `ng serve`/`ng build` without specifying the project may target the wrong app.

## Stack

- **Angular 21.2** (`@angular/core` ^21.2.0), standalone-component architecture (no `NgModule`s — bootstrapped via `app.config.ts`)
- **SSR enabled**: `app.config.server.ts`, `app.routes.server.ts`, `main.server.ts`, `server.ts`, build `outputMode: "server"`. Serve the SSR build with `npm run serve:ssr:ehrms` (runs `dist/ehrms/server/server.mjs`). Routing and any browser-only API usage (e.g. `window`, `localStorage`) need SSR-safety checks (`isPlatformBrowser`) since code also runs on the server.
- **UI**: Angular Material 21.2.7 + CDK (`material-theme.scss` + `styles.css` both loaded as global styles)
- **i18n**: `@ngx-translate/core` + `@ngx-translate/http-loader` — translations loaded at runtime, not Angular's built-in i18n pipeline
- **Charts**: both `@swimlane/ngx-charts` (25.x) and `chart.js` + `ng2-charts` (10.x) are dependencies — check which one an existing feature already uses before adding a new chart, to avoid mixing both libraries in the same screen
- **Dates**: `date-fns`
- **HTTP/reactive**: RxJS 7.8, no NgRx or other global state library present — state is handled per-feature via services (see Conventions)
- **TypeScript 5.9**, **strict mode on**: `strict`, `noImplicitOverride`, `noImplicitReturns`, `noFallthroughCasesInSwitch`, `noPropertyAccessFromIndexSignature`, plus Angular's `strictTemplates`, `strictInjectionParameters`, `strictInputAccessModifiers` — write fully-typed code; don't quiet errors with `any` or non-null assertions as a shortcut.
- **Testing**: `@angular/build:unit-test` builder (Vitest under the hood, not Karma/Jasmine) + `jsdom`. Use Vitest conventions/matchers when writing or reading spec files.
- **Formatting**: Prettier 3.8 is a dependency — run it rather than hand-formatting.
- Component selector prefix: **`app`**

## Environments

`environment.ts` (dev): `serviceUrl: 'http://localhost:8082'` — matches the `employee` backend's port. There will be a corresponding `environment.prod.ts` (not shown here) for the production API URL; always read `serviceUrl` from the environment file, never hardcode `localhost:8082` in a service.

## Folder structure (`projects/ehrms/src/app`)

```
app/
├── app.config.ts / app.config.server.ts   # bootstrap config (client / SSR)
├── app.routes.ts / app.routes.server.ts   # root routing (client / SSR)
├── app.ts / app.html / app.css / app.spec.ts
│
├── core/                     # singleton, app-wide concerns
│   ├── auth/                 # auth-routing.ts, auth.ts (core auth service/state)
│   ├── guards/                auth.guard.ts
│   ├── interceptors/          jwt.interceptor.ts   (attaches JWT to outgoing requests)
│   └── services/               menu.service.ts
│
├── features/                 # feature/domain modules — mirrors backend modules
│   ├── admin/                 # admin-only config screens, each a self-contained sub-feature:
│   │   ├── document-types/
│   │   ├── holiday-calendar/
│   │   ├── leave-types/
│   │   ├── office-locations/
│   │   └── work-shifts/
│   │       each: models/, pages/<page-name>/{*.ts,*.html,*.css}, services/
│   ├── attendance/            attendance-routing.ts, models/, pages/{attendance-log,
│   │                          attendance-request, attendance-request-approval,
│   │                          attendance-summary, overtime-approval, overtime-request}/,
│   │                          services/{attendance,overtime,regularization}.service.ts
│   ├── auth/                  auth-routing.ts, change-password/, login/  (feature-level auth UI —
│   │                          distinct from core/auth, which holds shared auth state/routing glue)
│   ├── dashboard/              single page, no sub-structure
│   ├── employee/               employee-routing.ts, models/{address,document,employee,identity,
│   │                          job-details}.model.ts, pages/{employee-addresses, employee-detail,
│   │                          employee-documents, employee-form, employee-identity, employee-list,
│   │                          job-details}/, services/{address,document,employee,identity,
│   │                          job-details}.service.ts
│   ├── leave/                 models/{leave-balance,leave-request}.model.ts,
│   │                          pages/{leave-apply, leave-approval, leave-balance, leave-calendar,
│   │                          leave-list}/, services/{leave-balance,leave-request}.service.ts
│   └── payroll/                payroll-routing.ts, models/payroll.model.ts,
│                              pages/{employee-salary, salary-component, salary-structure}/,
│                              services/payroll.service.ts
│
└── layout/                    shell chrome, not a routed feature
    ├── main-layout/
    ├── sidebar/
    └── toolbar/
```

Backend module correspondence: `employee`, `leave`, `payroll`, `attendance`, `auth` feature folders map directly to the same-named backend modules (`com.hrms.employee`, `com.hrms.leave`, `com.hrms.payroll`, `com.hrms.attendance`, `com.hrms.auth`). `admin` here is frontend-only config UI (document types, holiday calendar, leave types, office locations, work shifts) — check the backend for which of those has a matching controller before assuming a new admin screen needs new backend work.

## Conventions

- **Standalone components, no NgModules.** New components/pages follow the existing per-page folder pattern: `pages/<page-name>/<page-name>.ts` + `.html` + `.css` (no `.spec.ts` per page currently, only at the app root — match existing sibling files' testing coverage rather than assuming a pattern).
- **File naming**: no `.component`/`.service`/`.guard` suffix convention is fully consistent — e.g. `employee.ts` (service) vs `employee.service.ts` elsewhere, `document-type.ts` used for both a model and (in a different folder) a service. Check the sibling files in the same folder before naming a new file, rather than assuming one global suffix rule.
- **Each feature is self-contained**: `models/` (interfaces/types), `pages/` (routed screen components), `services/` (HTTP calls + feature state), plus a `<feature>-routing.ts` for lazy-loaded routes. Mirror this shape for any new feature rather than inventing a different structure.
- **State management**: no NgRx/Signal-store library is installed — feature services (in each `services/` folder) own their own state via RxJS. Don't introduce NgRx or another state library without first checking whether the existing per-service pattern already covers the need.
- **Auth flow**: `core/interceptors/jwt.interceptor.ts` attaches the JWT to outgoing HTTP requests; `core/guards/auth.guard.ts` protects routes; `core/auth/auth.ts` likely holds the shared auth/session service. `features/auth` holds the actual login/change-password UI pages. Keep this split — shared auth plumbing in `core/auth`, UI screens in `features/auth`.
- **i18n**: new user-facing strings go through `@ngx-translate` (translation keys), not hardcoded text, to stay consistent with the rest of the app.
- **Charts**: check whether the screen you're extending already uses `ngx-charts` or `chart.js`/`ng2-charts` and stay consistent within that feature rather than mixing libraries on the same page.

## Working in this repo

- Primary working directory for this app: `C:\angular-workspace\projects\ehrms` (part of the larger `C:\angular-workspace` CLI workspace — see Workspace context above).
- Dev server: `ng serve ehrms` (serves against `environment.ts`'s `serviceUrl`, `http://localhost:8082` — the `employee` backend must be running).
- When an API contract changes in the `employee` backend (DTO shape, new endpoint, validation rule), update the matching `features/<feature>/models/*.model.ts` and `services/*.service.ts` here to match.
- Follow strict TypeScript settings already enabled — don't relax `tsconfig.json` to silence a type error; fix the type instead.
