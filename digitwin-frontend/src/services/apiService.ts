// Service to interact with the Go backend API
import { buildApiUrl } from '../config/api';

// Types matching the Go backend response format
export interface PlanningArea {
  id: string;
  name: string;
  region: string;
  center_lat: number;
  center_lng: number;
  bounds_min_lat: number;
  bounds_min_lng: number;
  bounds_max_lat: number;
  bounds_max_lng: number;
  created_at: string;
  updated_at: string;
}

export interface Building {
  id: number;
  planning_area_id: string;
  footprint: Array<{ x: number; z: number }>;
  height: number;
  building_type?: string;
  levels?: number;
  source?: string;
  created_at: string;
}

export interface WindStreamline {
  id: number;
  planning_area_id: string;
  direction: string;
  points: Array<{ x: number; y: number; z: number }>;
  created_at: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: string;
}

// Fetch all planning areas
export async function fetchPlanningAreas(): Promise<PlanningArea[]> {
  const url = buildApiUrl('/api/areas');
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch planning areas: ${response.statusText}`);
  }

  const json: ApiResponse<PlanningArea[]> = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch planning areas');
  }

  return json.data;
}

// Fetch buildings for a specific area
export async function fetchBuildingsByArea(areaId: string): Promise<Building[]> {
  const url = buildApiUrl(`/api/buildings/${areaId}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch buildings: ${response.statusText}`);
  }

  const json: ApiResponse<Building[]> = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch buildings');
  }

  return json.data;
}

// Fetch all streamlines for a specific area
export async function fetchStreamlinesByArea(areaId: string): Promise<WindStreamline[]> {
  const url = buildApiUrl(`/api/streamlines/${areaId}/all`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch streamlines: ${response.statusText}`);
  }

  const json: ApiResponse<WindStreamline[]> = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch streamlines');
  }

  return json.data;
}

// Fetch streamlines for a specific area and direction
export async function fetchStreamlinesByAreaAndDirection(
  areaId: string,
  direction: string
): Promise<WindStreamline[]> {
  const url = buildApiUrl(`/api/streamlines/${areaId}?direction=${direction}`);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to fetch streamlines: ${response.statusText}`);
  }

  const json: ApiResponse<WindStreamline[]> = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Failed to fetch streamlines');
  }

  return json.data;
}

// Health check
export async function checkHealth(): Promise<{ status: string; database: any; redis: any }> {
  const url = buildApiUrl('/health');
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Health check failed: ${response.statusText}`);
  }

  const json: ApiResponse<any> = await response.json();
  if (!json.success) {
    throw new Error(json.error || 'Health check failed');
  }

  return json.data;
}
