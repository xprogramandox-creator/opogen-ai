"use client";

import { useEffect, useState, type CSSProperties } from "react";

const COLORES = [
  "#fbbf24",
  "#f97316",
  "#f43f5e",
  "#ec4899",
  "#a855f7",
  "#6366f1",
  "#38bdf8",
  "#34d399",
];

const PARTICULAS = Array.from({ length: 20 }, (_, indice) => {
  const angulo = (Math.PI * 2 * indice) / 20;
  const distancia = 85 + (indice % 4) * 22;

  return {
    dx: `${Math.cos(angulo) * distancia}px`,
    dy: `${Math.sin(angulo) * distancia}px`,
    color: COLORES[indice % COLORES.length],
    tamano: 7 + (indice % 3) * 3,
  };
});

export default function FuegosArtificiales() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const id = window.setTimeout(() => setVisible(false), 3_100);
    return () => window.clearTimeout(id);
  }, []);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="fuegos-artificiales"
      aria-hidden="true"
      role="presentation"
    >
      <div className="fuego-cohete">
        <svg
          width="48"
          height="72"
          viewBox="0 0 48 72"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M24 3C31 12 35 23 35 36H13C13 23 17 12 24 3Z"
            fill="#f8fafc"
            stroke="#cbd5e1"
            strokeWidth="2"
          />
          <circle cx="24" cy="25" r="6" fill="#38bdf8" stroke="#0f172a" strokeWidth="2" />
          <path d="M13 30L4 42V50L13 43V30Z" fill="#f43f5e" />
          <path d="M35 30L44 42V50L35 43V30Z" fill="#f43f5e" />
          <path d="M17 36H31L26 42H22L17 36Z" fill="#f97316" />
          <path d="M20 43C18 54 21 63 24 68C27 63 30 54 28 43H20Z" fill="#fbbf24" />
        </svg>
      </div>

      <div className="fuego-explosion">
        {PARTICULAS.map((particula, indice) => (
          <span
            key={indice}
            className="fuego-chispa"
            style={
              {
                "--dx": particula.dx,
                "--dy": particula.dy,
                "--color": particula.color,
                "--tamano": `${particula.tamano}px`,
                animationDelay: `${1.5 + (indice % 3) * 0.04}s`,
              } as CSSProperties
            }
          />
        ))}
      </div>
    </div>
  );
}
