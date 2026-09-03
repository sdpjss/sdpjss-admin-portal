# SDPJSS Admin Portal

The admin module is the back-office React application for managing SDPJSS
operations. For repository-wide setup and architecture, see the
[root README](../README.md).

## Responsibilities

- Admin and superadmin authentication
- Dashboard statistics and reports
- User, family (`khandan`), guest, and child-member management
- Registered and guest donation entry
- Receipts, refunds, donation categories, and courier charges
- Notices, teams, advertisements, jobs, and staff requirements
- Feature permissions and administrator management
- Address labels, receipt printing, spreadsheet export, and task lists

## Technology

- React 18 and Vite
- React Router
- Tailwind CSS and React Bootstrap
- Axios, React Toastify, and Recharts
- `html2pdf.js`, SheetJS, Papa Parse, and FileSaver

## Requirements

- Node.js `20.19+` or `22.12+`
- npm
- The backend API running locally or available remotely

## Setup

From the repository root:

```bash
cd admin
npm ci
```

Create `admin/.env`:

```dotenv
VITE_APP_ENV=test
VITE_BACKEND_URL=http://localhost:4000
VITE_RAZORPAY_KEY_ID=<test-public-key-id>
VITE_RECAPTCHA_SITE_KEY=<site-key>
VITE_MAHA_PRASAD_COLLECTION_DATE=<display-date>
VITE_MAHA_PRASAD_COLLECTION_TIME=<display-time>
VITE_MAHA_PRASAD_COLLECTION_LOCATION=<display-location>
```

### Environment variables

| Variable | Purpose |
| --- | --- |
| `VITE_APP_ENV` | Set to `test` to display the test banner; use `live` or leave unset for live builds |
| `VITE_BACKEND_URL` | Backend base URL without `/api` or a trailing slash |
| `VITE_RAZORPAY_KEY_ID` | Public Razorpay test key used by browser payment flows |
| `VITE_RECAPTCHA_SITE_KEY` | Public reCAPTCHA site key |
| `VITE_MAHA_PRASAD_COLLECTION_DATE` | Collection date displayed on generated documents |
| `VITE_MAHA_PRASAD_COLLECTION_TIME` | Collection time displayed on generated documents |
| `VITE_MAHA_PRASAD_COLLECTION_LOCATION` | Collection location displayed on generated documents |

Every `VITE_*` value is exposed to browser code. Never put payment secrets,
database credentials, JWT secrets, or email passwords in this file.

## Run Locally

Start the backend first, then run:

```bash
npm run dev
```

The portal is available at `http://localhost:5174` by default. Environment
changes require a development-server restart.

## Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Start Vite with hot module replacement |
| `npm run build` | Create a production build in `dist/` |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run ESLint across the module |

## Source Layout

```text
admin/
├── public/              # Static public assets
├── src/
│   ├── assets/          # Images and icons
│   ├── components/      # Navigation, modals, banners, and shared UI
│   ├── context/         # Authentication, API access, and shared state
│   ├── pages/           # Route-level administrative screens
│   ├── utils/           # Printing helpers
│   ├── App.jsx          # Routes and authenticated layout
│   └── main.jsx         # React entry point and providers
├── netlify.toml         # SPA redirect configuration
├── tailwind.config.js
└── vite.config.js
```

## Authentication and Authorization

- Access and refresh tokens are established by the backend login flow.
- Regular admin access is limited by approval status and allowed features.
- Superadmin-only operations must also be protected by backend middleware;
  hiding UI controls is not sufficient authorization.
- Do not hard-code tokens or bypass authentication for local development.

Route definitions are maintained in `src/App.jsx`.

## Printing and Exports

Receipt and label printing uses helpers in `src/utils/`. When changing printable
components, verify single and grouped output, page breaks, copied styles, A4
layout, and popup permissions. Test PDF and spreadsheet exports with
representative multi-page data.

## Validation

```bash
npm run lint
npm run build
```

Also smoke-test regular admin and superadmin login, role restrictions, donation
and receipt flows, refunds, printing, responsive navigation, and the `TEST`
banner.

## Troubleshooting

### API calls fail or are blocked by CORS

Confirm that the backend is running, `VITE_BACKEND_URL` is correct, and the
backend's `ALLOWED_CORS_ORIGINS` includes `http://localhost:5174`.

### The test banner is missing

Set `VITE_APP_ENV=test` and restart Vite.

### Login loops or protected requests fail

Clear stale site data, log in again, and confirm the backend JWT configuration
and admin approval state.

### Printing opens no window

Allow popups for the local or deployed admin origin and retry the action.

## Deployment

Run `npm run build`, publish `dist/`, and preserve the SPA fallback configured in
`netlify.toml`. Configure environment variables in the hosting platform and use
`VITE_APP_ENV=test` only on test deployments.
