import { error, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { put } from '@vercel/blob';

export const POST: RequestHandler = async ({ request }) => {
	try {
		const formData = await request.formData();
		const photos = formData.getAll('photos') as File[];

		if (!photos.length) {
			throw error(400, 'No photos uploaded');
		}

		// Upload all photos to Vercel Blob
		const uploads = await Promise.all(
			photos.map(async (photo) => {
				const filename = `${Date.now()}-${photo.name}`;
				const blob = await put(filename, photo, {
					access: 'public'
				});
				return {
					filename,
					url: blob.url
				};
			})
		);

		// Forward URLs to Obsidian plugin
		const obsidianResponse = await fetch('http://localhost:27123/addImages', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({ photos: uploads })
		});

		if (!obsidianResponse.ok) {
			throw new Error('Failed to update Obsidian');
		}

		return json({
			success: true,
			photos: uploads
		});
	} catch (err) {
		console.error('Upload error:', err);
		return json(
			{
				success: false,
				error: err instanceof Error ? err.message : 'Failed to process photos'
			},
			{ status: 500 }
		);
	}
};
