// Global parameter for state management

// All fetched results
let searchResults = {"3857":[]}

// Results, which are currently displayed (possible filtered)
let displayedSearchResults = {"3857":[]}
let searchLatLngPoint = []
let numberOfImagesLoadedLazy =  8

let DK_northEast_LatLng = L.CRS.EPSG3857.unproject(L.point(897686.1729359293, 7916949.504534337))
let DK_southWest_LatLng = L.CRS.EPSG3857.unproject(L.point(1693670.5563292983, 7273540.304949113))
let DK_bounds = L.latLngBounds(DK_northEast_LatLng, DK_southWest_LatLng)
let DE_bounds = L.latLngBounds([55.0783672267783, 15.117187497956401], [47.27922899754083, 5.97656249922613]);
let boundingInfosCountries = {"dk": DK_bounds, "de": DE_bounds}
let searchExecuting = false
let searchAreas = {}

// Current searcher
let searcher = '';
// Searcher options.
let searcherList = [];
// Searcher of the previous search
let searcherOfLastSearch = '';
// Index of the cutout from the previous search
let indexOfLastSearch = 0;
// Current search size
let searchSize = 200;
// Search size of the previous search
let sizeOfLastSearch = 0;
// Country of last search
let countryOfLastSearch = '';
// Bounds of the searcher
//let searcherBounds = L.rectangle([[0,0],[0,0]], {color: "#00fff7", weight: 1, fill: false, searcherBounds: true});
// Search result amount
let resultAmount = 1000;


fetch(`https://searchservice.dev.search-engine.space/get_available_searchers`, {
    method: "get",
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    }
})
.then(response => response.json())
.then(data => {
    searcherList = data;
    let searcherSelection = document.getElementById("searcher-config");
    let sizeSelection = document.getElementById("searcher-size-config");
    searcherSelection.innerHTML = "";
    sizeSelection.innerHTML = "";
    let i = 0;
    for (let oneSearcher in data){
        let opt = document.createElement('option');
        opt.value = oneSearcher;
        opt.innerHTML = data[oneSearcher].display_name;
        searcherSelection.appendChild(opt);
        if(i === 0){
            searcher = oneSearcher;
            searchSize = data[oneSearcher].sizes[0];
            for(let j=0; j<data[oneSearcher].sizes.length; j++){
                let opt = document.createElement('option');
                opt.value = j.toString();
                opt.innerHTML = data[oneSearcher].sizes[j].toString() + " Pixel";
                sizeSelection.appendChild(opt);
            }
            //searcherBounds.setBounds([[data[oneSearcher].boundaries.top, data[oneSearcher].boundaries.left],[data[oneSearcher].boundaries.bottom, data[oneSearcher].boundaries.right]]);
            //searcherBounds.addTo(map);
        }
        i++;
    }
})
.catch(error => {
    message = "Sorry! There was an error with retrieving the searchers. Please reload the site."
    displayError(message);
})


function switchSearcher(searcherSelection){
    searcher = searcherSelection.value;
    let sizeSelection = document.getElementById("searcher-size-config");
    sizeSelection.innerHTML = "";
    let sizes = searcherList[searcherSelection.value].sizes;
    for(let i=0; i<sizes.length; i++){
        let opt = document.createElement('option');
        opt.value = i.toString();
        opt.innerHTML = sizes[i].toString() + " Pixel";
        sizeSelection.appendChild(opt);
    }
    searchSize = sizes[0];
    /*searcherBounds.setBounds([
        [searcherList[searcher].boundaries.top, searcherList[searcher].boundaries.left],
        [searcherList[searcher].boundaries.bottom, searcherList[searcher].boundaries.right]
    ]);*/
    //calculateGlobalXAndY();
    closeAllWindows();
}

function switchSize(sizeSelection){
    let searcherSelection = document.getElementById("searcher-config");
    searchSize = searcherList[searcherSelection.value].sizes[sizeSelection.value];
    closeAllWindows();
}

function switchAmount(amountSelection){
    resultAmount = amountSelection.value;
}

function closeAllWindows(){
    if(document.getElementById("satellite-search__feedback").style.display !== "none"){
      displaySearchFeedback();
    }
    if(document.getElementById("satellite-search__country_selection").style.display !== "none"){
      displayCountrySelection();
    }
    if(document.getElementById("satellite-search__share_output").style.display !== "none"){
      displaySearchSharing();
    }
    if(document.getElementById("satellite-search__coord_input").style.display !== "none"){
      displayCoordinateSelection();
    }
}

