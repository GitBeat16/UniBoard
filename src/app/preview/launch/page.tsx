import { notFound } from "next/navigation";
import { JetBrains_Mono, Roboto_Flex } from "next/font/google";
import { LaunchPlayer } from "@/components/launch/player";

/**
 * The launch film, playable: /preview/launch. Dev only — the finished video
 * is rendered from this page by tools/render-launch.mjs (?render=1 shows the
 * bare frame for it).
 */
export const dynamic = "force-dynamic";

const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500"], variable: "--font-film-mono" });
const display = Roboto_Flex({ subsets: ["latin"], variable: "--font-film-display" });

export default async function LaunchPage({ searchParams }: { searchParams: Promise<{ render?: string }> }) {
  if (process.env.NODE_ENV !== "development") notFound();
  const { render } = await searchParams;
  return (
    <div className={`${mono.variable} ${display.variable}`}>
      <LaunchPlayer render={render === "1"} />
    </div>
  );
}
