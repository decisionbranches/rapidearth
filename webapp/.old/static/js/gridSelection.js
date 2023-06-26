
//top-left reference point of denmark
let p0 = {
  scrX: 0,
  scrY: 0,
  lat: 57.759426801154135,
  lng: 8.064052094911052
}
/*   let p0 = {
    scrX: 0,
    scrY: 0,
    lat: 57.7598571879127,
    lng: 8.064272036356007
  } */

//bottom-right reference point of denmark
let p1 = {
  scrX: 4486400,
  scrY: 2018600,
  lat: 54.542126386242565,
  lng: 15.214600287450079
}

//Earth Radius in meters
//let radiusEarthGridSelection = 6346472;
let radiusEarthGridSelection = 1;

function latlngToGlobalXY(lat, lng) {

  let x = radiusEarthGridSelection * lng * Math.cos((p0.lat + p1.lat) / 2);
  let y = radiusEarthGridSelection * lat;

  return { x: x, y: y }
}

function globalXYtoLatLng(x, y) {

  let lng = x / (radiusEarthGridSelection * Math.cos((p0.lat + p1.lat) / 2));
  let lat = y / radiusEarthGridSelection;

  return { lng: lng, lat: lat }
}

p0.pos = latlngToGlobalXY(p0.lat, p0.lng);
p1.pos = latlngToGlobalXY(p1.lat, p1.lng);


// Converts lat and lng coordinates to screen X and Y positions
function latlngToScreenXY(lat, lng) {
  let pos = latlngToGlobalXY(lat, lng);
  pos.perX = ((pos.x - p0.pos.x) / (p1.pos.x - p0.pos.x));
  pos.perY = ((pos.y - p0.pos.y) / (p1.pos.y - p0.pos.y));

  return {
    x: p0.scrX + (p1.scrX - p0.scrX) * pos.perX,
    y: p0.scrY + (p1.scrY - p0.scrY) * pos.perY
  }
}

// Converts screen X and Y positions to lat and lng coordinates
function screenXYtoLatLng(scr_x, scr_y) {

  let scr_perX = (scr_x - p0.scrX) / (p1.scrX - p0.scrX)
  let scr_perY = (scr_y - p0.scrY) / (p1.scrY - p0.scrY)
  let global_x = (p1.pos.x - p0.pos.x) * scr_perX + p0.pos.x
  let global_y = (p1.pos.y - p0.pos.y) * scr_perY + p0.pos.y
  let pos_new = globalXYtoLatLng(global_x, global_y)

  return {
    lat: pos_new.lat,
    lng: pos_new.lng
  }
}





function getBoundToLatLngDK(lat, lng, n = 200) {

  let stepSize = n
  let pos = latlngToScreenXY(lat, lng)
  let scr_x_quotient = Math.floor(pos.x / stepSize);
  let scr_y_quotient = Math.floor(pos.y / stepSize);

  let xy = L.CRS.EPSG3857.project(L.latLng([lat, lng]))
  console.log("x_scr:", pos.x, "y_scr:", pos.y)
  console.log("x_coord:", xy["x"], "y_coord:", xy["y"])
  console.log(scr_x_quotient)
  console.log(scr_y_quotient)

  let northWest = screenXYtoLatLng(scr_x_quotient * stepSize, scr_y_quotient * stepSize)
  let northEast = screenXYtoLatLng(scr_x_quotient * stepSize + n, scr_y_quotient * stepSize)
  let southEast = screenXYtoLatLng(scr_x_quotient * stepSize + n, scr_y_quotient * stepSize + n)
  let southWest = screenXYtoLatLng(scr_x_quotient * stepSize, scr_y_quotient * stepSize + n)

  let latlngs = [
    northWest,
    northEast,
    southEast,
    southWest
  ];
  return [latlngs]
}

