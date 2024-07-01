<script>
	import axios from 'axios';
	import { supabase } from '$lib/supabase.js';
	import { createEventDispatcher } from 'svelte';
	import { ListBox, ListBoxItem, getToastStore, ProgressBar } from '@skeletonlabs/skeleton';
	import GoogleMap from '../lib/components/GoogleMap.svelte';
	import XMark from '@ghostebony/svelte-heroicons/24/solid/XMark';

	// State variables
	let isLoadingSearch = false;
	let errorMessage = '';
	let successfulSubmission = false;
	let loadingSubmit = false;
	const toastStore = getToastStore();
	const dispatch = createEventDispatcher();

	// User details and locations
	let details = { zip: null, email: null, emailOptIn: true };
	let locations = [{ id: 1 }, { id: 2 }, { id: 3 }];

	// Update 'business' key in locations when businessId changes
	$: locations = locations.map((location) => {
		location.business = location.searchResults?.find((place) => place.id === location.businessId);
		if (location.searchText?.length < 1) {
			location.business = null;
		}
		return location;
	});

	// Debounce function to limit API calls
	let timeout;
	async function debounceSearch(searchText, index) {
		clearTimeout(timeout);
		timeout = setTimeout(async () => {
			let trimmedSearchText = searchText.trim();
			locations[index].searchResults = await performSearch(trimmedSearchText);
		}, 500);
	}

	// Perform search using Google Places API
	async function performSearch(trimmedSearchText) {
		isLoadingSearch = true;
		errorMessage = '';
		const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
		const url = `https://places.googleapis.com/v1/places:searchText`;
		const data = {
			textQuery: trimmedSearchText,
			pageSize: 5,
			locationBias: {
				circle: {
					center: { latitude: 33.3928, longitude: -111.9348 },
					radius: 3
				}
			}
		};
		const headers = {
			'Content-Type': 'application/json',
			'X-Goog-Api-Key': apiKey,
			'X-Goog-FieldMask':
				'places.id,places.displayName,places.formattedAddress,places.addressComponents,places.googleMapsUri,places.location,places.primaryTypeDisplayName'
		};

		try {
			const response = await axios.post(url, data, { headers });
			return response.data.places;
		} catch (error) {
			handleError(`Please try searching again. ${error.message}` || 'Failed to fetch results');
		} finally {
			isLoadingSearch = false;
		}
	}

	// Submit destinations to Supabase
	async function submitDestinations() {
		loadingSubmit = true;
		let submissionData = locations
			.filter((location) => location.business)
			.map((location) => ({
				zip: details.zip,
				email: details.email,
				emailOptIn: details.emailOptIn,
				destination: location.business,
				lat: location.business.location.latitude,
				lng: location.business.location.longitude,
				good: location.good,
				bad: location.bad
			}));

		try {
			if (submissionData.length < 1) {
				throw new Error('Please select at least one destination');
			}

			const { data, error } = await supabase.from('bikeconnect').insert(submissionData);
			if (error) throw error;

			resetForm();
			successfulSubmission = true;
		} catch (error) {
			handleError(`Please try submitting again. ${error.message}` || 'Failed to submit');
		} finally {
			loadingSubmit = false;
		}
	}

	// Helper function to handle errors
	function handleError(message) {
		errorMessage = message;
		toastStore.trigger({
			message: errorMessage,
			timeout: 10000,
			background: 'variant-filled-error'
		});
	}

	// Reset form after successful submission
	function resetForm() {
		details = { zip: null, email: null, emailOptIn: true };
		locations = [{ id: 1 }, { id: 2 }, { id: 3 }];
	}
</script>

