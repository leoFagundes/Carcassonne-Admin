import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }

  try {
    const response = await fetch(url, { cache: "no-store" });

    if (!response.ok) {
      return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    const buffer = await response.arrayBuffer();

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar imagem" }, { status: 500 });
  }
}
