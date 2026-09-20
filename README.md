# Velantin Live Stream

A Vercel-ready live-streaming platform with Firebase Authentication, Firestore data, Firebase Storage uploads, Agora live video/RTM, creator wallets, gifts, rewarded ads, KYC, and PayPal payments.

## Architecture

The application no longer requires a Postgres database, Prisma, Socket.IO server, Cloudinary, or a separate WebSocket deployment. Next.js API routes run on Vercel. Firebase Admin SDK handles trusted server-side reads and writes. Agora handles live video and realtime live-room messaging. Live discovery is refreshed over authenticated HTTP polling, so there is no custom WebSocket service to deploy.

## Local setup

```bash
npm install
cp .env.example .env
npm run dev
```

Fill in the Firebase Web values, Firebase Admin service-account values, Agora credentials, and PayPal credentials before testing authenticated features.

## Required production variables

| Group | Required values |
|---|---|
| Firebase browser | `NEXT_PUBLIC_FIREBASE_API_KEY`, `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`, `NEXT_PUBLIC_FIREBASE_PROJECT_ID`, `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`, `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`, `NEXT_PUBLIC_FIREBASE_APP_ID` |
| Firebase server | `FIREBASE_PROJECT_ID`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` |
| Live video | `AGORA_APP_ID`, `AGORA_APP_CERTIFICATE` |
| Payments | `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID` |

The Firebase Admin private key must remain server-only. In Vercel, paste it as one environment variable with escaped `\n` line breaks.

## Firebase collections

The server uses Firestore collections for `users`, `profiles`, `wallets`, `liveStreams`, `liveGifts`, `liveComments`, `statuses`, `kycSubmissions`, `cashoutRequests`, `coinOrders`, `transactions`, and notification data. Wallet changes and gift/cashout/reward operations use Firestore transactions.

Uploads use short-lived Firebase Storage signed URLs. The browser compresses images before uploading avatar, KYC, and status files directly to Firebase Storage.

## Live features

A host starts a stream through a Vercel API route and publishes video/audio through Agora RTC. Other users discover active streams through `/api/live/list`, join the Agora channel as viewers, and can send gifts through the authenticated gift API. Agora RTM carries comments inside the live room. The app does not need `NEXT_PUBLIC_WS_URL` or a persistent server.

## Payments and rewards

PayPal is the active coin-purchase and creator-cashout provider. PayPal webhooks credit coins only after provider verification. HilltopAds rewarded video and the daily login bonus are handled by the Vercel API routes with per-user cooldown/cap checks.

## Deployment

1. Push the repository to GitHub and import it into Vercel.
2. Set all variables from `velantin-production.env.template` in Vercel for the appropriate environment.
3. Enable Email/Password sign-in in Firebase Authentication.
4. Create the Firestore database and apply security rules that deny client writes to wallet, payment, KYC-review, and admin collections. Server routes use Firebase Admin and enforce authentication/authorization.
5. Create a Firebase Storage bucket and configure rules so direct signed uploads are allowed only through the generated signed URLs.
6. Create an Agora project, enable App Certificate, and add its App ID and certificate to Vercel.
7. Deploy. The build command is `next build`; no database migration or WebSocket service is required.

## Security notes

Firebase browser API keys are identifiers, not server secrets. Firebase Admin credentials, PayPal secrets, and the Agora App Certificate must never be placed in client-exposed variables or committed to Git. Wallet balances are changed only in server-side Firestore transactions; client-side live animations do not grant currency.
