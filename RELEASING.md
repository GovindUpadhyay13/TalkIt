# Releasing TalkIt

Releases are built and published automatically by GitHub Actions
(`.github/workflows/release.yml`) whenever you push a `v*.*.*` tag. Each platform
runs on its own runner (Windows / macOS / Ubuntu), and electron-builder uploads
the installers **and** the `latest-*.yml` update manifests to a GitHub Release.
The app's auto-updater (`src/main/updater.ts`) reads those manifests straight
from the release — there is no separate update server to maintain.

## Cutting a release

From a clean working tree, run one of the cut scripts. Each bumps the version
in `package.json`, makes a `Release vX.Y.Z` commit, creates a matching `vX.Y.Z`
tag, and pushes both — which triggers the release workflow:

```bash
pnpm cut:patch   # 1.1.14 -> 1.1.15
pnpm cut:minor   # 1.1.14 -> 1.2.0
pnpm cut:major   # 1.1.14 -> 2.0.0
```

> These wrap `pnpm version <type> && git push --follow-tags`. `pnpm version`
> refuses to run with uncommitted changes, so commit your work first.

Then watch the build at <https://github.com/GovindUpadhyay13/TalkIt/actions>.
electron-builder uploads installers to a **draft** GitHub Release while the
platform jobs run. Once they all succeed, the `publish` job writes
release notes and flips the release to **published**.

---

## Testing the build locally

```bash
pnpm dist          # builds installers into dist/ without publishing
```

Auto-update is disabled in `pnpm dev` and only runs in packaged builds
(`app.isPackaged`).
