// Leaflet Heat Layer types

declare module "leaflet.heat" {
  // This module augments Leaflet with heat layer functionality
  // When imported, it adds L.heatLayer and L.HeatLayer
}

declare module "leaflet" {
  interface HeatLatLngTuple extends Array<number> {
    0: number; // latitude
    1: number; // longitude
    2?: number; // intensity (optional)
  }

  interface HeatLayerOptions {
    minOpacity?: number;
    maxZoom?: number;
    max?: number;
    radius?: number;
    blur?: number;
    gradient?: Record<number, string>;
  }

  interface HeatLayer extends Layer {
    setLatLngs(latlngs: HeatLatLngTuple[]): this;
    addLatLng(latlng: HeatLatLngTuple): this;
    setOptions(options: HeatLayerOptions): this;
    redraw(): this;
  }

  function heatLayer(
    latlngs: HeatLatLngTuple[],
    options?: HeatLayerOptions
  ): HeatLayer;
}
