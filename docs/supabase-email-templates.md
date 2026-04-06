# Supabase Email Templates For TideOps

Use this guide when you want Supabase sign-up and password-reset emails to show the TideOps app name and point people back to the correct screens.

## Before you paste the templates

1. In Supabase, open `Authentication -> URL Configuration`.
2. Set `Site URL` to your active TideOps app URL.
3. Add these URLs to the redirect allow list:
   - `http://localhost:3000/login`
   - `http://localhost:3000/reset-password`
   - your production `/login`
   - your production `/reset-password`

The current app now sends:

- new-user confirmation back to `/login`
- password-reset email back to `/reset-password`

## Dashboard location

Open `Authentication -> Email Templates` in the Supabase Dashboard.

Update these two templates:

1. `Confirm signup`
2. `Reset password`

## Suggested subjects

- Confirm signup: `Welcome to TideOps`
- Reset password: `Reset your TideOps password`

## HTML to paste

- Confirmation email HTML: [confirmation.html](../supabase/templates/confirmation.html)
- Recovery email HTML: [recovery.html](../supabase/templates/recovery.html)

## Notes

- The templates use `{{ .ConfirmationURL }}` so Supabase can keep generating the secure action link.
- The recovery template shows `{{ .Email }}` so the recipient can confirm which account is being reset.
- If you later want stronger personalization, Supabase also supports `{{ .Data }}` from `user_metadata`.

## Optional follow-up

If you also want a branded notification after a password changes, add a third template for `Password changed` in the same dashboard section.
