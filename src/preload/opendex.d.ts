// Ambient global so the renderer is fully typed against window.talkit and window.opendex.
import type { OpenDexApi, TalkItApi } from "./index";

declare global {
  interface Window {
    talkit: TalkItApi;
    opendex: OpenDexApi;
  }
}

export {};
