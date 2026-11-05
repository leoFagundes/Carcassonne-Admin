import { describe, expect, it } from "vitest";
import { safeNextPath, withNext } from "../navigation";

const ORIGIN = "https://carcassonne.example";

describe("safeNextPath", () => {
  it.each([
    "//evil.com",
    "/\\evil.com",
    "/\t/evil.com",
    "/\n/evil.com",
    "/\r/evil.com",
    "https://evil.com",
    "evil.com",
    "",
  ])("rejeita %j", (value) => {
    expect(safeNextPath(value, ORIGIN)).toBeNull();
  });

  it("devolve null para null", () => {
    expect(safeNextPath(null, ORIGIN)).toBeNull();
  });

  it("mantém %2F%2F como caminho do próprio site", () => {
    const result = safeNextPath("/%2F%2Fevil.com", ORIGIN);
    expect(result).not.toBeNull();
    expect(new URL(result!, ORIGIN).origin).toBe(ORIGIN);
  });

  it("aceita caminho com query e hash", () => {
    expect(safeNextPath("/aluguel/pedido?x=1", ORIGIN)).toBe("/aluguel/pedido?x=1");
    expect(safeNextPath("/aluguel#topo", ORIGIN)).toBe("/aluguel#topo");
  });
});

describe("withNext", () => {
  it("anexa o destino codificado", () => {
    expect(withNext("/aluguel/cadastro", "/aluguel/pedido")).toBe(
      "/aluguel/cadastro?next=%2Faluguel%2Fpedido",
    );
  });

  it("sem destino devolve só o caminho", () => {
    expect(withNext("/aluguel/cadastro", null)).toBe("/aluguel/cadastro");
  });
});
