/** Evita errores de prerender/build (search params) en Vercel y fuerza render dinámico. */
export const dynamic = "force-dynamic";

export default function PublicRepairStatusLayout({ children }) {
  return children;
}
