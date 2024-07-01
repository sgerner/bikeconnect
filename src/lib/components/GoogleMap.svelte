<script>
	import { onMount } from 'svelte';
	import { Loader } from '@googlemaps/js-api-loader';

	export let markers = [];
	export let businessId;
	let map;
	let googleMapsApiLoaded = false;
	let advancedMarkers = []; // To keep track of AdvancedMarkerElement instances

	const loader = new Loader({
		apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY,
		version: 'beta' // Ensure we are using the beta version for AdvancedMarkerElement
	});

	const clearMarkers = () => {
		// Remove all markers from the map
		advancedMarkers.forEach((marker) => marker.remove());
		advancedMarkers = [];
	};

	const addMarkers = async () => {
		// Ensure the marker library is loaded
		const { AdvancedMarkerElement } = await google.maps.importLibrary('marker');

		markers.forEach((marker) => {
			// Create a div element for the marker's content
			const markerContent = document.createElement('div');
			markerContent.className =
				'rounded-md font-bold text-white p-1 bg-sky-500 hover:bg-sky-800 marker-content transition-all';
			markerContent.textContent = marker.displayName.text;

			// Create the AdvancedMarkerElement with the content
			const advancedMarker = new AdvancedMarkerElement({
				map: map,
				position: { lat: marker.location.latitude, lng: marker.location.longitude },
				content: markerContent
			});

			// Listen for click events on the advanced marker
			advancedMarker.addListener('gmp-click', () => {
				businessId = marker.id;
			});

			advancedMarkers.push(advancedMarker);
		});
	};

	onMount(() => {
		loader.load().then(() => {
			google = window.google;
			const mapOptions = {
				center: {
					lat: markers[0]?.latitude ?? 33.3928,
					lng: markers[0]?.longitude ?? -111.9348
				},
				zoom: 12,
				mapId: 'customers',
				mapTypeControl: false
			};
			map = new google.maps.Map(document.getElementById('map'), mapOptions);
			googleMapsApiLoaded = true;

			// Initially add markers
			addMarkers();
		});
	});

	// Watch for changes in the markers array and update accordingly
	$: if (googleMapsApiLoaded && markers) {
		clearMarkers(); // Clear existing markers
		addMarkers(); // Add new markers
	}
</script>

<div id="map" style="width: 100%; height: 400px;"></div>
