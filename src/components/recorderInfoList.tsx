import { Reorder } from "framer-motion";
import React from "react";
import { InfoType } from "@/types";

interface RecorderInfoListProps {
  items: InfoType[];
  setItems: React.Dispatch<React.SetStateAction<InfoType[]>>;
}

export default function RecorderInfoList({
  items,
  setItems,
}: RecorderInfoListProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <Reorder.Group
        axis="y"
        values={[...items].sort(
          (a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0)
        )}
        onReorder={(newOrder) => {
          const updated = newOrder.map((item, index) => ({
            ...item,
            orderPriority: index,
          }));
          setItems(updated);
        }}
      >
        {[...items]
          .sort((a, b) => (a.orderPriority ?? 0) - (b.orderPriority ?? 0))
          .map((item) => (
            <Reorder.Item
              key={item.id ?? item.name}
              value={item}
              className="my-2 p-3 border border-primary-gold rounded bg-dark-black/50 shadow-card text-primary-gold hover:cursor-grab w-[200px] sm:w-[300px]"
            >
              <div className="flex justify-between items-center">
                <span className="font-semibold">
                  {item.orderPriority}. {item.name}
                </span>
              </div>
              <p className="text-sm text-gray-400 mt-1">{item.description}</p>
            </Reorder.Item>
          ))}
      </Reorder.Group>
    </div>
  );
}