// tbd
function createResultsOnMap(start, end) {
    for (let i = 0; i < displayedSearchResults["3857"].slice(start, end).length; i++) {
      let latLngPoint = L.CRS.EPSG3857.unproject(L.point(displayedSearchResults["3857"][i]["x"], displayedSearchResults["3857"][i]["y"]))
      let [bounds, boundsInner]  = getBoundToLatLngFetch(latLngPoint.lat, latLngPoint.lng)
      L.polygon(bounds,
            {color: "#dc000e", fill: false, weight: 4, searchArea: true, id: `${latLngPoint.lat},${latLngPoint.lng}`}).addTo(map);
    }
}

// Navigate the view of the map to the search result which is clicked on in the sidebar
function navigateToImage(id) {
  map.eachLayer(function(layer){
    if(layer.options.id === id) {
      let bounds = layer.getBounds();
      map.fitBounds(bounds, {maxZoom: 18});
    }
  });
}

// tbd
function highlightRectangle(e) {
  let resultImage = e.target.querySelector('.result-image');
  let latLng = resultImage.getAttribute("data-id")

  map.eachLayer(function(layer){
    if(layer.options.id === latLng) {    
      layer.setStyle({"color":"#42f5e6"})
      layer.bringToFront()
    }
  });
}

// tbd
function downlightRectangle(e) {
  let resultImage = e.target.querySelector('.result-image');
  let latLng = resultImage.getAttribute("data-id")
  map.eachLayer(function(layer){
    if(layer.options.id === latLng) {
  layer.setStyle({"color":"#dc000e"})
    }
  });
}

// Add images of the search results to the sidebar
function addResultImages(start = 0, end = 20, searcherCountry) {
  
  // Iterate through the LatLngBound coordinates
  let searchResultsRange = displayedSearchResults["3857"].slice(start, end)
  for (let i = 0; i < searchResultsRange.length; i++) {

    // Build the URL to retrieve the correct tile for each LatLngBound from the Google WMS
 
    let x = searchResultsRange[i]["x"];
    let y = searchResultsRange[i]["y"];
    let tileURL = `http://api.search-engine.space/window/coord/${searcherCountry}/3857/${x}/${y}/${sizeOfLastSearch}`;

    // Create and append the result image to the HTML code
    let imageContainer = document.createElement("div");
    imageContainer.classList.add("result-image-container");
    imageContainer.addEventListener("mouseenter", highlightRectangle, false);
    imageContainer.addEventListener("mouseleave", downlightRectangle, false);
    let image = document.createElement("img");
    image.classList.add("result-image");
    image.addEventListener("load", fadeIn);
    image.style.opacity = "0";
    image.src = tileURL;
    image.title = "Eucl. Dist.: " + searchResultsRange[i]['distance'].toFixed(4);
    let latLngPoint = L.CRS.EPSG3857.unproject(L.point(x, y)) 
    image.setAttribute('data-id', `${latLngPoint.lat},${latLngPoint.lng}`);
    image.onclick = function(event) {
      navigateToImage(event.target.getAttribute('data-id'));
    }
    
    let spinnerContainer = document.createElement("div");
    spinnerContainer.classList.add("image-loader-spinner")
    spinnerContainer.innerHTML = '<lottie-player autoplay loop mode="normal" src="https://assets3.lottiefiles.com/packages/lf20_xefn7spz.json" style="width: 70%; margin: 0 auto;"></lottie-player>'
    imageContainer.appendChild(spinnerContainer)
    imageContainer.appendChild(image);
    document.getElementById("sidebar-results-images").appendChild(imageContainer)
  }
}

// tbd
function fadeIn () {
  this.style.transition = "opacity 0.2s";
  this.style.opacity = "1";
}

// tbd
function clearResultsOnMap() {
  map.eachLayer(function (layer) {
    if (layer.options.searchArea === true) {
      layer.remove();
    }
  });
}

// tbd
function clearResultImages () {
   // Delete any existing result images from the sidebar
   let highlightedItems = document.querySelectorAll(".result-image-container");
   for (let j = 0; j < highlightedItems.length; j++) {
     let resultImage = highlightedItems[j]
     resultImage.style.opacity = '0';
     resultImage.addEventListener('transitionend', () => {resultImage.remove();})
   }
}

// snippet from https://stackoverflow.com/questions/31790344/determine-if-a-point-reside-inside-a-leaflet-polygon
function isMarkerInsidePolygon(lat, lng, poly) {
  let polyPoints = poly.getLatLngs()[0];
  let x = lat
  let y = lng
  let inside = false;
  for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
      let xi = polyPoints[i].lat, yi = polyPoints[i].lng;
      let xj = polyPoints[j].lat, yj = polyPoints[j].lng;

      let intersect = ((yi > y) !== (yj > y))
          && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
  }
  return inside;
}

