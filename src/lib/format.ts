export const rupiah = (n: number) => "Rp" + new Intl.NumberFormat("id-ID").format(n);
export const tanggal = (d: string | Date) => new Intl.DateTimeFormat("id-ID", { timeZone: "Asia/Jakarta", day: "2-digit", month: "2-digit", year: "numeric" }).format(new Date(d));
