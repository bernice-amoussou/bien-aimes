import { FeaturedSermon } from "@/components/home/featured-sermon";
import { Hero } from "@/components/home/hero";
import { LatestSermons } from "@/components/home/latest-sermons";
import { VerseSection } from "@/components/home/verse-section";
import { getSermons } from "@/lib/sermons";

export default async function HomePage() {
  const sermons = await getSermons();
  const [featured, ...others] = sermons;

  return (
    <>
      <Hero
        archive={{
          sermonCount: sermons.length,
          audioFileCount: sermons.reduce((sum, s) => sum + s.audioFiles.length, 0),
          oldestDate: sermons.at(-1)?.date ?? null,
        }}
      />
      {featured && <FeaturedSermon sermon={featured} />}
      {others.length > 0 && <LatestSermons sermons={others.slice(0, 5)} />}
      <VerseSection />
    </>
  );
}
