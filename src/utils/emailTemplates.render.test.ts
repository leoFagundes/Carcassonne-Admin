import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { render } from "@react-email/components";
import { RentalOrderEmail } from "@/components/react-email/rentalOrderEmail";
import { RentalRefundEmail } from "@/components/react-email/rentalRefundEmail";
import { AccountActionEmail } from "@/components/react-email/accountActionEmail";

// Os e-mails usam os textos editados: o padrão e um texto mudado precisam renderizar.
describe("e-mails com textos editáveis", () => {
  it("confirmação do aluguel troca variáveis e o link das regras", async () => {
    const html = await render(
      createElement(RentalOrderEmail, {
        customerName: "Maria",
        code: "K7P2QX",
        items: [{ gameName: "Catan", startDate: "2026-11-10", dueDate: "2026-11-17", price: 4500 }],
        total: 4500,
        rulesUrl: "https://exemplo.com/aluguel/regras",
        copy: { heading: "Oi {nome}!", rulesText: "Veja as {regras}." },
      }),
    );
    expect(html).toContain("Oi Maria!");
    expect(html).toContain("o jogo");
    expect(html).toContain('href="https://exemplo.com/aluguel/regras"');
  });

  it("reembolso e conta renderizam com o padrão", async () => {
    const refund = await render(
      createElement(RentalRefundEmail, { customerName: "Maria", code: "AB12", amount: 4500, reason: "Motivo X." }),
    );
    expect(refund).toContain("Motivo X.");
    const reset = await render(createElement(AccountActionEmail, { kind: "reset", link: "https://x.com/r" }));
    expect(reset).toContain("Criar nova senha");
    expect(reset).toContain("1 hora");
    const verify = await render(
      createElement(AccountActionEmail, { kind: "verify", link: "https://x.com/v", copy: { buttonLabel: "Confirmar agora" } }),
    );
    expect(verify).toContain("Confirmar agora");
  });
});
