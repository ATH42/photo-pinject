<script lang="ts">
	import { onDestroy } from 'svelte';

	interface PhotoUpload {
		filename: string;
		url: string;
	}

	interface UploadResponse {
		success: boolean;
		photos?: PhotoUpload[];
		error?: string;
	}

	let files: FileList | null = null;
	let previewUrls: string[] = [];
	let uploading = false;
	let message = '';
	let uploadedPhotos: PhotoUpload[] = [];

	function handleFiles(event: Event): void {
		const target = event.target as HTMLInputElement;
		if (!target.files?.length) return;

		files = target.files;
		previewUrls = Array.from(files).map((file) => URL.createObjectURL(file));
	}

	function removeFile(index: number): void {
		if (!files) return;

		URL.revokeObjectURL(previewUrls[index]);
		previewUrls = previewUrls.filter((_, i) => i !== index);

		const dt = new DataTransfer();
		Array.from(files)
			.filter((_, i) => i !== index)
			.forEach((file) => dt.items.add(file));
		files = dt.files;
	}

	async function upload(): Promise<void> {
		if (!files?.length) return;

		uploading = true;
		message = '';
		uploadedPhotos = [];

		try {
			const formData = new FormData();
			Array.from(files).forEach((file) => {
				formData.append('photos', file);
			});

			const response = await fetch('/api/photos', {
				method: 'POST',
				body: formData
			});

			const result: UploadResponse = await response.json();

			if (result.success && result.photos) {
				message = 'Photos uploaded successfully';
				uploadedPhotos = result.photos;
				files = null;
				previewUrls = [];
			} else {
				throw new Error(result.error || 'Upload failed');
			}
		} catch (error) {
			message = error instanceof Error ? error.message : 'Upload failed';
			console.error('Upload error:', error);
		} finally {
			uploading = false;
		}
	}

	onDestroy(() => {
		previewUrls.forEach(URL.revokeObjectURL);
	});
</script>

<div class="mx-auto max-w-2xl p-4">
	<input
		type="file"
		multiple
		accept="image/*"
		class="hidden"
		id="fileInput"
		on:change={handleFiles}
	/>

	<label
		for="fileInput"
		class="block w-full cursor-pointer rounded-lg border-2 border-dashed p-4 text-center hover:border-blue-500"
	>
		Select Photos
	</label>

	{#if previewUrls.length}
		<div class="my-4 grid grid-cols-2 gap-4">
			{#each previewUrls as url, i}
				<div class="aspect-square relative">
					<img src={url} alt="Preview" class="h-full w-full rounded-lg object-cover" />
					<button
						class="absolute right-2 top-2 h-6 w-6 rounded-full bg-red-500 text-white"
						on:click={() => removeFile(i)}
					>
						×
					</button>
				</div>
			{/each}
		</div>

		<button
			class="w-full rounded-lg bg-blue-500 p-2 text-white disabled:opacity-50"
			on:click={upload}
			disabled={uploading}
		>
			{uploading ? 'Uploading...' : 'Upload'}
		</button>
	{/if}

	{#if message}
		<div class="mt-4 rounded-lg p-4 {message.includes('failed') ? 'bg-red-100' : 'bg-green-100'}">
			{message}
		</div>
	{/if}

	{#if uploadedPhotos.length}
		<div class="mt-4">
			<h3 class="mb-2 font-medium">Uploaded Photos:</h3>
			<div class="grid grid-cols-2 gap-4">
				{#each uploadedPhotos as photo}
					<img src={photo.url} alt={photo.filename} class="h-48 w-full rounded-lg object-cover" />
				{/each}
			</div>
		</div>
	{/if}
</div>
