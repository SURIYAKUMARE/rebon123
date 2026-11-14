# Rebon

Local learning app for the Finova professional path. This is the same Vite site that runs on this machine.

## Run it

You need Node.js 20 or newer.

```sh
npm install
npm run dev
```

Open http://localhost:8080/

Learn, Work, and Proof run from the files in this repo. Saved lesson audio is already in `public/audio/lessons`, so those recorded lines play without a voice server.

No `.env.local` is required for that local run. If Supabase keys are added later, set `VITE_AUTH_OPTIONAL=true` in `.env.local` for laptop testing. Do not turn that flag on in production.

Copy `.env.example` when you need API keys. Do not commit `.env`, `.env.local`, or any token file.
