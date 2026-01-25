export interface StandPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  description?: string;
}

// Standard presets (in grid units, typically 1 unit = 1 meter)
export const STAND_PRESETS: StandPreset[] = [
  { id: '3x2', name: '3×2', width: 60, height: 40, description: 'Klein (3×2m)' },
  { id: '3x3', name: '3×3', width: 60, height: 60, description: 'Standaard (3×3m)' },
  { id: '4x3', name: '4×3', width: 80, height: 60, description: 'Medium (4×3m)' },
  { id: '4x4', name: '4×4', width: 80, height: 80, description: 'Groot (4×4m)' },
  { id: '6x4', name: '6×4', width: 120, height: 80, description: 'Extra groot (6×4m)' },
  { id: '6x6', name: '6×6', width: 120, height: 120, description: 'XL (6×6m)' },
];

export function useStandPresets(gridSize: number = 20) {
  // Scale presets based on grid size
  const scaledPresets: StandPreset[] = STAND_PRESETS.map(preset => ({
    ...preset,
    width: (preset.width / 20) * gridSize,
    height: (preset.height / 20) * gridSize,
  }));

  return {
    presets: scaledPresets,
    getPresetById: (id: string) => scaledPresets.find(p => p.id === id),
  };
}
