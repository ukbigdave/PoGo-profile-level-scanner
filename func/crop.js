const https = require("https");
const sharp = require("sharp");
const { rect } = require("../func/rect.js");

function crop(image) {
	return new Promise((resolve, reject) => {
		new Promise((res) => {
			const size = {};
			size.width = image.width;
			size.height = image.height;
			rect(size).then((cropSize) => {
				res(cropSize);
			});
		}).then((cropSize) => {
			https.get(image.url, function (response) {
				const chunks = [];
				response.on('data', (chunk) => chunks.push(chunk));
				response.on('end', async () => {
					try {
						const buffer = Buffer.concat(chunks);
						const originalMeta = await sharp(buffer).metadata();
						console.log(`[DEBUG] Original image: ${originalMeta.width}x${originalMeta.height}`);
						console.log(`[DEBUG] Crop region: x=${cropSize.x}, y=${cropSize.y}, w=${cropSize.wid}, h=${cropSize.hei}`);

						// Convert the old GM threshold (40000) to Sharp threshold (0-255)
						// GM used 16-bit values (0-65535), Sharp uses 8-bit (0-255)
						// Original: 40000 / 256 = ~156 (valid Sharp threshold)
						const sharpThreshold = Math.min(255, Math.max(0, Math.round(ops.threshold / 256)));
						console.log(`[DEBUG] Using threshold: ${sharpThreshold} (converted from ${ops.threshold})`);

						const imgBuff = await sharp(buffer)
							.extract({
								left: Math.round(cropSize.x),
								top: Math.round(cropSize.y),
								width: Math.round(cropSize.wid),
								height: Math.round(cropSize.hei)
							})
							.threshold(sharpThreshold) // Apply converted threshold
							.flatten({ background: { r: 255, g: 255, b: 255 } }) // Equivalent to flatten
							.toBuffer();

						const croppedMeta = await sharp(imgBuff).metadata();
						console.log(`[DEBUG] Cropped result: ${croppedMeta.width}x${croppedMeta.height}`);
						resolve(imgBuff);
					} catch (err) {
						console.error(err);
						reject("crash");
					}
				});
				response.on('error', (err) => {
					console.error(err);
					reject("crash");
				});
			});
		});
	});
}

function shortCrop(input) {
	return new Promise(async (resolve) => {
		try {
			// Get image metadata first to calculate proper crop dimensions
			const metadata = await sharp(input).metadata();
			const output = await sharp(input)
				.extract({
					left: 0,
					top: 50,
					width: metadata.width,
					height: metadata.height - 50
				})
				.toBuffer();
			resolve(output);
		} catch (err) {
			console.error(err);
			console.error("imgBuff: ");
			console.error(input);
			// Return original buffer if processing fails
			resolve(input);
		}
	});
}
module.exports = { crop, shortCrop };
