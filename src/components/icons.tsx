const P = {
  home: "M3 12l9-9 9 9M5 10v10h14V10", list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14", chart: "M18 20V10M12 20V4M6 20v-6", menu: "M4 6h16M4 12h16M4 18h16",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z", x: "M18 6L6 18M6 6l12 12",
  down: "M12 5v14M5 12l7 7 7-7", up: "M12 19V5M5 12l7-7 7 7", swap: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6", wallet: "M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h12v3M16 13h2",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8h.01", eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4",
  // FIX: path trash versi lengkap (tutup + badan tempat sampah + garis dalam)
  trash: "M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z",
  scale: "M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 006 0zM19 7l-3 7a3.5 3.5 0 006 0z", bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01", hand: "M7 11l4-4 3 3 4-4M3 14l5 5 3-1 2 1 6-6-2-2", chev: "M6 9l6 6 6-6",
  left: "M15 6l-6 6 6 6", right: "M9 6l6 6-6 6",
  lock: "M8 11V7a4 4 0 118 0v4M5 11h14v10H5zM12 15v3",
  users: "M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75",
  repeat: "M17 2l4 4-4 4M3 11V9a3 3 0 013-3h15M7 22l-4-4 4-4M21 13v2a3 3 0 01-3 3H3",
  shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  cog: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06A1.65 1.65 0 004.4 15.1a1.65 1.65 0 00-1.51-1H2.8a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.08a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.08a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  sun: "M12 17a5 5 0 100-10 5 5 0 000 10zM12 1v2M12 21v2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M1 12h2M21 12h2M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4",
  layers: "M12 2l10 5-10 5L2 7zM2 17l10 5 10-5M2 12l10 5 10-5",
  coin: "M12 1v22M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6",
  group: "M3 21V8l9-5 9 5v13M9 21v-6h6v6",
  // FIX: path download dengan flag arc yang eksplisit
  download: "M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  external: "M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6M15 3h6v6M10 14L21 3",
  zoomIn: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35M11 8v6M8 11h6",
  zoomOut: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.35-4.35M8 11h6",
  copy: "M9 9h11a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V10a1 1 0 0 1 1-1zM5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1",
  check: "M20 6L9 17l-5-5",
  fileText: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
} as const;

export type IconName = keyof typeof P;

export const Icon = ({ n, className = "ico" }: { n: IconName; className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    width="18"
    height="18"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    focusable="false"
    // FIX: cegah ikon menyusut di dalam tombol flex (ukuran diatur lewat CSS .ico)
    style={{ flexShrink: 0, display: "block" }}
  >
    <path d={P[n]} />
  </svg>
);
