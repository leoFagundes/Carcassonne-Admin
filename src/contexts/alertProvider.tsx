"use client";

import React, { createContext, useContext, useState, ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiX } from "react-icons/fi";

interface Alert {
  id: number;
  message: string;
}

interface AlertContextType {
  addAlert: (message: string) => void;
}

const AlertContext = createContext<AlertContextType | undefined>(undefined);

export const useAlert = () => {
  const context = useContext(AlertContext);
  if (!context) {
    throw new Error("useAlert deve ser usado dentro de um AlertProvider");
  }
  return context;
};

export function AlertProvider({ children }: { children: ReactNode }) {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  const addAlert = (message: string) => {
    const id = Date.now();
    setAlerts((prev) => [...prev, { id, message }]);

    // Auto-remove após 4 segundos
    setTimeout(() => {
      setAlerts((prev) => prev.filter((alert) => alert.id !== id));
    }, 5000);
  };

  const removeAlert = (id: number) => {
    setAlerts((prev) => prev.filter((alert) => alert.id !== id));
  };

  return (
    <AlertContext.Provider value={{ addAlert }}>
      {children}
      {/* Container dos alerts */}
      <div className="fixed bottom-4 right-4 flex flex-col-reverse items-end gap-2 z-50">
        <AnimatePresence>
          {alerts.map((alert) => (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3 }}
              onClick={() => removeAlert(alert.id)}
              className="flex items-center gap-2 shadow-card bg-primary-gold text-black mx-2 px-4 py-2 rounded-md shadow-lg cursor-pointer hover:opacity-90"
            >
              {alert.message} <FiX size={"16px"} className="min-w-[16px]" />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </AlertContext.Provider>
  );
}
