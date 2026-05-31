import { NextResponse } from "next/server";
import { getActiveBusinessId } from "@/lib/session";
import { getGstrData } from "@/lib/data";

export const runtime = "nodejs";

// GET /api/gstr/export?period=052026&type=gstr1|gstr3b
// Returns the GSTN-portal-shaped JSON. `type` returns a downloadable file; omit for both + summary.
export async function GET(req: Request) {
  const businessId = await getActiveBusinessId();
  if (!businessId) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const period = searchParams.get("period") ?? undefined;
  const type = searchParams.get("type");

  const data = await getGstrData(businessId, period);
  if (!data) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  if (type === "gstr1" || type === "gstr3b") {
    const doc = type === "gstr1" ? data.gstr1 : data.gstr3b;
    return new NextResponse(JSON.stringify(doc, null, 2), {
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="${type.toUpperCase()}_${doc.gstin}_${data.period}.json"`,
      },
    });
  }

  return NextResponse.json({
    period: data.period,
    summary: data.summary,
    gstr1: data.gstr1,
    gstr3b: data.gstr3b,
  });
}
