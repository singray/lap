const GLOBAL_THEMES = [
  {
    maxZoom: 19,
    layers: [
      { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', attribution: 'OpenStreetMap' },
    ],
  },
  {
    maxZoom: 17,
    layers: [
      { url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', attribution: 'Powered by Esri' },
    ],
  },
  {
    // Reachable without a proxy from China, so it serves as the automatic
    // fallback when OSM tiles fail to load.
    maxZoom: 18,
    layers: [
      {
        url: 'https://webrd0{s}.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}',
        attribution: 'Gaode',
        subdomains: '1234',
      },
    ],
  },
];

// UI toggle and tile-error fallback both walk OSM -> Gaode -> ArcGIS.
const GLOBAL_THEME_CYCLE = [0, 2, 1];

export function cycleGlobalThemeIndex(themeIndex) {
  const pos = GLOBAL_THEME_CYCLE.indexOf(Number(themeIndex));
  return GLOBAL_THEME_CYCLE[(pos + 1) % GLOBAL_THEME_CYCLE.length] ?? 0;
}

export function nextGlobalFallbackThemeIndex(themeIndex) {
  const pos = GLOBAL_THEME_CYCLE.indexOf(Number(themeIndex));
  if (pos === -1 || pos === GLOBAL_THEME_CYCLE.length - 1) return -1;
  return GLOBAL_THEME_CYCLE[pos + 1];
}

function tiandituUrl(layer, token) {
  return `https://t{s}.tianditu.gov.cn/${layer}_w/wmts?SERVICE=WMTS&REQUEST=GetTile&VERSION=1.0.0&LAYER=${layer.slice(0, 3)}&STYLE=default&TILEMATRIXSET=w&TILEMATRIX={z}&TILEROW={y}&TILECOL={x}&FORMAT=tiles&tk=${encodeURIComponent(token)}`;
}

export function getMapThemes(provider, tiandituToken) {
  const token = String(tiandituToken || '').trim();
  if (provider !== 'tianditu' || !token) return GLOBAL_THEMES;

  const attribution = 'Tianditu';
  return [
    {
      maxZoom: 18,
      layers: [
        { url: tiandituUrl('vec', token), attribution, subdomains: '01234567' },
        { url: tiandituUrl('cva', token), attribution, subdomains: '01234567' },
      ],
    },
    {
      maxZoom: 18,
      layers: [
        { url: tiandituUrl('img', token), attribution, subdomains: '01234567' },
        { url: tiandituUrl('cia', token), attribution, subdomains: '01234567' },
      ],
    },
  ];
}

export function getMapTheme(provider, tiandituToken, themeIndex) {
  const themes = getMapThemes(provider, tiandituToken);
  return themes[Math.min(Math.max(Number(themeIndex) || 0, 0), themes.length - 1)];
}

export function getGlobalMapTheme(themeIndex) {
  return GLOBAL_THEMES[Math.min(Math.max(Number(themeIndex) || 0, 0), GLOBAL_THEMES.length - 1)];
}

export function createTileLayerGroup(L, theme) {
  const layers = theme.layers.map(({ url, attribution, subdomains }) => L.tileLayer(url, {
    attribution,
    maxZoom: theme.maxZoom,
    // Fetch tiles while panning/zooming instead of waiting for the gesture to
    // end, and keep extra offscreen tiles so scrolling back is instant.
    updateWhenIdle: false,
    updateWhenZooming: false,
    keepBuffer: 4,
    ...(subdomains ? { subdomains } : {}),
  }));
  return {
    layer: layers.length === 1 ? layers[0] : L.layerGroup(layers),
    tileLayers: layers,
  };
}
