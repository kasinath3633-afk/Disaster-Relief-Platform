# Secure Entry Point

Build a login page component (login.jsx) for a disaster relief management platform.

Context: This is the entry point for "Disaster Simulation & Intelligent Relief Allocation Platform" — a tool used by Administrators, Disaster Management Authorities, and Field Coordinators to simulate disasters and coordinate emergency relief. The tone should feel calm, trustworthy, and professional — like emergency-response software, not a consumer app.

Layout & fields:

Centered card on a full-height page, subtle background (a faint map/topography pattern or gradient works well)

App name/logo area at the top

Email/username input

Password input with show/hide toggle

"Remember me" checkbox

"Forgot password?" link

Primary submit button: "Log In"

Small footer link: "Need access? Contact your administrator" (no public self-registration — accounts are role-assigned)

Inline error state below the form for invalid credentials

Loading spinner state on the button while submitting

Design direction:

Clean, high-contrast, accessible (this may be used in urgent situations)

Primary color: a deep blue or teal (trust/authority), with a warm accent (amber/orange) reserved only for alerts or errors — not decorative

Rounded corners, generous spacing, minimal shadows

Fully responsive — must work well on a laptop in a command center and on a field coordinator's phone

Functional behavior:

On submit, POST { email, password } to /api/auth/login

On success: store the returned JWT and redirect to /dashboard

On failure: show "Invalid email or password" without revealing which field was wrong

Basic client-side validation (valid email format, password required) before hitting the API

Tech: React functional component with hooks, Tailwind CSS for styling.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/e102ae89-f536-4eaf-b19f-b99ac6b4ce60).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
