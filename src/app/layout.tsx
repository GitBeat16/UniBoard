import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { MotionProvider } from "@/components/motion-provider";
import "./globals.css";

// One display family throughout, as in the reference. Three weights only —
// the mixed-weight two-line heading is the signature move, so 400/600/700 is
// all the range the system needs.
const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "UniBoard",
  description: "Your whole uni day, on one board.",
};

export const viewport: Viewport = {
  themeColor: "#eff1f0",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${poppins.variable} h-full`}>
      <body className="min-h-full">
        <MotionProvider>{children}</MotionProvider>
      </body>
    </html>
  );
}
