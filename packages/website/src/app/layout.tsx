import type { Metadata } from "next";
import { Outfit, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains",
  display: "swap",
});

// Static string literals only, no user input. Safe for dangerouslySetInnerHTML.
const themeScript = [
  "(function(){",
  "try{",
  "var s=localStorage.getItem('theme');",
  "if(s==='light'||s==='dark'){document.documentElement.setAttribute('data-theme',s)}",
  "else if(window.matchMedia('(prefers-color-scheme:light)').matches){",
  "document.documentElement.setAttribute('data-theme','light')}",
  "}catch(e){}",
  "})()",
].join("");

export const metadata: Metadata = {
  title: "Tomomo: Build your AI agent team and do anything",
  description:
    "Create agents with personality, memory, and unique characters. Launch them on any project with any runtime. CLI, desktop app, and VS Code extension.",
  metadataBase: new URL("https://www.tomomo.app"),
  openGraph: {
    title: "Tomomo: Build your AI agent team and do anything",
    description:
      "Create agents with personality, memory, and unique characters. Launch them on any project with any runtime.",
    url: "https://www.tomomo.app",
    siteName: "Tomomo",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tomomo: Build your AI agent team and do anything",
    description:
      "Create agents with personality, memory, and unique characters. Launch them on any project with any runtime.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${outfit.variable} ${jetbrainsMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              name: "Tomomo",
              description:
                "Build your AI agent team and do anything. Create agents with personality, memory, and unique characters.",
              url: "https://www.tomomo.app",
              applicationCategory: "DeveloperApplication",
              operatingSystem: "macOS, Windows, Linux",
              offers: {
                "@type": "Offer",
                price: "0",
                priceCurrency: "USD",
              },
              license: "https://opensource.org/licenses/MIT",
            }),
          }}
        />
      </head>
      <body className="font-sans">{children}</body>
    </html>
  );
}
