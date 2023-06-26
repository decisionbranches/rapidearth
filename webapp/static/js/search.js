// Required variables: 1) gridSelected (from grid)
var numberOfImagesLoadedLazy = 20;
var searchResults;
var rare_lookup = [];
var nonrare_lookup = [];
var maxImagesOnMap = 30_000;
const COOLDOWN_TIME = 2000; // 2 seconds
var isCoolDown = false;

var status_query_time = document.getElementById('query_time');
var status_returned_objects = document.getElementById('returned_objects');

var color_rare_train = '#dc000e';
var color_nonrare_train = "#15369b";
var color_rare_test = "#FFFF00";
var color_truepositive = "#00C903";
var color_falsepositive = "#000000";

  async function fetchAPI_Searchservice(rare_idxs,nonrare_idxs,searcher,tileLayer,n_nonrare_samples) {
    let url = `%ENDPOINT_PROTOCOL://%ENDPOINT_SEARCHSERVICE/search/${tileLayer}/${searcher}/?n_nonrare_samples=${n_nonrare_samples}&nresults=${maxImagesOnMap}`
    const response = await fetch(url, {
      method: "post",
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({idxs_rare: rare_idxs, idxs_nonrare: nonrare_idxs})
    })
    const json = await response.json();
    return json;
  }

  async function fetchAPI_Searchservice_GetSearchResults(search_id) {
    let url = `%ENDPOINT_PROTOCOL://%ENDPOINT_SEARCHSERVICE/get_search_results/${search_id}`
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

  async function fetchAPI_Searchservice_GetSearchers() {
    let url = `%ENDPOINT_PROTOCOL://%ENDPOINT_SEARCHSERVICE/get_available_searchers`
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

async function fetchAPI_DataService_GetLatLangBox(row_off,col_off,searcher,size) {
    let url = `%ENDPOINT_PROTOCOL://%ENDPOINT_DATA/coord/box/${searcher}/${row_off}/${col_off}/${size}`
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

async function fetchAPI_Searchservice_GetBoxesFromArea(box,size,tileLayer) {
    let ne = box.bounds["_northEast"];
    let sw = box.bounds["_southWest"];
    let url = `%ENDPOINT_PROTOCOL://%ENDPOINT_SEARCHSERVICE/get_boxes_from_area/${tileLayer}/${ne.lat}/${ne.lng}/${sw.lat}/${sw.lng}/${size}`//`api/get_box?lng=${point.lng}&lat=${point.lat}&size=${size}&layer=${layer}&crs=4326`
    console.log(url)
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

async function onMapClick(e,rare=true) {
    if (map.getZoom() > 14) {
    
        let point = e.latlng;
        console.log(point)
        let data = await fetchAPI_Searchservice_GetBox(point,size,tileLayer)
        let coords = data["rectangle"];
        let idx = data["idx"];
        addBoxOnMap(coords,idx,rare);
    }
    
  }


function addBoxOnMap(coords,idx,rare) {
    if (rare == true) {
        color = color_rare_train
    } else {
        color = color_nonrare_train
    }

    // Check if polygon for this idx is already existing
    map.eachLayer(function(layer){
      // Find the search result with the correct ID
        if (layer.options.idx == idx && layer.options.searchObject == true) {
          layer.remove()
          if (rare_lookup.indexOf(idx) != -1){
            let i = rare_lookup.indexOf(idx);
            rare_lookup.splice(i,1);
          }
          if (nonrare_lookup.indexOf(idx) != -1){
            let i = nonrare_lookup.indexOf(idx);
            nonrare_lookup.splice(i,1);
          }
          idx = -1;
        }
      }
    )

    if (idx != -1) {
        // Adding polygon based on this bounds to the leaflet map layer
        let searchCell = L.polygon(coords, { color: color, fill: false, weight: 4,
                                searchObject: true,rare:rare, idx:idx })
        searchCell.addTo(map);


        if (rare == true) {
          rare_lookup.push(idx)
        }
        else {
          nonrare_lookup.push(idx)
        }
    }
  }

async function createGridFromArea(e) {
  let data = await fetchAPI_Searchservice_GetBoxesFromArea(e,size,tileLayer)

  // Reading in response coordinates
  let coords_list = data["rectangles"];
  let idxs_list = data["idxs"];

  for(let j = 0; j < idxs_list.length; j++) {
    let coords = coords_list[j]
    let idx = idxs_list[j]

    let box = [[coords[2],coords[3]],[coords[2],coords[1]],[coords[0],coords[1]],[coords[0],coords[3]]]
    addBoxOnMap(box,idx,false);
  }


}


async function search() {
    let searcher = document.getElementById("selectSearcher").value.split(",")[1];
    let nonrare_range = document.getElementById("nonrare-range");
    let n_nonrare_samples = nonrare_range.value;

    if (isCoolDown) {
      return;
    }
    isCoolDown = true;
    
    if(rare_lookup.length == 0 || (searcher.toLowerCase().indexOf("_nn") === -1 ) && (nonrare_lookup.length == 0)) {
      alert("Select data before starting the search! You can find information on how to label data by clicking on the Info button on top!")
    }
    else{
      clearResultImages()
      clearResultsOnMap()
      
      let res = await fetchAPI_Searchservice(rare_lookup,nonrare_lookup,searcher,tileLayer,n_nonrare_samples);
      let queryTime = res["time"]
      let n_returned = res["n_results"]
      status_query_time.innerHTML = queryTime.toFixed(3).toString()
      status_returned_objects.innerHTML = n_returned.toString()

      firstSearchResults = res["results"]  
      addResultsOnMap(firstSearchResults,0,maxImagesOnMap);//searchResults.length);
      addResultImages(firstSearchResults,0,numberOfImagesLoadedLazy,tileLayer);

      search_id = res["search_id"]
      res = await fetchAPI_Searchservice_GetSearchResults(search_id)
      searchResults = res["results"]
      addResultsOnMap(searchResults,0,maxImagesOnMap-firstSearchResults.length);//searchResults.length);
      addResultImages(searchResults,0,numberOfImagesLoadedLazy,tileLayer);
    }

    setTimeout(() => {
      isCoolDown = false;
    }, COOLDOWN_TIME);
}


// Add images of the search results to the sidebar
// @param int start: The starting index of the results which are to be added
// @param int end: The final index of the results which are to be added
// @param String searcherCountry: The country of the searcher from the search
async function addResultImages(searchResults,start = 0, end = 20, tileLayer) {
  
  // Iterate through the LatLngBound coordinates
  let searchResultsRange = searchResults.slice(start, end)
  for (let i = 0; i < searchResultsRange.length; i++) {
    let res = searchResultsRange[i];//await fetchAPI_GetMapping(searchResults[i],layer)
    
    // Build the URL to receive the image of the search result
    let idx = res[0];
    let col_off = res[1];
    let row_off = res[2];
    let size = res[3];
    let country = tileLayer.split("_")[0];
    let tileURL = `%ENDPOINT_PROTOCOL://%ENDPOINT_DATA/window/file/rowcol/${country}/${row_off}/${col_off}/${size}`;//`http://api.search-engine.space/window/${searcherCountry}/${row_off}/${col_off}/${size}`;

    console.log(tileURL)

    // Create an image element
    let image = document.createElement('img');
    image.classList.add("result-image");
    image.addEventListener("load", fadeIn);
    image.style.opacity = "0";
    image.src = tileURL;
    image.title = idx;
    image.setAttribute('data-id', idx);
    // Carry out the navigateToImage function when the user clicks on the result image
    image.onclick = function(event) {
      navigateToImage(event.target.getAttribute('data-id'));
    }

    // Determine which column to add the image to
    let containerElement;
    if (i % 2 === 0) {
      containerElement = document.getElementById('image-container-1');
    } else {
      containerElement = document.getElementById('image-container-2');
    }

    // Create a container for the spinning wheel loading animation
    let spinnerContainer = document.createElement("div");
    spinnerContainer.classList.add("image-loader-spinner")
    spinnerContainer.innerHTML = '<lottie-player autoplay loop mode="normal" src="https://assets3.lottiefiles.com/packages/lf20_xefn7spz.json" style="width: 70%; margin: 0 auto;"></lottie-player>'

    // Append the image to the appropriate container
    containerElement.appendChild(spinnerContainer);
    containerElement.appendChild(image);

  }

  // Adding event listener for lazy loading new search results into container, ony if the user is at the bottom of the container new results are appended
  let imageResultsContainer = document.getElementById("satellite-search__sidebar-indextab-container")
  imageResultsContainer.addEventListener('scroll', scrollReloadImages)

}

function scrollReloadImages(e) {
  let imageResultsContainer = document.getElementById("satellite-search__sidebar-indextab-container")
  // Check if bottom is reached
  if (imageResultsContainer.offsetHeight + imageResultsContainer.scrollTop >= imageResultsContainer.scrollHeight) {
    let currentImagesNumber = document.querySelectorAll('.image-grid img').length;
    // Append new images
    addResultImages(searchResults,currentImagesNumber, currentImagesNumber +  numberOfImagesLoadedLazy, tileLayer)//countryOfLastSearch)
  }
}

// Create the search results on the map
// @param int start: The starting index of the results which are to be displayed
// @param int end: The last index of the results which are to be displayed
function addResultsOnMap(searchResults,start, end) {
    // Iterate through the LatLngBound coordinates
    let searchResultsRange = searchResults.slice(start, end)
    for (let i = 0; i < searchResultsRange.length; i++) {
      //let res = await fetchAPI_GetMapping(searchResults[i],layer)
      let color = color_rare_test
      let order = "back";
      
      let res = searchResults[i];
      let idx = res[0];
      let nw_long = res[4];
      let nw_lat = res[5];
      let se_long = res[6];
      let se_lat = res[7];
      
      if (rare_lookup.includes(idx)) {
        color = color_truepositive;
        order = "front";

      }
      if (nonrare_lookup.includes(idx)) {
        color = color_falsepositive;
        order = "front";
      }
      // Build the URL to receive the image of the search result
      // let searcher = document.getElementById("selectSearcher").value;
      //let box = await fetchAPI_DataService_GetLatLangBox(row_off,col_off,searcher,size)
      
      //bottom_right,bottom_left,top_left,top_right
      let bounds = [[se_long,se_lat],[se_long,nw_lat],[nw_long,nw_lat],[nw_long,se_lat]]
      //console.log(bounds)
      // Create a red rectangle for a result
      let rect = L.polygon(bounds,{color: color, fill: false, weight: 4,result:true,idx:idx}).addTo(map);;
      
      if (order === "front") {
        rect.bringToFront();
      }
      else {
        rect.bringToBack();
      }

  }
}



function initializeExamples(event) {
  clearAll()
  fetch(event.target.getAttribute("cfg"))
    .then(response => response.json())
    .then(data => {
      parseConfig(data);
  })
  .catch(error => {
    console.error('Error:', error);
  });
  map.setView([event.target.getAttribute('lat'),event.target.getAttribute('lng')],17);
}

function addExamples(){
  //Define examples
  
  let examples = {"Ships": {"lat":55.715994527514596,"lng":12.587800147353583,"img":"static/img/ships.PNG","cfg":"static/json/ships.json"}, 
      "Soccerfield":{"lat":56.459022382314450,"lng":9.389828498283578,"img":"static/img/soccerfields.PNG","cfg":"static/json/soccerfields.json"},
      "Solar": {"lat":56.09375465476792,"lng":8.28465629930186,"img":"static/img/solar.PNG","cfg":"static/json/solar.json"},
    "Sandbank":{"lat":55.37886628656972,"lng":10.332287764487221,"img":"static/img/golf_sandbanks.PNG","cfg":"static/json/sandbank.json"},
    "Foiltunnel":{"lat":56.306943203109775,"lng": 9.691913479233035,"img":"static/img/foiltunnel.PNG","cfg":"static/json/foiltunnel.json"}}

  let i = 0;
  for (const [key, obj] of Object.entries(examples)) {
      // Create an image element
      let image = document.createElement('img');
      image.classList.add("result-image");
      image.src = obj.img;
      image.title = key;
      image.setAttribute('lat',obj.lat);
      image.setAttribute("lng",obj.lng);
      image.setAttribute("cfg",obj.cfg);
      
      // Carry out the navigateToImage function when the user clicks on the result image
      image.onclick = function(event) {
        initializeExamples(event)
      }
    
      // Determine which column to add the image to
      let containerElement;
      if (i % 2 === 0) {
        containerElement = document.getElementById('image-container-1');
      } else {
        containerElement = document.getElementById('image-container-2');
      }
      i++;

      // Create a heading element
      let headingElement = document.createElement('h6');
      headingElement.textContent = key;


      // Append the image to the appropriate container
      containerElement.appendChild(headingElement);
      containerElement.appendChild(image);
  }
    
    
  

}

function exportSearch() {
  console.log("Export")
  let rare_bounds = [];
  let nonrare_bounds = [];
  let searcher = document.getElementById("selectSearcher").value.split(",")[1];
  let nonrare_range = document.getElementById("nonrare-range");

  map.eachLayer(function(layer){
      if (layer.options.searchObject === true) {
        bounds = layer.getLatLngs();
        if (layer.options.rare == true) {
          rare_bounds.push(bounds);
        }
        else{
          nonrare_bounds.push(bounds);
        }
      }
    }
  )

  let json = JSON.stringify({"rare_idxs":rare_lookup,"nonrare_idxs":nonrare_lookup,"rare_bounds":rare_bounds,"nonrare_bounds":nonrare_bounds,
                    "tileLayer":tileLayer,"size":size,"searcher":searcher,"nonrare_samples":nonrare_range.value});
  let blob = new Blob([json], { type: "application/json" });
  let url = URL.createObjectURL(blob);

  let a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = 'search.json';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function importSearch() {
  console.log("Import")
  let fileInput = document.getElementById("input-search-config");
  let parent = fileInput.parentNode;
  parent.removeChild(fileInput);
  fileInput = document.createElement("input");
  fileInput.setAttribute("type", "file");
  fileInput.setAttribute("id", "input-search-config");
  fileInput.setAttribute("style","display:none");
  parent.appendChild(fileInput);

  
  fileInput.click();
  fileInput.addEventListener("change", function() {
    let file = fileInput.files[0];
    if (file) {
      let reader = new FileReader();
      reader.readAsText(file);
      reader.onload = function() {
          let cfg = JSON.parse(reader.result);
          parseConfig(cfg);
      }
    }
  });
}

function parseConfig(cfg) {
    // if ("tileLayer" in cfg) {
    //   tileLayer = cfg["tileLayer"]
    // }
    if ("size" in cfg) {
      size = cfg["size"]
    }

    if ("rare_bounds" in cfg){
      for (let i = 0; i < cfg["rare_bounds"].length; i++){
        addBoxOnMap(cfg["rare_bounds"][i],cfg["rare_idxs"][i],true)
      }
    }
    if ("nonrare_bounds" in cfg){
      for (let i = 0; i < cfg["nonrare_bounds"].length; i++){
        addBoxOnMap(cfg["nonrare_bounds"][i],cfg["nonrare_idxs"][i],false)
      }
    }
}

// Navigate the view of the map to the search result which is clicked on in the sidebar
// @param id: The unique ID of the search result
function navigateToImage(idx) {
  // Iterate over the layers of the map
  idx = parseInt(idx)
  map.eachLayer(function(layer){
    // Find the search result with the correct ID
      if(layer.options.idx === idx) {
          let bounds = layer.getBounds();
          // Adjust the map view
          map.fitBounds(bounds, {maxZoom: 18});
      }
  });
}


// Fade in a HTML element
function fadeIn () {
  this.style.transition = "opacity 0.2s";
  this.style.opacity = "1";
}

// Remove all search results from the map
function clearResultsOnMap() {
  map.eachLayer(function (layer) {
    if (layer.options.result == true) {
      layer.remove();
    }
  });
}

// Remove all search result images from the sidebar
function clearResultImages () {
  let imageContainer1 = document.getElementById('image-container-1');
  let imageContainer2 = document.getElementById('image-container-2');
  
  // Remove all child elements (images) from the first container
  while (imageContainer1.firstChild) {
    imageContainer1.removeChild(imageContainer1.firstChild);
  }
  
  // Remove all child elements (images) from the second container
  while (imageContainer2.firstChild) {
    imageContainer2.removeChild(imageContainer2.firstChild);
  }

  let sidebar_container = document.getElementById('satellite-search__sidebar-indextab-container');
  sidebar_container.removeEventListener("scroll",scrollReloadImages)
}

function clearAll(){
  clearResultsOnMap();
  clearResultImages();

  status_query_time.innerHTML = "-"
  status_returned_objects.innerHTML = "-"

  let nonrare_slider = document.getElementById("nonrare-range");
  let nonrare_value = document.getElementById("nonrare-range-value");
  nonrare_slider.value = nonrare_slider.max
  nonrare_value.innerHTML = nonrare_slider.max
  
  map.eachLayer(function (layer) {
    if (layer.options.searchObject === true) {
      layer.remove();
    }
  });
  rare_lookup = [];
  nonrare_lookup = [];

  addExamples()
}

function showInfo() {
  document.getElementById("infobox").style.display = "block";
}

function hideInfo() {
  document.getElementById("infobox").style.display = "none";
}

async function setSearchers() {
  //Set available searchers
  let avl_searchers = await fetchAPI_Searchservice_GetSearchers();
  let select = document.getElementById('selectSearcher');
  let nonrare_range = document.getElementById("nonrare-range");
  let nonrare_range_value = document.getElementById("nonrare-range-value");
  let def = true;
  for(let layer in avl_searchers) {
    let searchers = avl_searchers[layer]["searchers"];
    let cfg = avl_searchers[layer]["layer_cfg"];
    let layer_display_name = avl_searchers[layer]["layer_display_name"];
    let max_nonrare_samples = avl_searchers[layer]["max_nonrare_samples"];
    let opt = document.createElement('option');
    opt.value = "";
    opt.innerHTML = `----- Layer: ${layer_display_name} ------`
    select.appendChild(opt);
    for(let j = 0; j < searchers.length; j++) {
        let searcher_display_name = searchers[j][0];
        let searcher_id = searchers[j][1];
        let opt = document.createElement('option');
        opt.value = [layer,searcher_id,cfg["patch_size"],max_nonrare_samples];
        opt.innerHTML = searcher_display_name;
        select.appendChild(opt);
        if(def == true){
          opt.selected = true;
          tileLayer = layer; // changes global variable tileLayer to default value
          size = cfg["patch_size"]
          def = false;
          nonrare_range.setAttribute("max",max_nonrare_samples);
          nonrare_range.setAttribute("value",max_nonrare_samples)
          nonrare_range_value.innerHTML = max_nonrare_samples;
        }
    }
  }
  select.addEventListener("change", function() {
    let val = document.getElementById("selectSearcher").value.split(",")
    let nonrare_range = document.getElementById("nonrare-range");
    let nonrare_range_value = document.getElementById("nonrare-range-value");
    if(val == ""){
      alert("No valid searcher!")

    }
    else{
      console.log(val[0])
      tileLayer = val[0];
      console.log(val[2])
      size = val[2]
      console.log(val[3])
      nonrare_range.max = val[3];
      nonrare_range.value = val[3];
      nonrare_range_value.innerHTML = val[3];
    }
  });
}

setSearchers()
addExamples()


var toggle = document.getElementById('toggleswitch');

// Left click
map.on('click', onMapClick);

// Right click
map.on('contextmenu', (e) => {
    onMapClick(e,false)
});

map.on('mousemove', throttleCreateGrid);
map.off('areaselected', (e) => {
  createGridFromArea(e); // lon, lat, lon, lat
});
map.selectArea.setValidate();
map.selectArea.disable();

toggle.addEventListener('change',function(){
    if(this.checked) {
      
      // Left click
      map.off('click');

      // Right click
      map.off('contextmenu');

      map.off('mousemove');

      //Remove last rectangle
      map.eachLayer(function (layer) {
        if (layer.options.selectionRectangle === true) {
          layer.remove();
        }
      });

      map.selectArea.enable();
      map.on('areaselected', (e) => {
        createGridFromArea(e); // lon, lat, lon, lat
      });



    } else {
      
      // Left click
      map.on('click', onMapClick);

      // Right click
      map.on('contextmenu', (e) => {
          onMapClick(e,false)
      });

      map.on('mousemove', throttleCreateGrid);
      map.off('areaselected');
      map.selectArea.setValidate();
      map.selectArea.disable();
    }
});

// Dynamic output for range slider of nonrare values
let slider = document.getElementById("nonrare-range");
let sliderValue = document.getElementById("nonrare-range-value");
slider.oninput = function() {
  sliderValue.innerText = slider.value;
}

showInfo();