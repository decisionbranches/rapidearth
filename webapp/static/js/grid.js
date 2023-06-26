// Required variables: 1) map (from mapinit)

var size = 200 //50
var tileLayer = "dk"
var lastGrid = L.polygon([[0, 0]])



// Throttle function implementation from:
// https://blog.webdevsimplified.com/2022-03/debounce-vs-throttle/
// @param cb: function to call throttled
// @param delay: delay between throttled function calls
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


async function fetchAPI_Searchservice_GetBox(point,size,tileLayer) {
  let url = `%ENDPOINT_PROTOCOL://%ENDPOINT_SEARCHSERVICE/get_box/${tileLayer}/${point.lng}/${point.lat}/${size}`//`api/get_box?lng=${point.lng}&lat=${point.lat}&size=${size}&layer=${layer}&crs=4326`
  const response = await fetch(url, {
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
  })
  const json = await response.json();
  return json;
}

// Grid creation function , which adds calculated cut out grid of given position on top of map 
// Limited by throttle function defined above --> limit calls to 4 per second
const createGridNew = async function(e) {
    let point = e.latlng
    // Only calculate a new grid, if zoom level is > 14 and given point is outside of last calcualted  cut out grid
    
    //TODO distance function required instead of isMarkerInsidePolygon
    if (map.getZoom() > 14 ) { //&& !isMarkerInsidePolygon(point.lat, point.lng, lastGrid)) {
      // Requesting nearest feature in realtion to given point from back end API
      
      let data = await fetchAPI_Searchservice_GetBox(point,size,tileLayer);

      // Reading in response coordinates
      let coords = data["rectangle"];
      let idx = data["idx"];

      //Remove last rectangle
      map.eachLayer(function (layer) {
        if (layer.options.selectionRectangle === true) {
          layer.remove();
        }
      });

      // Adding polygon based on this bounds to the leaflet map layer
      let currentGrid = L.polygon(coords, { color: '#ee5100', fill: false, weight: 4, selectionRectangle: true })
      lastGrid = currentGrid

      if (idx != -1) {
        currentGrid.addTo(map);
      }
    }
  }

const throttleCreateGrid = throttle(e => {
  createGridNew(e)
},50)

  // function to remove the grid, if zoom level is under 15 --> too small for grid selection, improves efficiency
function removeGrid() {
    if (map.getZoom() < 15) {
      map.eachLayer(function (layer) {
        if (layer.options.selectionRectangle === true) {
          layer.remove();
        }
      });
    }
  }

  
// Defining event handler for zooming and mouse move movement
map.on('zoom', removeGrid)
