"use client";

import bgSongImage from "../../../../public/images/song.png";

export default function MusicRecommendationPage() {
  return (
    <div className="flex flex-col items-center w-full h-screen text-primary-gold px-8">
      <div
        className="h-screen w-full fixed right-0 top-0 max-w-[500px] z-0"
        style={{
          backgroundImage: `url(${bgSongImage.src})`,
          backgroundRepeat: "no-repeat",
          backgroundSize: "cover",
          backgroundPosition: "right center",
        }}
      />

      <section className="my-4 p-1 rounded bg-primary-black/50 backdrop-blur-[6px] z-10">
        <h1 className="text-4xl text-center">Recomende uma Música</h1>
      </section>
      <section className="p-3 rounded bg-primary-black/50 backdrop-blur-[6px] z-10 shadow-card">
        aaaaa
      </section>
    </div>
  );
}
