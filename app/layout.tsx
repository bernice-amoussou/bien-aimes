import type { Metadata, Viewport } from "next";
import { Geist, Newsreader } from "next/font/google";
import { LocaleProvider } from "@/lib/i18n/locale-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const newsreader = Newsreader({
  variable: "--font-newsreader",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: {
    default: "Bien-aimés — La Parole qui nous rassemble",
    template: "%s · Bien-aimés",
  },
  description:
    "Les prédications de l'église, archivées pour être écoutées, retrouvées et partagées.",
  applicationName: "Bien-aimés",
};

export const viewport: Viewport = {
  themeColor: "#faf8f3",
  // Barres d’onglets et lecteur fixés en bas : on gère nous-mêmes la zone de l’indicateur d’accueil.
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="fr"
      className={`${geistSans.variable} ${newsreader.variable} h-full antialiased`}
      // Défilement doux conservé pour les ancres, désactivé par Next.js pendant les navigations.
      data-scroll-behavior="smooth"
      // La langue est ajustée côté client et certaines extensions ajoutent des attributs à <html> :
      // on ignore ces écarts sur cette seule balise (les enfants restent vérifiés).
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <LocaleProvider>{children}</LocaleProvider>
      </body>
    </html>
  );
}
