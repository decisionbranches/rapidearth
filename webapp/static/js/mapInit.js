let map = new L.map('map', { //crs:crs,
  zoom: 17,doubleClickZoom: false,selectArea: true}).setView([56, 10],6);


let osm =   L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map)


let google = L.tileLayer("https://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}", {
    maxZoom: 18,
    attribution: 'Map Data &copy;2022 Google </a>'
}).addTo(map);

let denmark_wwu = L.tileLayer.wms( "%ENDPOINT_PROTOCOL://%ENDPOINT_MAPSERVER/cgi-bin/mapserv?map=/etc/mapserver/mapserver_denmark.map&VERSION=1.1.1", { 
    layers: 'Denmark 2018',//'projectseminar:Denmark', 
    format: 'image/png',
    transparent: "TRUE",
    version:"1.3.0",
    attribution: 'LS MLDE',
}).addTo(map);

//* MINI MAP *//
// Create minimap in top of the sidebar
let sidebarMinimapContainer = document.getElementsByClassName("satellite-search__sidebar-minimap")[0];
let sidebarWidth = sidebarMinimapContainer.offsetWidth;
let sidebarHeight = sidebarMinimapContainer.offsetHeight;

// Defining osm cartodb-basemaps map service as tile layer for simple minimap
osmURL = 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
osmAttrib = 'Esri, Maxar, Earthstar Geographics, USDA FSA, USGS, Aerogrid, IGN, IGP, and the GIS User Community'
let osm_map = new L.TileLayer(osmURL, {minZoom: 0, maxZoom: 13, attribution: osmAttrib});
options = {width: sidebarWidth, height: sidebarHeight, zoomLevelOffset: -3, aimingRectOptions: {
    color: '#8B0000', weight: 1, interactive: false},
}

// Create mini map with help of Leaflet MiniMap Plugin (https://github.com/Norkart/Leaflet-MiniMap)
let miniMap = new L.Control.MiniMap(osm_map, options).addTo(map);

// Cutting mini map out of the map and paste it into the container in top of the sidebar
let minimapView = document.getElementsByClassName("leaflet-control-minimap")[0]
sidebarMinimapContainer.appendChild(minimapView);


let baseMaps = {
  "OpenStreet Map":osm
};
let overlayMaps = {
  "Google": google,
  "Denmark": denmark_wwu
};
L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
// Add scale bar in lower left corner
L.control.scale({ imperial: true, metric: true }).addTo(map);

