import type { CollectionView } from "./collectionUtils";

/** Esqueleto do acervo enquanto os jogos chegam (no formato da visão escolhida). */
export default function CollectionSkeleton({ view }: { view: CollectionView }) {
  if (view === "list") {
    return (
      <div aria-hidden="true" className="flex flex-col gap-2 w-full max-w-2xl">
        {Array.from({ length: 7 }, (_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 p-2 rounded-xl border border-primary-gold/10 bg-secondary-black/40"
          >
            <span className="cm-skel w-16 h-16 rounded-lg shrink-0" />
            <div className="flex flex-col gap-2 flex-1">
              <span className="cm-skel h-4 w-1/2 rounded" />
              <span className="cm-skel h-3 w-1/3 rounded" />
              <span className="cm-skel h-2 w-1/4 rounded" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      aria-hidden="true"
      className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4 w-full max-w-6xl"
    >
      {Array.from({ length: 10 }, (_, index) => (
        <div
          key={index}
          className="flex flex-col rounded-xl border border-primary-gold/10 bg-secondary-black/40 overflow-hidden"
        >
          <span className="cm-skel w-full aspect-[4/3]" />
          <div className="flex flex-col gap-2 p-3">
            <span className="cm-skel h-4 w-4/5 rounded" />
            <span className="cm-skel h-3 w-1/2 rounded" />
            <span className="cm-skel h-2 w-2/5 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}