<!-- HTML template -->
<div class="container h-full mx-auto my-8 px-4 flex justify-center items-center">
	<div class="space-y-5">
		<!-- Header and introduction -->
		<a href="https://biketempe.org" target="_blank">
			<img
				class="h-auto m-auto max-w-xs rounded-lg"
				src="/images/TBAG.jpg"
				alt="Tempe Bicycle Action Group"
			/>
		</a>
		<h2 class="h2 mb-4 text-center">Survey: Tempe Active Traveler Connections</h2>
		<div class="card card variant-filled-surface p-4 rounded-md">
			<p class="text-lg">
				Tempe Bicycle Action Group is identifying the most important destinations traveling to
				WITHOUT a motor vehicle. Whether you're biking, walking, scooting, or skateboarding, your
				feedback will help us understand what works and what needs improvement. Share your
				experiences and needs with us!
			</p>
		</div>

		{#if !successfulSubmission}
			<!-- Destination selection -->
			<h3 class="h3 mt-4">
				Please identify your most important destinations to travel to WITHOUT a motorized vehicle:
			</h3>
			{#each locations as location, index}
				<!-- Destination card -->
				<div
					class="card card p-4 rounded-md {index > 0 && !locations[index - 1].business
						? 'variant-soft-secondary'
						: 'variant-ghost-primary'}"
				>
					<!-- Destination header -->
					<h4 class="h4 mb-4 flex gap-4 items-center">
						{#if index > 0}Optional{/if}
						Destination {location.id}:
						{#if location.business}
							{location.business?.displayName?.text}
							<span class="text-base font-normal grow">{location.business.formattedAddress}</span>
							<button
								type="button"
								class="btn-icon btn-icon-sm place-self-center variant-filled-error p-1"
								on:click={() => {
									location.searchText = null;
									location.searchResults = null;
									location.businessId = null;
									location.business = null;
								}}
							>
								<XMark />
							</button>
						{/if}
					</h4>

					{#if index > 0 && !locations[index - 1].business}
						<h4 class="h4 variant-soft-warning p-4">Please complete the previous location.</h4>
					{:else}
						<div class="rounded grow">
							{#if !location.business}
								<!-- Search form -->
								<form class="input-group rounded flex p-1">
									<input
										type="text"
										bind:value={location.searchText}
										placeholder="Search for location"
										class="input shrink rounded"
										on:input={async () =>
											location.searchText.length > 1
												? await debounceSearch(location.searchText, index)
												: (location.searchResults = null)}
									/>
									<button
										type="button"
										class="btn-icon btn-icon-lg place-self-center !bg-transparent"
										on:click={() => {
											location.searchText = null;
											location.searchResults = null;
											location.businessId = null;
											location.business = null;
										}}
									>
										<XMark />
									</button>
								</form>

								{#if isLoadingSearch}
									<p>Loading...</p>
								{:else if errorMessage}
									<p class="text-red-500">{errorMessage}</p>
								{/if}

								{#if location.searchResults?.length > 0}
									<!-- Search results -->
									<ListBox class="my-4 pb-4">
										{#each location.searchResults as place}
											<ListBoxItem
												bind:group={location.businessId}
												name="businessList"
												value={place.id}
												spacing="space-y-3"
											>
												{place.displayName.text} - {place.formattedAddress}
											</ListBoxItem>
										{/each}
									</ListBox>

									<!-- Google Map component -->
									<GoogleMap
										markers={location.searchResults}
										bind:businessId={location.businessId}
										class="transition-all duration-500"
									/>
								{/if}
							{:else if location.business}
								<!-- Feedback form for selected business -->
								<div class="card variant-filled-surface p-4 my-4 rounded">
									<label class="label mb-4">
										<span class="font-bold">
											(OPTIONAL) What do you enjoy about traveling to this destination without a
											car?
										</span>
										<textarea
											class="textarea rounded"
											rows="4"
											placeholder=""
											bind:value={location.good}
										/>
									</label>
									<label class="label mb-4">
										<span class="font-bold">
											(OPTIONAL) What challenges do you face when traveling to this destination
											without a car?
										</span>
										<textarea
											class="textarea rounded"
											rows="4"
											placeholder=""
											bind:value={location.bad}
										/>
									</label>
								</div>
							{/if}
						</div>
					{/if}
				</div>
			{/each}

			<!-- User details form -->
			<h3 class="h3 mt-4">Your Details:</h3>
			<div class="card card p-4 rounded-md variant-ghost-primary">
				<label class="label mb-4">
					<span>What Zip Code do you live in?</span>
					<input
						class="input rounded"
						type="text"
						placeholder="85282"
						required
						bind:value={details.zip}
					/>
				</label>
				<label class="label mb-4">
					<span>Email Address</span>
					<input
						class="input rounded"
						type="email"
						placeholder="juanita@example.com"
						autocomplete="email"
						required
						bind:value={details.email}
					/>
				</label>
				<label class="mb-4">
					<p class="mb-2">
						May we contact you about future improvements to destinations you selected?
					</p>
					<div class="flex items-center space-x-2 mb-2">
						<input
							class="radio"
							type="radio"
							checked
							name="email_opt_in"
							value={true}
							bind:group={details.emailOptIn}
							required
						/>
						<p>Yes</p>
					</div>
					<div class="flex items-center space-x-2 mb-2">
						<input
							class="radio"
							type="radio"
							name="email_opt_in"
							value={false}
							bind:group={details.emailOptIn}
							required
						/>
						<p>No</p>
					</div>
				</label>
			</div>

			<!-- Submit button -->
			<div class="flex justify-center">
				{#if loadingSubmit}
					<ProgressBar meter="bg-tertiary-500" track="bg-tertiary-500/30" value={undefined} />
				{:else}
					<button
						type="button"
						class="btn variant-filled-tertiary"
						on:click={() => submitDestinations()}
					>
						<h3 class="h3">Submit Survey</h3>
					</button>
				{/if}
			</div>
		{:else if successfulSubmission}
			<!-- Success message -->
			<div class="card card p-4 rounded-md variant-filled-success">
				<div class="flex gap-2 mb-4">
					<h2 class="h2 grow">Thank you for your feedback!</h2>
					<button
						type="button"
						class="btn-icon btn-icon-md place-self-center p-1 !bg-transparent"
						on:click={() => {
							successfulSubmission = false;
						}}
					>
						<XMark />
					</button>
				</div>
				<p>
					We appreciate your time and effort to help us improve active traveler connectivity in
					Tempe! To stay up-to-date on our progress, please join our
					<a
						href="https://www.facebook.com/biketempe/"
						target="_blank"
						class="anchor font-bold !text-white">Facebook Group</a
					>,
					<a
						href="https://www.instagram.com/biketempe/"
						target="_blank"
						class="anchor font-bold !text-white">Instagram</a
					>,
					<a
						href="https://www.biketempe.org/join-us/"
						target="_blank"
						class="anchor font-bold !text-white">or sign-up for our monthly emails</a
					>.
				</p>
			</div>
		{/if}
	</div>
</div>
