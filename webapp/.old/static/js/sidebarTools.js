// Request the browsers location and navigate the user to the position
function displayUserLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(showPosition);
  } else {
    console.log("Geolocation is not supported by this browser.");
  }
}

// Take the browsers coordinates as input and navigate to the current position
function showPosition(position) {
  let lng = position.coords.longitude;
  let lat = position.coords.latitude;
  map.eachLayer(function (layer) {
    if (layer.options.searchArea === true) {
      layer.remove();
    }
  });
  map.flyTo(new L.LatLng(lat, lng), 17)
}


// tbd
function displayCoordinateSelection() {
  let coord_input_el = document.getElementById("satellite-search__coord_input")
  if (coord_input_el.style.display !== "none") {
    coord_input_el.style.opacity = '0';
    coord_input_el.style.transform = 'translateY(calc(-3rem - 100%))';
    coord_input_el.addEventListener('transitionend', () => coord_input_el.style.display = 'none', {once : true});
  }
  else{
    coord_input_el.style.display = 'block'
    window.getComputedStyle(coord_input_el).opacity
    coord_input_el.style.opacity = '1';
    coord_input_el.style.transform = 'translateY(0)';
  }
}

// tbd
function jumpToCoordinateFromInput() {
  let lng = document.getElementById('input_lng').value;
  let lat = document.getElementById('input_lat').value;

  if (lng && lat) {

    map.eachLayer(function (layer) {
      if (layer.options.searchArea === true) {
        layer.remove();
      }
    });

    map.flyTo(new L.LatLng(lat, lng), 17);
    L.marker([lat, lng], {searchArea: true}).addTo(map);
  }
}

// tbd
  function displaySearchSharing() {
    let share_output_el = document.getElementById("satellite-search__share_output")
    if (share_output_el.style.display !== "none") {
      share_output_el.style.opacity = '0';
      share_output_el.style.transform = 'translateY(calc(-3rem - 100%))';
      share_output_el.addEventListener('transitionend', () => share_output_el.style.display = 'none', {once: true});
    } else {
      let currentLocation = window.location.origin;
      let inputShareElement = document.getElementById("input-share");

      let lat = searchLatLngPoint[0]
      let lng = searchLatLngPoint[1]
      if (lat != null && lng != null) {
        inputShareElement.value = currentLocation + `?searcher=${searcherOfLastSearch}&lat=${lat}&lng=${lng}&size=${sizeOfLastSearch}`;
      }

      share_output_el.style.display = 'block'
      window.getComputedStyle(share_output_el).opacity
      share_output_el.style.opacity = '1';
      share_output_el.style.transform = 'translateY(0)';
    }
  }

// tbd
  function copyLinkToClipboard() {
    let textBox = document.getElementById("input-share");
    textBox.select();
    document.execCommand("copy");
  }

