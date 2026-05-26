# IT Resource Zone Android TWA

This directory is reserved for the Bubblewrap-generated Android wrapper for `https://irz.atifhasan.com`.

Recommended values:

- Application name: `IT Resource Zone`
- Package ID: `com.atifhasan.itresourcezone`
- Start URL: `https://irz.atifhasan.com/`
- Display mode: `standalone`
- Orientation: `portrait`

## Generate the Android Project

Run these from the repository root after the production PWA manifest is deployed:

```bash
npx @bubblewrap/cli init --manifest=https://irz.atifhasan.com/manifest.webmanifest
npx @bubblewrap/cli build
```

Bubblewrap will create a signed APK for testing and can produce release artifacts for Play Store. Keep the generated signing keystore private and backed up.

## Digital Asset Links

After the signing certificate is known, replace the placeholder fingerprint in:

```text
public/.well-known/assetlinks.json
```

Use the release signing SHA-256 fingerprint for direct APK testing. If Google Play App Signing is enabled, use the Play App Signing certificate fingerprint from Play Console for the Play Store release.
