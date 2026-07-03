import { create } from 'zustand';

interface AppState {
  scrollProgress: number;
  setScrollProgress: (progress: number) => void;
  mouseVelocity: { x: number; y: number };
  setMouseVelocity: (velocity: { x: number; y: number }) => void;
  systemEnergy: number;
  setSystemEnergy: (energy: number) => void;
  showGodSphere: boolean;
  setShowGodSphere: (show: boolean) => void;
}

export const useStore = create<AppState>((set) => ({
  scrollProgress: 0,
  setScrollProgress: (progress) => set({ scrollProgress: progress }),
  mouseVelocity: { x: 0, y: 0 },
  setMouseVelocity: (velocity) => set({ mouseVelocity: velocity }),
  systemEnergy: 0,
  setSystemEnergy: (energy) => set({ systemEnergy: energy }),
  showGodSphere: false,
  setShowGodSphere: (show) => set({ showGodSphere: show }),
}));
