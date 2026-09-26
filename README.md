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
| Payments | PayPal: `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, `PAYPAL_MODE`, `PAYPAL_WEBHOOK_ID`; OxaPay coin purchases: `OXAPAY_MERCHANT_API_KEY`, `OXAPAY_CALLBACK_URL` |

The Firebase Admin private key must remain server-only. In Vercel, paste it as one environment variable with escaped `\n` line breaks.

## Firebase collections

The server uses Firestore collections for `users`, `profiles`, `wallets`, `liveStreams`, `liveGifts`, `liveComments`, `liveRoomAccess`, `subscriptions`, `statuses`, `kycSubmissions`, `cashoutRequests`, `coinOrders`, `transactions`, and notification data. Wallet changes, room unlocks, subscriptions, gifts, cash-outs, and rewards use Firestore transactions.

Uploads use short-lived Firebase Storage signed URLs. The browser compresses images before uploading avatar, KYC, and status files directly to Firebase Storage.

## Live features

A host starts a stream through a Vercel API route and publishes video/audio through Agora RTC. Each room can be public, paid-entry (25–10,000 coins for a one-time pass), or subscriber-only. Paid-room access is recorded in `liveRoomAccess`; subscriber-only access is checked against the creator membership in `subscriptions` before an Agora token is issued. Other users discover active streams through `/api/live/list`, join the Agora channel as viewers, and can send gifts through the authenticated gift API. Agora RTM carries comments inside the live room. The app does not need `NEXT_PUBLIC_WS_URL` or a persistent server.

## Payments and rewards

PayPal is the default coin-purchase and creator-cashout provider. Set `PAYMENTS_BUY_PROVIDER=oxapay` to use OxaPay crypto invoices for coin purchases; its HMAC-signed `Paid` webhook credits coins only after confirmation. Cash-outs remain on PayPal because OxaPay payouts require a crypto wallet address, not a PayPal email. Paid rooms and subscriptions spend coins already purchased through either provider, so no second card-billing integration is required. Memberships last 30 days and renew manually; there is no automatic recurring charge. HilltopAds rewarded video and the daily login bonus are handled by the Vercel API routes with per-user cooldown/cap checks.

## Deployment

1. Push the repository to GitHub and import it into Vercel.
2. Set all variables from `velantin-production.env.template` in Vercel for the appropriate environment.
3. Enable Email/Password sign-in in Firebase Authentication.
4. Create the Firestore database and apply security rules that deny client writes to wallet, payment, KYC-review, and admin collections. Server routes use Firebase Admin and enforce authentication/authorization.
5. Create a Firebase Storage bucket and configure rules so direct signed uploads are allowed only through the generated signed URLs.
6. Create an Agora project, enable App Certificate, and add its App ID and certificate to Vercel.
7. Deploy. The build command is `next build`; no database migration or WebSocket service is required.

## Native Android/iOS project

`mobile/` is a real Expo native project. Run `cd mobile && npm install`, then `npx expo prebuild` to generate `android/` and `ios/` projects. It includes native camera/microphone permissions, background audio/remote-notification modes, push-notification registration, `velantin://invite?ref=...` referral deep links, Sinhala/Tamil/English labels, and `expo-secure-store` token storage. No `google-services.json`, `GoogleService-Info.plist`, APNs key, signing certificate, or Firebase secret is committed. Add those from the Firebase console and configure APNs/Android notification credentials before a store build. iOS archive/signing requires macOS/Xcode; this Linux sandbox cannot produce a signed `.ipa`.

## Replay recording status

Ending a live stream creates durable replay metadata and gift moments in Firestore, and the replay player consumes a stored `videoUrl` when available. Actual video capture requires an Agora Cloud Recording job plus a provisioned durable Firebase Storage destination; the required customer credentials and bucket details are intentionally blank in the environment templates. Until those deployment-time values and a webhook/finalizer are configured, a replay may correctly show metadata but no playable video asset. Do not claim recording is live merely because a replay document exists.

## Security notes

Firebase browser API keys are identifiers, not server secrets. Firebase Admin credentials, PayPal secrets, and the Agora App Certificate must never be placed in client-exposed variables or committed to Git. Wallet balances are changed only in server-side Firestore transactions; client-side live animations do not grant currency.
