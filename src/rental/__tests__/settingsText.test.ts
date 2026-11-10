import { describe, expect, it } from "vitest";
import { weekdaysText } from "../settingsText";

describe("weekdaysText", () => {
  it("resume os dias de retirada", () => {
    expect(weekdaysText([0, 1, 2, 3, 4, 5, 6])).toBe("Todos os dias");
    expect(weekdaysText([2, 3, 4, 5, 6, 0])).toBe("Ter a Dom");
    expect(weekdaysText([1, 2, 3, 4, 5])).toBe("Seg a Sex");
    expect(weekdaysText([5, 6, 0])).toBe("Sex a Dom");
    expect(weekdaysText([1, 3, 5])).toBe("Seg, Qua, Sex");
    expect(weekdaysText([6, 0])).toBe("Dom, Sáb");
    expect(weekdaysText([])).toBe("Nenhum dia");
  });
});
