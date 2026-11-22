import { NextRequest, NextResponse } from "next/server";
import { isAllowedImageUrl, PROXY_MAX_BYTES, sniffImageType } from "@/utils/imageProxy";

/**
 * Busca uma foto do Firebase Storage pelo servidor (o Storage não libera CORS
 * para o navegador desenhar a foto no PDF do cardápio).
 *
 * Só aceita endereços do Storage e só devolve imagens: sem isso, qualquer
 * pessoa poderia usar o servidor para baixar qualquer coisa da internet.
 */
export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "URL obrigatória" }, { status: 400 });
  }
  if (!isAllowedImageUrl(url)) {
    return NextResponse.json({ error: "Endereço não permitido" }, { status: 400 });
  }

  try {
    const response = await fetch(url, { cache: "no-store", redirect: "error" });

    if (!response.ok) {
      return NextResponse.json({ error: "Imagem não encontrada" }, { status: 404 });
    }
    if (Number(response.headers.get("content-length") || 0) > PROXY_MAX_BYTES) {
      return NextResponse.json({ error: "Imagem grande demais" }, { status: 413 });
    }

    const buffer = await response.arrayBuffer();
    if (buffer.byteLength > PROXY_MAX_BYTES) {
      return NextResponse.json({ error: "Imagem grande demais" }, { status: 413 });
    }
    const declared = response.headers.get("content-type") || "";
    const contentType = declared.startsWith("image/") && !declared.includes("svg") ? declared : sniffImageType(new Uint8Array(buffer, 0, Math.min(16, buffer.byteLength)));
    if (!contentType) {
      return NextResponse.json({ error: "Não é uma imagem" }, { status: 415 });
    }

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "public, max-age=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return NextResponse.json({ error: "Erro ao buscar imagem" }, { status: 500 });
  }
}
