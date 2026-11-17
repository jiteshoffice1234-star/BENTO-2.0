# User Requests

Every improvement request submitted from the BENTO app (**Improvements** section)
is published as a public issue labelled `user-request`:

- Board: https://github.com/jiteshoffice1234-star/BENTO-2.0/issues?q=label%3Auser-request
- This folder holds the versioned copy of each request, written automatically by
  [`.github/workflows/user-requests.yml`](../.github/workflows/user-requests.yml)
  when the issue is opened.

## File format

`user-requests/<issue-number>-<slug>.md` — one file per request, containing the
submitter, the problem they faced, and what they need.

## Maintainer loop

1. Read the open `user-request` issues (or the files in this folder).
2. Update the app to address them.
3. Rebuild the Android APK.

## Submitting from outside the app

Open a new issue on the repository with a title starting with `[Improvement]`
and the `user-request` label; the workflow files it here the same way.
