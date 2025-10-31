// Development WASM shim to prevent fetch() WASM path issues in development environments
// This forces Tesseract.js to use the filesystem path instead of fetch() for WASM loading

// Disable WebAssembly.instantiateStreaming to force fallback to filesystem
if (typeof WebAssembly !== 'undefined' && WebAssembly.instantiateStreaming) {
    WebAssembly.instantiateStreaming = undefined;
    console.log('[DEV-SHIM]: Disabled WebAssembly.instantiateStreaming');
}

// Disable global fetch to force Tesseract to use filesystem paths
if (typeof global !== 'undefined' && global.fetch) {
    global.fetch = undefined;
    console.log('[DEV-SHIM]: Disabled global.fetch');
}

// Also disable fetch on globalThis if it exists
if (typeof globalThis !== 'undefined' && globalThis.fetch) {
    globalThis.fetch = undefined;
    console.log('[DEV-SHIM]: Disabled globalThis.fetch');
}

console.log('[DEV-SHIM]: Development WASM shim loaded - forcing Tesseract to use local file paths');