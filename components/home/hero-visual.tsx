/**
 * Illustration vectorielle : fenêtre gothique en arc, deux lancettes et une rosace,
 * éclairée de l'intérieur. Aucune photographie n'est embarquée dans le projet ;
 * cette composition la remplace sans recourir à une image non vérifiée.
 */
export function HeroVisual({ label }: { label: string }) {
  return (
    <svg viewBox="0 0 420 540" role="img" aria-label={label} className="block h-auto w-full">
      <defs>
        <linearGradient id="hv-stone" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e6d8bb" />
          <stop offset="1" stopColor="#d6c39d" />
        </linearGradient>
        <linearGradient id="hv-glass" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#355f4a" />
          <stop offset="0.5" stopColor="#1f3d2f" />
          <stop offset="1" stopColor="#11241b" />
        </linearGradient>
        <radialGradient id="hv-glow" cx="0.5" cy="0.22" r="0.65">
          <stop offset="0" stopColor="#f6e9c8" stopOpacity="0.6" />
          <stop offset="0.4" stopColor="#c4a462" stopOpacity="0.16" />
          <stop offset="1" stopColor="#c4a462" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="hv-beam" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#fff8e6" stopOpacity="0.2" />
          <stop offset="1" stopColor="#fff8e6" stopOpacity="0" />
        </linearGradient>
        <clipPath id="hv-arch">
          <path d="M70 540V205a140 140 0 0 1 280 0V540Z" />
        </clipPath>
      </defs>

      {/* Filet doré décalé : donne de la profondeur sans encadrer l'image */}
      <path
        d="M24 540V198a186 186 0 0 1 372 0V540"
        fill="none"
        stroke="#c4a462"
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      {/* Embrasure en pierre */}
      <path d="M50 540V200a160 160 0 0 1 320 0V540Z" fill="url(#hv-stone)" />

      {/* Vitrail */}
      <g clipPath="url(#hv-arch)">
        <rect width="420" height="540" fill="url(#hv-glass)" />
        <rect width="420" height="540" fill="url(#hv-glow)" />
        <path d="M165 60 L255 60 L340 540 L80 540Z" fill="url(#hv-beam)" />
      </g>

      {/* Remplage doré */}
      <g fill="none" stroke="#c4a462" strokeWidth="1.5" strokeLinejoin="round" opacity="0.85">
        <path d="M70 540V205a140 140 0 0 1 280 0V540" />
        <path d="M96 520V272Q96 218 150 200Q204 218 204 272V520" />
        <path d="M216 520V272Q216 218 270 200Q324 218 324 272V520" />
        <circle cx="210" cy="132" r="42" />
        <circle cx="210" cy="132" r="13" />
        <path d="M210 90v84M173.6 111l72.8 42M173.6 153l72.8-42" opacity="0.7" />
        <path d="M150 200V520M270 200V520" opacity="0.4" />
        <path d="M96 350h108M216 350h108M96 430h108M216 430h108" opacity="0.3" />
      </g>
    </svg>
  );
}
