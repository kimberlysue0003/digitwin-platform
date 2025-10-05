// Global state management for environment data
import { create } from 'zustand';
import { EnvironmentData } from '../types/environment';

export type VisualizationLayer = 'temperature' | 'wind' | 'airQuality' | 'rainfall' | null;
export type ViewMode = '2d' | '3d';
export type Region = 'central' | 'north' | 'south' | 'east' | 'west';

interface EnvironmentStore {
  data: EnvironmentData | null;
  connected: boolean;
  lastUpdate: Date | null;
  activeLayer: VisualizationLayer;
  viewMode: ViewMode;
  selectedRegion: Region;
  selectedPlanningArea: string; // ID of selected planning area
  updateData: (data: EnvironmentData) => void;
  setConnected: (connected: boolean) => void;
  setActiveLayer: (layer: VisualizationLayer) => void;
  setViewMode: (mode: ViewMode) => void;
  setSelectedRegion: (region: Region) => void;
  setSelectedPlanningArea: (areaId: string) => void;
}

export const useEnvironmentStore = create<EnvironmentStore>((set) => ({
  data: null,
  connected: false,
  lastUpdate: null,
  activeLayer: null,
  viewMode: '2d',
  selectedRegion: 'central',
  selectedPlanningArea: 'downtown-core',
  updateData: (data) =>
    set({
      data,
      lastUpdate: new Date(),
    }),
  setConnected: (connected) => set({ connected }),
  setActiveLayer: (layer) => set({ activeLayer: layer }),
  setViewMode: (mode) => set({ viewMode: mode }),
  setSelectedRegion: (region) => set({ selectedRegion: region }),
  setSelectedPlanningArea: (areaId) => set({ selectedPlanningArea: areaId }),
}));
