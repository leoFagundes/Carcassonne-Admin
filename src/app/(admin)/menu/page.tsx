import React from "react";
import { LuPizza } from "react-icons/lu";

export default function MenuPage() {
  return (
    <section className="flex w-full justify-center items-center gap-2 text-primary-gold">
      <LuPizza size={"48px"} />
      <h2 className="text-5xl text-primary-gold">Cardápio</h2>
    </section>
  );
}