// tbd
function isInSearchAreas(coord) {
  return Object.keys(searchAreas).some((k) => (isMarkerInsidePolygon(coord.lat, coord.lng, searchAreas[k])))
}

// tbd
function refilterSearchResultsByArea() {
  displayedSearchResults["3857"] = searchResults["3857"].filter(r => isInSearchAreas(L.CRS.EPSG3857.unproject(L.point(r["x"], r["y"]))))
}

function isInSearchRadius(coord, phy_min, phy_max, eucld_min, eucld_max, eucld_dist) {

  phy_max = (phy_max == "")? Infinity: phy_max;
  eucld_max = (eucld_max == "")? Infinity: eucld_max;

  let distanceToSearchLatLngPoint = L.latLng(searchLatLngPoint).distanceTo([coord.lat, coord.lng]) / 1000
  let inPhysicalSearchRadius = (distanceToSearchLatLngPoint >= phy_min && distanceToSearchLatLngPoint <= phy_max)
  let inEucleadeanDistanceSearchRadius = (eucld_dist >= eucld_min  && eucld_dist <= eucld_max)
  let inSearchAreas = true;
  if (Object.keys(searchAreas).length > 0) {
    inSearchAreas = Object.keys(searchAreas).some((k) => (isMarkerInsidePolygon(coord.lat, coord.lng, searchAreas[k])))
  }

  return  (inPhysicalSearchRadius && inEucleadeanDistanceSearchRadius && inSearchAreas)
}

function refilterSearchResultsByFilterOptions() {
  console.log("clicked")
  let phy_min = inputPhyDistanceMin.value;
  let phy_max = inputPhyDistanceMax.value
  let eucld_min = inputEuclDistanceMin.value
  let eucld_max = inputEuclDistanceMax.value
  displayedSearchResults["3857"] = searchResults["3857"].filter(r => isInSearchRadius(L.CRS.EPSG3857.unproject(L.point(r["x"], r["y"])), phy_min, phy_max, eucld_min, eucld_max, r["distance"]))
  clearResultImages()
  clearResultsOnMap()
  addResultImages(0, numberOfImagesLoadedLazy, countryOfLastSearch)
  createResultsOnMap(0, resultAmount);
  
}



// tbd
function getCountryByCoordinates(coord) {
  for (const [country, bounds] of Object.entries(boundingInfosCountries)) {
    if (bounds.contains(coord)) {
      return country
    }
  }
  return null
}

document.querySelector('#result-config-sort').addEventListener("change", function() {
  if (this.value === "1") {
    displayedSearchResults["3857"] = searchResults["3857"].slice();
    displayedSearchResults["3857"].sort((a,b) => (a[2] >= b[2]) ? 1 : (a[2] < b[2]) ? -1 : 0)    
    clearResultImages()
    addResultImages(0, numberOfImagesLoadedLazy, countryOfLastSearch)

  } else if (this.value === "2") {
    displayedSearchResults["3857"] = searchResults["3857"].slice();
    displayedSearchResults["3857"].sort((a,b) => (map.distance(L.CRS.EPSG3857.unproject(L.point(a["x"], a["y"])), searchLatLngPoint) >= map.distance(L.CRS.EPSG3857.unproject(L.point(b["x"], b["y"])), searchLatLngPoint)) ? 1 : ((map.distance(L.CRS.EPSG3857.unproject(L.point(a["x"], a["y"])), searchLatLngPoint) < map.distance(L.CRS.EPSG3857.unproject(L.point(b["x"], b["y"])), searchLatLngPoint)) ? -1 : 0))  
    clearResultImages()
    addResultImages(0, numberOfImagesLoadedLazy, countryOfLastSearch)
  }
});

let imageResultsContainer = document.getElementsByClassName("satellite-search__sidebar-indextab-container")[0]
imageResultsContainer.addEventListener('scroll', 
function(e) {
  if (imageResultsContainer.offsetHeight + imageResultsContainer.scrollTop >= imageResultsContainer.scrollHeight) {
    let currentImagesNumber = document.getElementsByClassName("result-image-container").length
    
    addResultImages(currentImagesNumber, currentImagesNumber +  numberOfImagesLoadedLazy, countryOfLastSearch)
  }
})

var PDFslider = document.getElementById('physical-distance-filter-slider');
var EDFslider = document.getElementById('euclidean-distance-filter-slider');

