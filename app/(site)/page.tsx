import { Hero } from "@/components/home/hero";
import { LatestSermons } from "@/components/home/latest-sermons";
import { getSermons } from "@/lib/sermons";

export default async function HomePage() {
  const sermons = await getSermons();

  return (
    <>
      <Hero />
      <LatestSermons sermons={sermons.slice(0, 5)} />
    </>
  );
}
