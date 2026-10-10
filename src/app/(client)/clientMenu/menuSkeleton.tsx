/** Esqueleto do cardápio enquanto os dados chegam (no lugar da tela de carregamento). */
export default function MenuSkeleton() {
  return (
    <div aria-hidden="true" className="flex flex-col gap-4 w-full mt-4">
      {[3, 2].map((rows, section) => (
        <div
          key={section}
          className="flex flex-col items-center w-full bg-secondary-black/60 p-3 sm:p-4 rounded-xl border border-primary-gold/20"
        >
          <span className="cm-skel h-8 w-40 rounded-md" />
          <span className="cm-skel h-px w-full mt-3 mb-5" />
          {Array.from({ length: rows }, (_, row) => (
            <div key={row} className="flex gap-3 w-full p-2 my-1.5">
              <span className="cm-skel w-[100px] h-[100px] rounded-md shrink-0" />
              <div className="flex flex-col gap-2 flex-1 pt-1">
                <span className="cm-skel h-4 w-3/5 rounded" />
                <span className="cm-skel h-3 w-1/4 rounded" />
                <span className="cm-skel h-3 w-full rounded mt-1" />
                <span className="cm-skel h-3 w-4/5 rounded" />
              </div>
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}

/** Categorias "fantasma" na barra do topo enquanto carrega. */
export function NavSkeleton() {
  return (
    <>
      {[72, 96, 64, 88, 76].map((width, index) => (
        <span
          key={index}
          aria-hidden="true"
          className="cm-skel h-[30px] rounded-lg shrink-0"
          style={{ width }}
        />
      ))}
    </>
  );
}
