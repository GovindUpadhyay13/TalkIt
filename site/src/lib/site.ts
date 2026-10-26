// Current TalkIt release shown across the marketing site.
//
// Injected at build time from the newest git tag via VITE_TALKIT_VERSION or VITE_OPENDEX_VERSION
// (see .github/workflows/pages.yml). The fallback is only used for local
// `pnpm dev`/`pnpm build` where the env var isn't set.
export const VERSION =
  import.meta.env.VITE_TALKIT_VERSION ?? import.meta.env.VITE_OPENDEX_VERSION ?? "1.1.1";