// tbd
  function getParam(param) {
    return new URLSearchParams(window.location.search).get(param);
  }

  if (getParam("lng") != null && getParam("lat") != null && getParam("searcher") != null && getParam("size") != null) {
    let lng = getParam("lng");
    let lat = getParam("lat");
    let searcher = getParam("searcher");
    let size = getParam("size");

    map.eachLayer(function (layer) {
      if (layer.options.searchArea === true) {
        layer.remove();
      }
    });

    map.flyTo(new L.LatLng(lat, lng), 17)
    map.once("zoomend", function () {
      fetch(`https://searchservice.dev.search-engine.space/nearest_feature/${lng}/${lat}/${searcher}/${size}?crs=4326`, {
        method: "get",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
          .then(response => response.json())
          .then(data => {

            let [lng, lat] = data["4326"]

            let [bounds, boundsInner] = getBoundToLatLngFetch(lat, lng)
            L.polygon(bounds,
                {color: "#dc000e", fill: false, weight: 4, searchArea: true}).addTo(map);

            let searcherSelection = document.getElementById("searcher-config");
            searcherSelection.value = searcher;
            switchSearcher(searcherSelection);

            let sizeSelection = document.getElementById("searcher-size-config");
            for(let i=0; i<searcherList[searcher].sizes.length; i++){
              if(searcherList[searcher].sizes[i] === size){
                sizeSelection.value = i.toString();
              }
            }
            switchSize(sizeSelection);

          })
      .catch(error => {
        searchExecuting = false;
        message = "Sorry! There was an error. Please try again or reload the site."
        displayError(message);
      })
    });
  }


  function displayCountrySelection() {
    let selection_window = document.getElementById("satellite-search__country_selection")
    if (selection_window.style.display !== "none") {
      selection_window.style.opacity = '0';
      selection_window.style.transform = 'translateY(calc(-3rem - 100%))';
      selection_window.addEventListener('transitionend', () => selection_window.style.display = 'none', {once: true});
    } else {
      selection_window.style.display = 'block'
      window.getComputedStyle(selection_window).opacity
      selection_window.style.opacity = '1';
      selection_window.style.transform = 'translateY(0)';
    }
  }

  let countryCoordinates = [
    [[51.1642292, 10.6541194], 6],
    [[56.0396761, 11.2155848], 7],
    [[-28.6792625, 24.6727135], 6]
  ];

  function switchToCountry(id) {
    map.setView(countryCoordinates[id][0], countryCoordinates[id][1]);
    displayCountrySelection()
  }


  let searchFeedback = [];

// tbd
  function displaySearchFeedback() {
    let coord_input_el = document.getElementById("satellite-search__feedback")
    if (coord_input_el.style.display !== "none") {
      coord_input_el.style.opacity = '0';
      coord_input_el.style.transform = 'translateY(calc(-3rem - 100%))';
      coord_input_el.addEventListener('transitionend', () => coord_input_el.style.display = 'none', {once: true});
      searchFeedback = [];
      document.getElementById("satellite-search__feedback-results").innerHTML = '';
    } else {
      coord_input_el.style.display = 'block'
      window.getComputedStyle(coord_input_el).opacity
      coord_input_el.style.opacity = '1';
      coord_input_el.style.transform = 'translateY(0)';
      copyResultsToFeedbackContainer();
    }
  }

  function displayTuneContainer() {
    let tune_overlay_el = document.getElementById("tune_overlay")
    if (tune_overlay_el.style.display !== "none") {
      tune_overlay_el.style.opacity = '0';
      tune_overlay_el.style.transform = 'translateY(calc(-2.25rem)';
      tune_overlay_el.addEventListener('transitionend', () => tune_overlay_el.style.display = 'none', {once: true});

    } else {
      tune_overlay_el.style.display = 'block'
      window.getComputedStyle(tune_overlay_el).opacity
      tune_overlay_el.style.opacity = '1';
      tune_overlay_el.style.transform = 'translateY(0)';
    
    }
  }
  
  function displayFilterContainer() {
    let filter_overlay_el = document.getElementById("filter_overlay")
    if (filter_overlay_el.style.display !== "none") {
      filter_overlay_el.style.opacity = '0';
      filter_overlay_el.style.transform = 'translateY(calc(-2.25rem)';
      filter_overlay_el.addEventListener('transitionend', () => filter_overlay_el.style.display = 'none', {once: true});

    } else {
      filter_overlay_el.style.display = 'block'
      window.getComputedStyle(filter_overlay_el).opacity
      filter_overlay_el.style.opacity = '1';
      filter_overlay_el.style.transform = 'translateY(0)';
    
    }
  }
// tbd
  function copyResultsToFeedbackContainer() {
    let country = countryOfLastSearch;
    let feedbackContainer = document.getElementById("satellite-search__feedback-results");
    let searchResultsRange = document.getElementsByClassName("result-image-container").length
    for(let i=0; i<searchResultsRange; i++){
      let x = displayedSearchResults["3857"][i]["x"]
      let y = displayedSearchResults["3857"][i]["y"]
      let index = displayedSearchResults["3857"][i]["index"]
      let tileURL = `http://api.search-engine.space/window/coord/${country}/3857/${x}/${y}/${sizeOfLastSearch}`

      let imageContainer = document.createElement("div");
      imageContainer.classList.add("feedback");

      let image = document.createElement("img");
      image.classList.add("feedback-image");
      image.src = tileURL;
      imageContainer.appendChild(image);

      let ratingContainer = document.createElement("div");
      ratingContainer.classList.add("satellite-search__feedback-rating");
      ratingContainer.innerHTML = '<span class="material-symbols-outlined thumbs-up" onclick="markResult(this, '+index+')">thumb_up</span>';
      imageContainer.appendChild(ratingContainer);
      feedbackContainer.appendChild(imageContainer);
    }
  }

  function markResult(elem, index){
    let indexInt = parseInt(index);
    if(searchFeedback.includes(indexInt)){
      let indexInArray = searchFeedback.indexOf(indexInt);
      searchFeedback.splice(indexInArray, 1);
      elem.style.backgroundColor = '';
      elem.style.color = '#1b1b1b';
      elem.style.border = '2px solid #424242';
    } else {
      searchFeedback.push(parseInt(index));
      elem.style.backgroundColor = 'rgb(36, 161, 67)';
      elem.style.color = 'white';
      elem.style.border = '2px solid rgb(36, 161, 67)';
    }
  }

  function addSearchAreaTag(id) {

    let areaTags = document.getElementById("sidebar-results__area-tags")
    let tagNumbers = Array.from(document.getElementsByClassName("area-tag")).map(tag => tag.getAttribute("data-n")).sort(function(a, b){return b-a})
    let highestTagNumber = tagNumbers[0];
    let tagNumber = tagNumbers.length > 0? Number(highestTagNumber) + 1: 1;
    let newTag = document.createElement("div");
    newTag.classList.add("area-tag");
    newTag.setAttribute('data-id', id);
    newTag.setAttribute('data-n', tagNumber);
    newTag.innerHTML = `${tagNumber}`;
    let tagDelete = document.createElement("span");
    tagDelete.classList.add('area-tag-delete');
    tagDelete.innerHTML = "delete";
    tagDelete.setAttribute("area-tag-id", id);
    newTag.appendChild(tagDelete);
    areaTags.appendChild(newTag);
    tagDelete.addEventListener("click", deleteAreaTagWithArea);
  }

  function deleteAreaTagWithArea(e) {
    let id = e.currentTarget.getAttribute("area-tag-id")
    let tagToDelete = document.querySelector(`[data-id="${id}"]`);
    tagToDelete.remove();
    map.eachLayer(function (layer) {
      if (layer.options.id === id) {
        layer.remove();
      }
    });
    delete searchAreas[id]
  }

  function submitFeedback(){
    let currentSearchFeedback = searchFeedback;
    if(searchExecuting) {
      return;
    }
    searchExecuting = true;

    let elements = document.getElementsByClassName("indextab");
    if(!(elements[0].classList.contains("active"))){
        elements[1].classList.toggle("active");
        elements[0].classList.toggle("active");
        document.getElementById("indextab__content").classList.toggle("left");
        document.getElementById("indextab__content").classList.remove("right");
        document.getElementsByClassName("satellite-search__sidebar-indextab-container")[0].scrollTop = 0;
    }

    if(currentSearchFeedback.length > 0){
      // Delete any existing result images from the sidebar
      clearResultImages()
      // Remove any previous rectangles from the map
      clearResultsOnMap()

      let loadingOverlaySidebar = document.getElementById("loadingOverlaySidebar")
      loadingOverlaySidebar.style.display = "block"
      loadingOverlaySidebar.style.opacity = "1"

      let searchURL = 'https://searchservice.dev.search-engine.space/search_multiple/' + searcherOfLastSearch + '/?size=' + sizeOfLastSearch + '&precomputed_indices=' + indexOfLastSearch + '&k=' + resultAmount;
      for(let i=0; i<currentSearchFeedback.length; i++){
        searchURL = searchURL + '&precomputed_indices=' + currentSearchFeedback[i];
      }
      searchFeedback = [];
      closeAllWindows();
      fetch(searchURL, {
        method: "get",
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        }
      })
      .then(response => response.json())
      .then(data => {
        searchResults = data;
        displayedSearchResults = data;
        /* if (searchAreas.length > 0) {
          refilterSearchResultsByArea()
        } */
        createResultsOnMap(0, resultAmount);
        addResultImages(0, numberOfImagesLoadedLazy, countryOfLastSearch);
        loadingOverlaySidebar.style.opacity = "0"
        loadingOverlaySidebar.addEventListener('transitionend', () => loadingOverlaySidebar.style.display = "none");
        searchExecuting = false;
      })
      .catch(error => {
        searchExecuting = false;
        message = "Sorry! There was an error. Please try again or reload the site."
        displayError(message);
      })
    }
  }
