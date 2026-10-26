import { REPO, downloadUrl, type OSKey } from "../lib/download";

const BUILDS: { os: OSKey; img: string; alt: string }[] = [
  { os: "win", img: "./download/download-windows.svg", alt: "Download for Windows" },
  {
    os: "mac-arm64",
    img: "./download/download-macos-arm64.svg",
    alt: "Download for macOS — Apple Silicon",
  },
  { os: "mac-x64", img: "./download/download-macos-x64.svg", alt: "Download for macOS — Intel" },
  {
    os: "linux-appimage",
    img: "./download/download-linux-appimage.svg",
    alt: "Download the AppImage for Linux",
  },
  { os: "linux-deb", img: "./download/download-debian-deb.svg", alt: "Download the .deb for Debian" },
];

export function Download() {
  return (
    <section id="download" className="border-t border-[#343D34] bg-[#141914]">
      <div className="mx-auto w-full max-w-6xl px-5 py-20 sm:px-8">
        <h2 className="wordmark text-3xl font-extrabold sm:text-4xl text-[#F2F5ED]">
          Download Talk<span className="text-[#C5F467]">It</span>.
        </h2>
        <p className="mt-3 text-[#A4ADA0]">
          Free and open source. Built first for Windows 10 & 11, with cross-platform support.
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-4">
          {BUILDS.map((build) => (
            <a
              key={build.os}
              href={downloadUrl(build.os)}
              className="inline-block rounded-xl border border-[#343D34] bg-[#181f18] p-1.5 transition hover:border-[#C5F467]/60 hover:shadow-[0_0_15px_rgba(197,244,103,0.15)]"
            >
              <img src={build.img} alt={build.alt} height={44} className="h-11 invert opacity-90 hover:opacity-100" />
            </a>
          ))}
        </div>

        <p className="mt-6 text-sm text-[#8AA89A]">
          Or browse all builds and changelogs on the{" "}
          <a href={`${REPO}/releases`} className="text-[#C5F467] underline hover:text-[#C5F467]/80">
            Releases
          </a>{" "}
          page.
        </p>
      </div>
    </section>
  );
}