function getBoundToXY(x, y, n = 200) {
  let latLng = L.CRS.EPSG3857.unproject(L.point(x, y))
  let lat = latLng.lat
  let lng = latLng.lng
  let stepSize = n
  let pos = latlngToScreenXY(lat, lng)
  let scr_x_quotient = Math.floor(pos.x / stepSize);
  let scr_y_quotient = Math.floor(pos.y / stepSize);

  console.log("x:", pos.x, "y:", pos.y)
  console.log(scr_x_quotient)
  console.log(scr_y_quotient)

  let northWest = screenXYtoLatLng(scr_x_quotient * stepSize, scr_y_quotient * stepSize)
  let northEast = screenXYtoLatLng(scr_x_quotient * stepSize + n, scr_y_quotient * stepSize)
  let southEast = screenXYtoLatLng(scr_x_quotient * stepSize + n, scr_y_quotient * stepSize + n)
  let southWest = screenXYtoLatLng(scr_x_quotient * stepSize, scr_y_quotient * stepSize + n)

  let latlngs = [
    northWest,
    northEast,
    southEast,
    southWest
  ];
  return [latlngs]
}



function throttle(cb, delay = 1000) {
  let shouldWait = false
  let waitingArgs
  const timeoutFunc = () => {
    if (waitingArgs == null) {
      shouldWait = false
    } else {
      cb(...waitingArgs)
      waitingArgs = null
      setTimeout(timeoutFunc, delay)
    }
  }

  return (...args) => {
    if (shouldWait) {
      waitingArgs = args
      return
    }

    cb(...args)
    shouldWait = true
    setTimeout(timeoutFunc, delay)
  }
}

const createGridNew = throttle(e => {
  let point = e.latlng
  if (map.getZoom() > 14 && !isMarkerInsidePolygon(point.lat, point.lng, lastGridSelected)) {

    fetch(`https://searchservice.dev.search-engine.space/nearest_feature/${point.lng}/${point.lat}/${searcher}/${searchSize}?crs=4326`, {
      method: "get",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    })
      .then(response => response.json())
      .then(data => {
        let [lng, lat, size] = data["4326"];
        let [x, y] = data["3857"];
        console.log(lng, lat)


        map.eachLayer(function (layer) {
          if (layer.options.selectionRectangle === true) {
            layer.remove();
          }
        });
        let [gridLatLngBounds, boundsInner] = getBoundToLatLngFetch(lat, lng);
        let currentGrid = L.polygon(gridLatLngBounds, { color: '#ee5100', fill: false, weight: 4, selectionRectangle: true })
        currentGrid.addTo(map);
        lastGridSelected = currentGrid
      })
  }
}, 250)

function getBoundToLatLngFetch(lat, lng) {
  let currentSearcher = searcherList[searcher]
  let gridLatLngBounds = [0, 0]
  if (currentSearcher["country"] == "dk") {
     [gridLatLngBounds] = getBoundToLatLngFetchDK(lat, lng)
  }
  else if (currentSearcher["country"] == "de") {
     [gridLatLngBounds] = getBoundToLatLngFetchDE(lat, lng)

  }
  return [gridLatLngBounds];
}


let lastGridSelected = L.polygon([[0, 0]])




function getBoundToLatLngFetchDK(lat, lng) {
  let centerScreen = latlngToScreenXY(lat, lng)
  let centerScreenX = centerScreen["x"]
  let centerScreenY = centerScreen["y"]

  let size = Number(searchSize)
  let northWest = screenXYtoLatLng(centerScreenX - (size / 2), centerScreenY - (size / 2))
  let northEast = screenXYtoLatLng(centerScreenX + (size / 2), centerScreenY - (size / 2))
  let southEast = screenXYtoLatLng(centerScreenX + (size / 2), centerScreenY + (size / 2))
  let southWest = screenXYtoLatLng(centerScreenX - (size / 2), centerScreenY + (size / 2))


  let latlngs = [
    northWest,
    northEast,
    southEast,
    southWest
  ];
  return [latlngs]
}

function removeGrid() {
  if (map.getZoom() < 15) {
    map.eachLayer(function (layer) {
      if (layer.options.selectionRectangle === true) {
        layer.remove();
      }
    });
  }
}

map.on('zoom', removeGrid)
map.on('mousemove', createGridNew);


