const { createWorker } = require("tesseract.js"),
	{ shortCrop } = require("../func/crop.js"),
	sharp = require("sharp");

async function recog(imgBuff, message, failInc) {
	const dm = (message.channel.type == "DM") ? true : false;
	if (failInc == undefined) failInc = 1;
	return new Promise(async (resolve) => {
		const worker = await createWorker("eng", 1);

		try {
			// Simple approach: just run OCR on the cropped image
			const { data: { text } } = await worker.recognize(imgBuff);
			await worker.terminate();

			// Look for a 2-digit number
			const levelnum = text.match(/(\d\d)/);
			if (levelnum != null) {
				const level = levelnum[0];
				console.log(`[DEBUG] Found level: ${level} in text: "${text}"`);
				resolve([level, false, text]);
				return;
			} else {
				// Try shortCrop if we found level-related text
				const levelTextArray = ["LEVEL", "LLLLL", "NNNNN", "NIVEL", "HIVEL", "NIVEAL", "LRI", "TEVEL", "NIV", "VEL", "YPOBEI"];
				const findTextInArray = (arr, str) => arr.some(e => str.toLowerCase().includes(e.toLowerCase()));
				if (failInc < 4 && findTextInArray(levelTextArray, text)) {
					const { shortCrop } = require("../func/crop.js");
					shortCrop(imgBuff).then((imgBuffTwo) => {
						if (ops.testMode && !dm) message.reply({ content: `Test mode. Scanned text:\n${text}\n\n This is attempt #${failInc + 1}:`, files: [imgBuffTwo] });
						recog(imgBuffTwo, message, failInc + 1).then(([level, failed, txt]) => {
							resolve([level, failed, txt]);
						});
					});
				} else {
					console.log(`[DEBUG] Failed to find level in text: "${text}"`);
					resolve(["Fail", true, text]);
					return;
				}
			}
		} catch (error) {
			console.error('OCR Error:', error);
			await worker.terminate();
			resolve(["Fail", true, error.message]);
		}
	});
}

module.exports = { recog };

// Pre-process image for better OCR accuracy
async function preprocessImage(imgBuffer, scaleFactor = 2, threshold = 180) {
	try {
		const metadata = await sharp(imgBuffer).metadata();
		console.log(`[DEBUG] Pre-processing image: ${metadata.width}x${metadata.height}, threshold: ${threshold}`);
		const processed = await sharp(imgBuffer)
			.grayscale()
			.resize({ width: Math.round(metadata.width * scaleFactor) }) // 2x upscaling for better recognition
			// Skip threshold for now to see if it's causing issues
			// .threshold(threshold) // Adjust threshold based on your UI theme
			.normalise() // Normalize contrast
			.toBuffer();

		const processedMeta = await sharp(processed).metadata();
		console.log(`[DEBUG] Processed to: ${processedMeta.width}x${processedMeta.height}`);
		return processed;
	} catch (err) {
		console.error('Pre-processing failed, using original:', err);
		return imgBuffer;
	}
}

// OCR with digit-specific configuration
async function ocrDigits(imgBuffer, worker) {
	const metadata = await sharp(imgBuffer).metadata();
	console.log(`[DEBUG] OCR input: ${metadata.width}x${metadata.height} pixels`);

	const { data } = await worker.recognize(imgBuffer, {
		tessedit_char_whitelist: '0123456789',
		classify_bln_numeric_mode: '1',     // favour digits
		tessedit_pageseg_mode: '7',         // single line (try 7, 8, or 13)
		user_defined_dpi: '300'             // helps v5 behave consistently
	});

	console.log(`[DEBUG] OCR raw result: "${data.text}", confidence: ${data.confidence}`);
	const raw = (data.text || '').replace(/\D/g, ''); // Strip non-digits
	const num = raw ? parseInt(raw, 10) : NaN;
	const conf = data.confidence ?? 0;

	return { value: num, confidence: conf, text: data.text };
}

// Post-validation with retry logic
async function validateAndRetry(imgBuffer, worker, message, attempt = 1) {
	const dm = (message.channel.type == "DM") ? true : false;

	// First try: Just use the cropped image without preprocessing
	console.log(`[DEBUG] Attempt ${attempt}: Testing original cropped image without preprocessing`);
	let result = await ocrDigitsSimple(imgBuffer, worker);

	if (result.value >= 1 && result.value <= 80 && result.confidence >= 50) {
		console.log(`[DEBUG] Success with original image: ${result.value}, confidence: ${result.confidence}`);
		return [result.value.toString().padStart(2, '0'), false, result.text];
	}

	// Second try: Use preprocessing but minimal
	console.log(`[DEBUG] Attempt ${attempt}: Testing with minimal preprocessing`);
	let prepped = await sharp(imgBuffer).grayscale().toBuffer();
	result = await ocrDigitsSimple(prepped, worker);

	if (result.value >= 1 && result.value <= 80 && result.confidence >= 50) {
		console.log(`[DEBUG] Success with grayscale: ${result.value}, confidence: ${result.confidence}`);
		return [result.value.toString().padStart(2, '0'), false, result.text];
	}

	// Third try: Try different OCR settings with less restrictive whitelist
	console.log(`[DEBUG] Attempt ${attempt}: Testing with broader character set`);
	const { data } = await worker.recognize(imgBuffer, {
		tessedit_pageseg_mode: '6', // uniform block of text
		user_defined_dpi: '300'
		// No character whitelist - allow all characters
	});

	console.log(`[DEBUG] Broad OCR result: "${data.text}", confidence: ${data.confidence}`);
	const numbers = (data.text || '').match(/\d+/g);
	if (numbers && numbers.length > 0) {
		const level = parseInt(numbers[0], 10);
		if (level >= 1 && level <= 80) {
			console.log(`[DEBUG] Found level in broad search: ${level}`);
			return [level.toString().padStart(2, '0'), false, data.text];
		}
	}

	return ["Fail", true, data.text || "No text found"];
}

// Simple OCR without character restrictions
async function ocrDigitsSimple(imgBuffer, worker) {
	const metadata = await sharp(imgBuffer).metadata();
	console.log(`[DEBUG] OCR input: ${metadata.width}x${metadata.height} pixels`);

	const { data } = await worker.recognize(imgBuffer, {
		tessedit_pageseg_mode: '7', // single line
		user_defined_dpi: '300'
		// No character whitelist to start with
	});

	console.log(`[DEBUG] OCR raw result: "${data.text}", confidence: ${data.confidence}`);

	// Look for any numbers in the result
	const numbers = (data.text || '').match(/\d+/g);
	let num = NaN;
	if (numbers && numbers.length > 0) {
		num = parseInt(numbers[0], 10);
	}

	return { value: num, confidence: data.confidence ?? 0, text: data.text };
} async function recog(imgBuff, message, failInc) {
	const dm = (message.channel.type == "DM") ? true : false;
	if (failInc == undefined) failInc = 1;

	return new Promise(async (resolve) => {
		const worker = await createWorker("eng", 1, {
			// logger: m => console.log(m) // Uncomment for debugging
		});

		try {
			const result = await validateAndRetry(imgBuff, worker, message);
			await worker.terminate();
			resolve(result);
		} catch (error) {
			console.error('OCR Error:', error);
			await worker.terminate();
			resolve(["Fail", true, error.message]);
		}
	});
}

module.exports = { recog };
