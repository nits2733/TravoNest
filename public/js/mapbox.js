/* eslint-disable */

export const displayMap = (locations) => {
  // Mapbox access token for authentication
  mapboxgl.accessToken =
    'pk.eyJ1Ijoibml0czI3MzMiLCJhIjoiY203ZXQ5aTU5MGJmZTJrc2N3bjNtejEzZSJ9.GhIKTA0shljcsdakj9cXiQ';

  // Initialize the map
  var map = new mapboxgl.Map({
    container: 'map', // ID of the map container in HTML
    style: 'mapbox://styles/nits2733/cm7f017u000hi01r75dgg6to2', // Custom map style
    scrollZoom: false, // Disable scroll zoom
    // center: [-118.113491, 34.111745], // Default center (commented out as it's dynamic)
    // zoom: 5, // Default zoom level (commented out as it's dynamic)
    // interactive: false // Disable map interactions (commented out)
  });

  // Create a bounding box to fit all locations on the map
  const bounds = new mapboxgl.LngLatBounds();

  // Loop through each location and add markers and popups
  locations.forEach((loc) => {
    // Create a custom marker element
    const el = document.createElement('div');
    el.className = 'marker'; // Assign a class for styling (CSS required)

    // Add marker to the map at the specified coordinates
    new mapboxgl.Marker({
      element: el, // Use custom marker element
      anchor: 'bottom', // Anchor at the bottom to align correctly
    })
      .setLngLat(loc.coordinates) // Set marker position
      .addTo(map); // Add marker to the map

    // Create and add a popup for the location
    new mapboxgl.Popup({
      offset: 30, // Adjust position to avoid overlapping with marker
    })
      .setLngLat(loc.coordinates) // Set popup position
      .setHTML(`<p>${loc.day}: ${loc.description}</p>`) // Display description
      .addTo(map); // Add popup to the map

    // Extend the bounding box to include the current location
    bounds.extend(loc.coordinates);
  });

  // Automatically adjust the map to fit all locations
  map.fitBounds(bounds, {
    padding: {
      top: 200, // Padding at the top
      bottom: 150, // Padding at the bottom
      left: 100, // Padding on the left
      right: 100, // Padding on the right
    },
  });
};
