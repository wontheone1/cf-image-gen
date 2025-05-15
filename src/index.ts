/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

export interface Env {
	AI: Ai;
}

export default {
	async fetch(request: Request, env: Env): Promise<Response> {
		const url = new URL(request.url);
		const prompt = url.searchParams.get('prompt');

		console.log('prompt', prompt);

		if (!prompt) {
			return new Response('Prompt is required', { status: 400 });
		}

		// const steps = parseInt(url.searchParams.get('steps') || '4', 10);
		const seed = 100;

		const model = url.searchParams.get('model') || '@cf/bytedance/stable-diffusion-xl-lightning';

		console.log('model', model);

		try {
			if (model === '@cf/bytedance/stable-diffusion-xl-lightning') {
				const response = await env.AI.run('@cf/bytedance/stable-diffusion-xl-lightning', {
					prompt,
					seed,
				});
				// SDXL-Lightning returns a ReadableStream directly
				return new Response(response, {
					headers: {
						'Content-Type': 'image/jpeg',
					},
				});
			} else if (model === '@cf/black-forest-labs/flux-1-schnell') {
				const response = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', {
					prompt,
				});
				// For Flux model, we need to handle the response format differently
				// Based on the console output, the response has an 'image' property with base64 data
				if (response && typeof response === 'object' && 'image' in response) {
					const base64Data = (response as any).image;
					// Remove data URL prefix if present
					const base64Image = base64Data.replace(/^data:image\/\w+;base64,/, '');
					const binaryString = atob(base64Image);
					const imageBuffer = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

					return new Response(imageBuffer, {
						headers: {
							'Content-Type': 'image/jpeg',
						},
					});
				} else {
					console.error('Unexpected response format:', response);
					return new Response('Invalid response format from model', { status: 500 });
				}
			} else if (model === '@cf/lykon/dreamshaper-8-lcm') {
				const response = await env.AI.run('@cf/lykon/dreamshaper-8-lcm', {
					prompt,
					seed,
				});
				// Dreamshaper returns a ReadableStream directly
				return new Response(response, {
					headers: {
						'Content-Type': 'image/jpeg',
					},
				});
			} else {
				return new Response('Invalid model', { status: 400 });
			}
		} catch (error: unknown) {
			const errorMessage = error instanceof Error ? error.message : 'Unknown error';
			console.error('Error generating image:', errorMessage);
			return new Response(`Error generating image: ${errorMessage}`, { status: 500 });
		}
	},
};

// model to use for beginner: @cf/lykon/dreamshaper-8-lcm (Beta Yes)
// Stable Diffusion model that has been fine-tuned to be better
// at photorealism without sacrificing range.
// model to use for game concept arts: @cf/black-forest-labs/flux-1-schnell (Beta No)
// FLUX.1 [schnell] is a 12 billion parameter rectified
// flow transformer capable of generating images from text descriptions.
// model to use for speed: @cf/bytedance/stable-diffusion-xl-lightning (Beta Yes)
// SDXL-Lightning is a lightning-fast text-to-image generation model.
// It can generate high-quality 1024px images in a few steps.
