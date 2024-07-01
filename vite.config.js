import { purgeCss } from 'vite-plugin-tailwind-purgecss';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
	ssr: {
		noExternal: ['@googlemaps/js-api-loader']
	},
	plugins: [sveltekit(), purgeCss()]
});
