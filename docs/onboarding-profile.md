# Profile collection

Ent collects first and last name in its own Profile onboarding screen, followed by workspace creation. Profile photo is optional. Do not skip Profile merely because a social provider supplies names: those values prefill Ent's fields for review.

In the Clerk Production instance, disable First name and Last name collection under User & authentication → Name. The owner confirmed this setting on 17 November 2026. Clerk still handles authentication and email verification. Changing Clerk name settings does not delete names already saved by Ent.

`saveRegistrationProfileAction` validates and trims both names, updates the authenticated user's Clerk record, writes the resulting name/avatar to Ent's `users` row, then records profile completion in Clerk private metadata. An error in either profile write prevents a successful response and progression to Workspace. These are separate provider/database writes, not a distributed transaction: retrying after a partial failure safely repeats the profile save. Normal authenticated requests also reconcile the app profile with Clerk.

Public-board signup returns to the board without workspace onboarding. A public participant entering workspace management later completes Ent's Profile/Workspace flow if they have no workspace. Names on public-only accounts can come from an identity provider or later Account settings.

Offline regression check:

```sh
node --conditions=react-server --import tsx --test tests/registration-profile.test.ts tests/auth-flow.test.ts
```

The regression invokes the real registration action with mocked Clerk/database boundaries and checks both saves, authenticated account binding, invalid fields, failures and retry. It does not create real Clerk users. For the production smoke test, sign up with a new account, confirm Clerk does not ask for names, enter them in Ent, and check the resulting Account page and Clerk user profile.
