// lib/rag/map-scan-version.ts
// The current version of map reading, saved on each scan
// (module_map_scans.scan_version). Bump it when a change to map reading needs
// existing modules re-read: the Modules & Files panel re-runs any scan with
// a lower version automatically.
//
// 1: rooms and exits as text.
// 2: also saves each map page's image and each room's position on it.

export const MAP_SCAN_VERSION = 2;
