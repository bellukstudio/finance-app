const P = {
  home: "M3 12l9-9 9 9M5 10v10h14V10", list: "M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01",
  plus: "M12 5v14M5 12h14", chart: "M18 20V10M12 20V4M6 20v-6", menu: "M4 6h16M4 12h16M4 18h16",
  moon: "M21 12.8A9 9 0 1111.2 3a7 7 0 009.8 9.8z", x: "M18 6L6 18M6 6l12 12",
  down: "M12 5v14M5 12l7 7 7-7", up: "M12 19V5M5 12l7-7 7 7", swap: "M7 7h13M16 3l4 4-4 4M17 17H4M8 13l-4 4 4 4",
  save: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6", wallet: "M3 7h16a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2zM3 7l2-3h12v3M16 13h2",
  tag: "M3 12V4h8l10 10-8 8zM7.5 8h.01", eye: "M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12zM12 9a3 3 0 100 6 3 3 0 000-6z",
  edit: "M4 20h4L19 9l-4-4L4 16zM13.5 6.5l4 4", trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  target: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z",
  scale: "M12 3v18M5 7h14M5 7l-3 7a3.5 3.5 0 006 0zM19 7l-3 7a3.5 3.5 0 006 0z", bell: "M6 16V11a6 6 0 1112 0v5l2 2H4zM10 20a2 2 0 004 0",
  alert: "M12 3l10 18H2zM12 10v5M12 18h.01", hand: "M7 11l4-4 3 3 4-4M3 14l5 5 3-1 2 1 6-6-2-2", chev: "M6 9l6 6 6-6",
  left: "M15 6l-6 6 6 6", right: "M9 6l6 6-6 6", lock: "M8 11V7a4 4 0 118 0v4M5 11h14v10H5zM12 15v3",
} as const;
export type IconName = keyof typeof P;
export const Icon = ({ n, className = "ico" }: { n: IconName; className?: string }) => <svg className={className} viewBox="0 0 24 24" aria-hidden="true"><path d={P[n]} /></svg>;
