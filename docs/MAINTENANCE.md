# Maintenance

## Change the script and keep the same URL

1. Sheet > Extensions > Apps Script. Paste the new `apps-script/Code.gs` over the old code and save.
2. Deploy > Manage deployments > the pencil on the one active deployment.
3. Version: **New version**. Click Deploy.
4. Reload the feed URL in a private window and check it.

Saving code alone does **not** change the live URL. A deployment keeps serving the version it was pointed at until you do step 3.

## One deployment at a time

If Manage deployments shows more than one active deployment, select each old one and click **Archive deployment**. Archived deployments cannot be deleted, only archived.

## If the feed URL ends up somewhere it should not

The feed only holds nicknames and points, and the Sheet stays private. To kill the old URL anyway:

1. Deploy > **New deployment** > Web app, Execute as Me, access Anyone. Copy the new `/exec` URL.
2. Deploy > Manage deployments > select the **old** deployment > **Archive deployment**.
3. Put the new URL in the `ENDPOINT` constant at the top of `js/app.js`, commit, and push. Pages republishes in about a minute.
4. Open the old URL in a private window to confirm it no longer returns the JSON (unverified: whether an archived deployment's URL stops serving; check it rather than assume).

## Moving to a different Google account

Copy the Sheet (File > Make a copy) while signed in to the new account. The script comes with it. Re-run the Sheet protections, deploy again, and replace `ENDPOINT` as above.

## GitHub token

Pushes use a fine-grained token that expires. Make a new one with Contents read and write on this repo only, and type it into Terminal yourself.
