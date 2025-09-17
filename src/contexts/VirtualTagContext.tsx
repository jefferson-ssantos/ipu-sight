import React, { createContext, useContext, useState } from 'react';

interface VirtualTagContextType {
  selectedVirtualTag: string;
  setSelectedVirtualTag: (tagId: string) => void;
}

const VirtualTagContext = createContext<VirtualTagContextType | undefined>(undefined);

export function VirtualTagProvider({ children }: { children: React.ReactNode }) {
  const [selectedVirtualTag, setSelectedVirtualTag] = useState<string>('');

  return (
    <VirtualTagContext.Provider value={{ selectedVirtualTag, setSelectedVirtualTag }}>
      {children}
    </VirtualTagContext.Provider>
  );
}

export function useVirtualTagContext() {
  const context = useContext(VirtualTagContext);
  if (!context) {
    throw new Error('useVirtualTagContext must be used within a VirtualTagProvider');
  }
  return context;
}