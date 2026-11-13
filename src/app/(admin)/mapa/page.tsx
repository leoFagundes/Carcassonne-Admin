import ConstructionGate from "@/components/constructionGate";
import FloorMap from "./floorMap";
import { MAP_GATE_KEY } from "./gate";

export default function MapaPage() {
  return (
    <ConstructionGate title="Mapa do pub" description="Esta página está em desenvolvimento e ainda não está disponível." storageKey={MAP_GATE_KEY}>
      <FloorMap />
    </ConstructionGate>
  );
}
