import { atom, useAtom } from "jotai";
import { useEffect } from "react";

export const pictures = [
  "WhatsApp Image 2026-07-07 at 9.56.19 PM 1",
  "image 31",
  "image 32",
  "image 33",
  "image 34",
  "image 35",
  "image 36",
  "image 37",
  "image 38",
  "image 40",
  "image 41",
  "image 42",
  "image 43",
  "image 44",
  "image 45",
  "image 46",
  "image 47",
  "image 48",
  "image 50",
  "image 51",
  "image 52",
  "image 53",
  "photo1",
];

export const pageAtom = atom(0);
export const flippedPhotoAtom = atom(null);
export const showcaseEndedAtom = atom(false);
export const pages = [
  {
    front: "book-cover",
    back: pictures[0],
  },
];
for (let i = 1; i < pictures.length - 1; i += 2) {
  const pageObj = {
    front: pictures[i % pictures.length],
    back: pictures[(i + 1) % pictures.length],
  };
  pages.push(pageObj);
}

pages.push({
  front: pictures[pictures.length - 1],
  back: "book-back",
});

export const UI = () => {
  const [page, setPage] = useAtom(pageAtom);

  // useEffect(() => {
  //   // Avoid playing sound on the very first mount before user interaction
  //   if (page === 0) return;
  //   const audio = new Audio("/audios/page-flip-01a.mp3");
  //   audio.play().catch((err) => {
  //     // Ignore autoplay block errors silently
  //   });
  // }, [page]);

  return (
    <>
      <main className=" pointer-events-none select-none z-10 fixed  inset-0  flex justify-between flex-col hidden">
        <a
          className="pointer-events-auto mt-10 ml-10"
          href="https://lessons.wawasensei.dev/courses/react-three-fiber"
        >
          <img className="w-20" src="/images/wawasensei-white.png" />
        </a>
        <div className="w-full overflow-auto pointer-events-auto flex justify-center">
          <div className="overflow-auto flex items-center gap-4 max-w-full p-10">
            {[...pages].map((_, index) => (
              <button
                key={index}
                className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-lg uppercase shrink-0 border ${
                  index === page
                    ? "bg-white/90 text-black"
                    : "bg-black/30 text-white"
                }`}
                onClick={() => setPage(index)}
              >
                {index === 0 ? "Cover" : `Page ${index}`}
              </button>
            ))}
            <button
              className={`border-transparent hover:border-white transition-all duration-300  px-4 py-3 rounded-full  text-lg uppercase shrink-0 border ${
                page === pages.length
                  ? "bg-white/90 text-black"
                  : "bg-black/30 text-white"
              }`}
              onClick={() => setPage(pages.length)}
            >
              Back Cover
            </button>
          </div>
        </div>
      </main>


    </>
  );
};
