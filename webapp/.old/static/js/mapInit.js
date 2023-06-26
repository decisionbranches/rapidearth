// Initialize Leaflet and set view to europe
//let map = L.map('map', {crs:crs, doubleClickZoom: false}).setView([51.7, 10.5], 5);
//var crs = new L.Proj.CRS('EPSG:25832', "+proj=utm +zone=32 +ellps=GRS80 +units=m +no_defs",new L.Transformation(1, 0, -1, 0));
var crs = new L.Proj.CRS('EPSG:25832',
	'+proj=utm +zone=33 +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs',
	{
		resolutions: [
			16384,8192, 4096, 2048, 1024, 512, 256, 128,
			64, 32, 16, 8, 4, 2, 1, 0.5
		],
		origin: [0, 0]
	})


let map = new L.map('map', { //crs:crs,
  zoom: 17,doubleClickZoom: false}).setView([56, 15],4);


// Tile layer from Google WMS
// let google = L.tileLayer("https://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}", {
//     maxZoom: 18,
//     attribution: 'Map Data &copy;2022 Google </a>'
// }).addTo(map);


// Denmark tile layer from self-hosted geoserver
// let denmark = L.tileLayer.wms( "https://services.datafordeler.dk/GeoDanmarkOrto/orto_foraar/1.0.0/Wms?username=FZDKGFLQUJ&password=Sonder79", {//"https://geoserver.search-engine.space/geoserver/projectseminar/wms", {
//     layers: 'orto_foraar:geodanmark_2018_12_5cm',//'projectseminar:Denmark',
//     format: 'image/png',
//     attribution: 'PSEFSD'
// }).addTo(map);
// Tile layer from Google WMS
let google = L.tileLayer("https://www.google.cn/maps/vt?lyrs=s@189&gl=cn&x={x}&y={y}&z={z}", {
    maxZoom: 18,
    attribution: 'Map Data &copy;2022 Google </a>',
    crs:crs
}).addTo(map);

let osm = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
}).addTo(map);


let denmark = L.tileLayer.wms( "https://services.datafordeler.dk/GeoDanmarkOrto/orto_foraar/1.0.0/wms?username=FZDKGFLQUJ&password=Sonder79", {//"https://geoserver.search-engine.space/geoserver/projectseminar/wms", {
    layers: 'geodanmark_2018_12_5cm',//'projectseminar:Denmark',
    format: 'image/png',
    transparent: "TRUE",
    //crs: crs,
    version:"1.3.0",
    attribution: 'PSEFSD'
})

let denmark_wwu = L.tileLayer.wms( "http://10.14.29.135:8891/cgi-bin/mapserv?map=/etc/mapserver/mapserver_denmark.map&VERSION=1.1.1", {//"https://geoserver.search-engine.space/geoserver/projectseminar/wms", {
    layers: 'Denmark 2018',//'projectseminar:Denmark',
    format: 'image/png',
    transparent: "TRUE",
    //crs: crs,
    version:"1.3.0",
    attribution: 'PSEFSD'
})


let baseMaps = {
  "OpenStreet Map":osm
};
let overlayMaps = {
  "Google": google,
  "Denmark": denmark,
  "Denmark WWU": denmark_wwu
};
L.control.layers(baseMaps, overlayMaps, { collapsed: true }).addTo(map);
// Add scale bar in lower left corner
L.control.scale({ imperial: true, metric: true }).addTo(map);