function filterPDFPips(value, type) {
if (value > 1000) {
return value != 1200 ? -1 : 1;
}
else {
  return value % 250 == 0 ? 1 : 0;
}
}

function filterEDFPips(value, type) {
  if (value > 100) {
  return value != 120 ? -1 : 1;
  }
  else {
    return value % 25 == 0 ? 1 : 0;
  }
  }

var inputPhyDistanceMin = document.getElementById("input-phy-distance-min")
var inputPhyDistanceMax = document.getElementById("input-phy-distance-max")

inputPhyDistanceMin.addEventListener('change', function () {
  PDFslider.noUiSlider.set([this.value, null]);
});
inputPhyDistanceMax.addEventListener('change', function () {
  PDFslider.noUiSlider.set([null, this.value != ""? this.value: 1200]);
});

var inputEuclDistanceMin = document.getElementById("input-eucld-distance-min")
var inputEuclDistanceMax = document.getElementById("input-eucld-distance-max")

inputEuclDistanceMin.addEventListener('change', function () {
  EDFslider.noUiSlider.set([this.value, null]);
});
inputEuclDistanceMax.addEventListener('change', function () {
  EDFslider.noUiSlider.set([null, this.value != ""? this.value: 120]);
});

noUiSlider.create(PDFslider, {
    start: [0, 1200],
    connect: true,
    range: {
        'min': 0,
        '80%': [1000, 2000],
        'max': 1200
    },
    pips: {
      mode: 'values',
      values: [0, 250, 500, 750, 1000, 1200],
      density: 4,
      filter: filterPDFPips,
      format: {
        
        to: function (value) {
            var formattedValue = value != 1200 ? value : "max";
            return formattedValue
        },

        from: function (value) {
          var unformattedValue = value != "max" ? value : 1200;
        }
    }
  }
});

noUiSlider.create(EDFslider, {
  start: [0, 120],
  connect: true,
  range: {
      'min': 0,
      '80%': [100, 20],
      'max': 120
  },
  pips: {
    mode: 'values',
    values: [0, 25, 50, 75, 100, 120],
    density: 4,
    filter: filterEDFPips,
    format: {
      
      to: function (value) {
          var formattedValue = value != 120 ? value : "max";
          return formattedValue
      },

      from: function (value) {
        var unformattedValue = value != "max" ? value : 120;
      }
  }
}
});

PDFslider.noUiSlider.on('update', function (values, handle) {

  var value = values[handle];

  if (handle) {
    
    inputPhyDistanceMax.value = value < 1001 ? value: "";
  } else {
    inputPhyDistanceMin.value = value;
  }
});

EDFslider.noUiSlider.on('update', function (values, handle) {

  var value = values[handle];

  if (handle) {
    
    inputEuclDistanceMax.value = value < 101 ? value: "";
  } else {
    inputEuclDistanceMin.value = value;
  }
});

// tbd
function updateSearchImageOverview(lng, lat, tileURL) {

    let lngBox = document.getElementById("lngBox");
    let latBox = document.getElementById("latBox");
    lngBox.innerText = `Lng: ${lng.toFixed(5)}`
    latBox.innerText = `Lat: ${lat.toFixed(5)}`
    let searchImage = document.getElementById("search-image");
    
    searchImage.addEventListener("load", fadeIn);
    searchImage.style.opacity = "0";

    let searchImageOverview = document.getElementById("search-image-overview")
    
    if(searchImageOverview.style.display === 'none') {
      searchImage.src = tileURL;
    }
    else {
    searchImage.addEventListener('transitionend', () => {
      searchImage.src = "";
      searchImage.src = tileURL;
    });
    }
    searchImage.setAttribute('data-id', [lat, lng]);
    searchImage.onclick = function(event) {
      navigateToImage(event.target.getAttribute('data-id'));}

    if(searchImageOverview.style.display === 'none') {
      let searchPlaceholderIntro = document.getElementsByClassName("search-placeholder-intro")[0]
      searchPlaceholderIntro.style.opacity = '0';
      searchPlaceholderIntro.addEventListener('transitionend', () => {
        searchPlaceholderIntro.style.display = 'none'
        searchImageOverview.style.display = "flex";
        searchImageOverview.style.opacity = '1';  });
    }
}

function displayError(message) {
    let errorWindow = document.getElementById("satellite-search__error")
    let errorText = document.getElementById("error-message");
    errorText.innerText = message;
    if (errorWindow.style.display === "none") {
        errorWindow.style.display = 'block'
        window.getComputedStyle(errorWindow).opacity
        errorWindow.style.opacity = '1';
        errorWindow.style.transform = 'translateY(0)';
    }
}

