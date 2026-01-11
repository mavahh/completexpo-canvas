import type { Stand, Floorplan, ExhibitorMinimal, ExhibitorServices } from '@/types';
import { StandStatus } from '@/components/floorplan/StandLegend';
import { FloorplanWarning } from '@/components/floorplan/WarningsPanelEnhanced';
import { LabelingConfigEnhanced, LabelingResult } from '@/components/floorplan/LabelingModalEnhanced';
import { ExportOptionsEnhanced } from '@/components/floorplan/ExportDialogEnhanced';

export interface FloorplanEditorState {
  loading: boolean;
  saving: boolean;
  dirty: boolean;
  floorplans: Floorplan[];
  selectedFloorplanId: string | null;
  stands: Stand[];
  exhibitors: ExhibitorMinimal[];
  exhibitorServices: ExhibitorServices[];
  selectedStandIds: Set<string>;
  activeExhibitorId: string | null;
  exhibitorSearch: string;
  eventName: string;
}

export interface CanvasInteractionState {
  zoom: number;
  pan: { x: number; y: number };
  showGrid: boolean;
  snapToGridEnabled: boolean;
  isPanning: boolean;
  panStart: { x: number; y: number };
  dragging: string | null;
  dragOffset: { x: number; y: number };
  resizing: { id: string; handle: string } | null;
  resizeStart: { x: number; y: number; width: number; height: number; standX: number; standY: number };
  spacePressed: boolean;
}

export interface StatusFilters {
  AVAILABLE: boolean;
  RESERVED: boolean;
  SOLD: boolean;
  BLOCKED: boolean;
}

export interface FloorplanEditorActions {
  // Data actions
  fetchData: () => Promise<void>;
  setSelectedFloorplanId: (id: string | null) => void;
  setExhibitorSearch: (search: string) => void;
  setActiveExhibitorId: (id: string | null) => void;
  setSelectedStandIds: (ids: Set<string>) => void;
  
  // Stand actions
  addStand: () => Promise<void>;
  updateStand: (id: string, updates: Partial<Stand>) => void;
  updateStandWithAutoStatus: (id: string, updates: Partial<Stand>) => void;
  deleteStand: () => Promise<void>;
  saveAll: () => Promise<void>;
  
  // Bulk actions
  handleBulkSetStatus: (status: StandStatus) => void;
  handleBulkSnapToGrid: () => void;
  handleBulkClearExhibitor: () => void;
  handleBulkRotate: (degrees: number) => void;
  handleExportLabels: () => void;
  
  // Labeling & warnings
  handleApplyLabels: (config: LabelingConfigEnhanced) => LabelingResult;
  handleFixDuplicates: () => void;
  handleClampToBounds: () => void;
  
  // Floorplan actions
  handleBackgroundChange: (url: string | null, opacity: number) => void;
  handleFloorplanAdded: (floorplan: Floorplan) => void;
  handleExport: (options: ExportOptionsEnhanced) => Promise<void>;
}

export interface CanvasInteractionActions {
  setZoom: (zoom: number) => void;
  setPan: (pan: { x: number; y: number }) => void;
  setShowGrid: (show: boolean) => void;
  setSnapToGridEnabled: (enabled: boolean) => void;
  snapToGrid: (value: number) => number;
  fitToScreen: () => void;
  handleMouseDown: (e: React.MouseEvent, standId?: string) => void;
  handleMouseMove: (e: React.MouseEvent) => void;
  handleMouseUp: () => void;
  handleResizeStart: (e: React.MouseEvent, standId: string, handle: string) => void;
}

export interface ComputedFloorplanData {
  floorplan: Floorplan | undefined;
  selectedStand: Stand | null;
  warnings: FloorplanWarning[];
  statusCounts: Record<StandStatus, number>;
  filteredExhibitors: ExhibitorMinimal[];
  filteredStands: Stand[];
  getExhibitorName: (id: string | null) => string | null;
}
