import { venroys, apiFailure } from "@/lib/venroys";
export async function GET(request: Request) {
  try {
    const input = new URL(request.url).searchParams;
    const query = new URLSearchParams({ limit: "100" });
    for (const k of ["after", "collection"])
      if (input.get(k)) query.set(k, input.get(k)!.slice(0, 200));
    const payload = await venroys(`/products?${query}`);
    payload.data = payload.data.map((p: Record<string, any>) => ({
      ...p,
      id: Number(p.id),
      name: p.name || p.title,
      variants: (p.variants || []).map((v: Record<string, any>) => ({
        ...v,
        id: Number(v.id),
        price: Number(v.price),
      })),
    }));
    return Response.json(payload, {
      headers: { "Cache-Control": "private, no-store" },
    });
  } catch (e) {
    return apiFailure(e);
  }
}