function closeError() {
    let errorWindow = document.getElementById("satellite-search__error")
    if(errorWindow.style.display !== "none") {
        errorWindow.style.opacity = '0';
        errorWindow.style.transform = 'translateY(calc(-3rem - 100%))';
        errorWindow.addEventListener('transitionend', () => errorWindow.style.display = 'none', {once : true});
    }
}


// When a search is carried out by clicking on a point on the map
function onMapClick(e) {
  let currentCountry = getCountryByCoordinates(e.latlng)
  if(searchExecuting || currentCountry == null) {
    return;
  }
  closeAllWindows();
  searchExecuting = true

  let elements = document.getElementsByClassName("indextab");
  if(!(elements[0].classList.contains("active"))){
      elements[1].classList.toggle("active");
      elements[0].classList.toggle("active");
      document.getElementById("indextab__content").classList.toggle("left");
      document.getElementById("indextab__content").classList.remove("right");
      document.getElementsByClassName("satellite-search__sidebar-indextab-container")[0].scrollTop = 0;
  }


  searcherOfLastSearch = searcher;
  countryOfLastSearch = searcherList[searcher].country;
  sizeOfLastSearch = searchSize;
  let point = e.latlng;
  
  // Delete any existing result images from the sidebar
  clearResultImages()

  // Remove any previous rectangles from the map
  clearResultsOnMap()

  fetch(`https://searchservice.dev.search-engine.space/nearest_feature/${point.lng}/${point.lat}/${searcher}/${sizeOfLastSearch}?crs=4326`, {
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
      let precomputedIndex = data["precomputed_index"];

      let [bounds]  = getBoundToLatLngFetch(lat, lng)
      L.polygon(bounds,
            {color: "#dc000e", fill: false, weight: 4, searchArea: true, id: `${lat},${lng}`}).addTo(map);

      searchLatLngPoint = [lat, lng]
      // Display the search area in the sidebar
      let tileURL = `http://api.search-engine.space/window/coord/${countryOfLastSearch}/3857/${x}/${y}/${sizeOfLastSearch}`

      // Create and append the result image to the HTML code
      updateSearchImageOverview(lng, lat, tileURL)
      
      let loadingOverlaySidebar = document.getElementById("loadingOverlaySidebar")
      loadingOverlaySidebar.style.display = "block"
      loadingOverlaySidebar.style.opacity = "1"
      fetch(`https://searchservice.dev.search-engine.space/search/${searcher}/?precomputed_index=${precomputedIndex}&size=${sizeOfLastSearch}&k=${resultAmount}`, {
        method: "get",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
        .then(response => response.json())
        .then(data => {
          searchResults = data;
          displayedSearchResults["3857"] = data["3857"].slice();
          indexOfLastSearch = precomputedIndex;
          /* if (searchAreas.length > 0) {
            refilterSearchResultsByArea()
          } */
          createResultsOnMap(0, resultAmount);
          addResultImages(0, numberOfImagesLoadedLazy, countryOfLastSearch);
          
          loadingOverlaySidebar.style.opacity = "0"
          loadingOverlaySidebar.addEventListener('transitionend', () => loadingOverlaySidebar.style.display = "none");
          searchExecuting = false;
        })
    })
    .catch(error => {
        searchExecuting = false;
        message = "Sorry! There was an error with the search. Please try again or reload the site."
        displayError(message);
    })
}
map.on('click', onMapClick);


let categoryList = [[56.15922, 9.95019],
 [56.55130547226134, 8.304720064123202],
 [56.79898628296046, 8.79912538895505],
 [56.13500, 9.00473],
 [56.51210, 9.32573],
 [57.196805654585326, 9.475864592448291],
 [56.55864, 8.29229],
 [55.70020, 9.19981],
 [57.17927355086787, 9.551730786716492],
 [57.03359770725205, 9.972820041457222]
 ];

// tbd
function searchCategory(categoryNumber){
  let coord = categoryList[categoryNumber];
  let latlng = L.latLng(coord[0], coord[1]);
  let obj = {latlng: latlng};
  let bounds = latlng.toBounds(39);
  map.fitBounds(bounds, {maxZoom: 18});
  let searcherSelection = document.getElementById("searcher-config");
  searcherSelection.value = "vectors_denmark";
  let sizeSelection = document.getElementById("searcher-size-config");
  for(let i=0; i<searcherList["vectors_denmark"].sizes.length; i++){
    if(searcherList["vectors_denmark"].sizes[i] === 200){
      sizeSelection.value = i.toString();
    }
  }
  switchSearcher(searcherSelection);
  onMapClick(obj);
}




