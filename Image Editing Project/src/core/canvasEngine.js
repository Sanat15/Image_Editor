export class CanvasEngine {
    constructor(canvas) {
        // Canvas and drawing context
        this.originalImageData = null;
        this.currentImageData = null;

        this.canvas = canvas;
        this.ctx = canvas.getContext("2d");

        // Current filter settings

        this.filters = {
            grayscale: false,
            brightness: 0,
            contrast: 0  
        };

        // Undo/redo history (bounded to keep memory usage reasonable)
        this.history = [];
        this.redoStack = [];

        this.maxHistory = 20;

        // Crop overlay interaction state
        this.cropInteraction = {
            dragging: false,
            edge: null,
            startX: 0,
            startY: 0
        };        
    }

    resize(width, height) {
        // Update intrinsic canvas size. Display sizing is handled by CSS so large
        // images can be scaled down to fit the viewport without losing pixels.
        this.canvas.width = width;
        this.canvas.height = height;
    }

    canUndo() {
        return this.history.length > 1;
    }

    canRedo() {
        return this.redoStack.length > 0;
    }


    loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                // Reset editor state
                this.resetHistory();

                this.filters = {
                    grayscale: false,
                    brightness: 0,
                    contrast: 0
                };

                this.cropState = null;
                this.cropInteraction.dragging = false;
                this.cropInteraction.edge = null;

                // Resize and draw the fresh image
                this.resize(img.width, img.height);
                this.ctx.drawImage(img, 0, 0);

                // Capture original pixels
                this.originalImageData = this.ctx.getImageData(
                    0,
                    0,
                    this.canvas.width,
                    this.canvas.height
                );

                // Create working copy
                this.currentImageData = new ImageData(
                    new Uint8ClampedArray(this.originalImageData.data),
                    this.originalImageData.width,
                    this.originalImageData.height
                );

                // Save the base state for undo
                this.saveState();

                // Render
                this.render();

                resolve();
            };

            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    }


    render() {
        if (!this.currentImageData) return;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.putImageData(this.currentImageData, 0, 0);

        // Draw crop overlay on top (if active)
        this.drawCropOverlay();
    }

    toggleGrayscale() {
        this.saveState();                 
        this.filters.grayscale = !this.filters.grayscale;
        this.applyFilters();              
    }


    saveState() {
        if (!this.originalImageData) return;

        const snapshot = {
            originalImageData: new ImageData(
                new Uint8ClampedArray(this.originalImageData.data),
                this.originalImageData.width,
                this.originalImageData.height
            ),
            filters: { ...this.filters }
        };

        this.history.push(snapshot);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }
        this.redoStack.length = 0;
    }

    restoreState(state) {
        this.originalImageData = new ImageData(
            new Uint8ClampedArray(state.originalImageData.data),
            state.originalImageData.width,
            state.originalImageData.height
        );

        this.resize(state.originalImageData.width, state.originalImageData.height);

        this.filters = { ...state.filters };
        this.cropState = null;

        this.applyFilters(); // rebuild currentImageData correctly
    }


    undo() {
        if (!this.canUndo()) return;

        // Save current state for redo
        const redoSnapshot = {
            originalImageData: new ImageData(
                new Uint8ClampedArray(this.originalImageData.data),
                this.originalImageData.width,
                this.originalImageData.height
            ),
            filters: { ...this.filters }
        };

        this.redoStack.push(redoSnapshot);
        if (this.redoStack.length > this.maxHistory) {
            this.redoStack.shift();
        }

        // Restore previous state
        const previousState = this.history.pop();
        this.restoreState(previousState);
    }

    redo() {
        if (this.redoStack.length === 0) return;

        // Save current state back into history
        const undoSnapshot = {
            originalImageData: new ImageData(
                new Uint8ClampedArray(this.originalImageData.data),
                this.originalImageData.width,
                this.originalImageData.height
            ),
            filters: { ...this.filters }
        };

        this.history.push(undoSnapshot);
        if (this.history.length > this.maxHistory) {
            this.history.shift();
        }

        // Restore redo state
        const nextState = this.redoStack.pop();
        this.restoreState(nextState);
    }

    resetHistory() {
        this.history.length = 0;
        this.redoStack.length = 0;
    }

    applyFilters() {
        // Always start from original
        this.currentImageData = new ImageData(
            new Uint8ClampedArray(this.originalImageData.data),
            this.originalImageData.width,
            this.originalImageData.height
        );

        const data = this.currentImageData.data;
        const { grayscale, brightness, contrast } = this.filters;

        // Precompute contrast factor
        const contrastFactor =
            (259 * (contrast + 255)) / (255 * (259 - contrast));

        for (let i = 0; i < data.length; i += 4) {
            let r = data[i];
            let g = data[i + 1];
            let b = data[i + 2];

            // Grayscale
            if (grayscale) {
                const gray = 0.299 * r + 0.587 * g + 0.114 * b;
                r = g = b = gray;
            }

            // Brightness
            r += brightness;
            g += brightness;
            b += brightness;

            // Contrast
            r = contrastFactor * (r - 128) + 128;
            g = contrastFactor * (g - 128) + 128;
            b = contrastFactor * (b - 128) + 128;

            // Clamp values
            data[i]     = Math.max(0, Math.min(255, r));
            data[i + 1] = Math.max(0, Math.min(255, g));
            data[i + 2] = Math.max(0, Math.min(255, b));
        }

        this.render();
    }

    // Image transforms
    // These update originalImageData, keep current filters, and are undoable.

    rotate90(direction) {
        if (!this.originalImageData) return;
        const clockwise = direction === "right";

        this.saveState();

        const src = this.originalImageData;
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = src.width;
        srcCanvas.height = src.height;
        const srcCtx = srcCanvas.getContext("2d");
        srcCtx.putImageData(src, 0, 0);

        const dstCanvas = document.createElement("canvas");
        dstCanvas.width = src.height;
        dstCanvas.height = src.width;
        const dstCtx = dstCanvas.getContext("2d");
        dstCtx.imageSmoothingEnabled = true;

        dstCtx.translate(dstCanvas.width / 2, dstCanvas.height / 2);
        dstCtx.rotate(clockwise ? Math.PI / 2 : -Math.PI / 2);
        dstCtx.drawImage(srcCanvas, -src.width / 2, -src.height / 2);

        this.originalImageData = dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height);
        this.cropState = null;
        this.resize(dstCanvas.width, dstCanvas.height);
        this.applyFilters();
    }

    flip(axis) {
        if (!this.originalImageData) return;
        const horizontal = axis === "horizontal";

        this.saveState();

        const src = this.originalImageData;
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = src.width;
        srcCanvas.height = src.height;
        const srcCtx = srcCanvas.getContext("2d");
        srcCtx.putImageData(src, 0, 0);

        const dstCanvas = document.createElement("canvas");
        dstCanvas.width = src.width;
        dstCanvas.height = src.height;
        const dstCtx = dstCanvas.getContext("2d");

        dstCtx.translate(horizontal ? dstCanvas.width : 0, horizontal ? 0 : dstCanvas.height);
        dstCtx.scale(horizontal ? -1 : 1, horizontal ? 1 : -1);
        dstCtx.drawImage(srcCanvas, 0, 0);

        this.originalImageData = dstCtx.getImageData(0, 0, dstCanvas.width, dstCanvas.height);
        this.cropState = null;
        this.applyFilters();
    }

    resizeImage(newWidth, newHeight) {
        if (!this.originalImageData) return;

        const width = Math.max(1, Math.floor(Number(newWidth)));
        const height = Math.max(1, Math.floor(Number(newHeight)));
        if (!Number.isFinite(width) || !Number.isFinite(height)) return;
        if (width === this.originalImageData.width && height === this.originalImageData.height) return;

        this.saveState();

        const src = this.originalImageData;
        const srcCanvas = document.createElement("canvas");
        srcCanvas.width = src.width;
        srcCanvas.height = src.height;
        const srcCtx = srcCanvas.getContext("2d");
        srcCtx.putImageData(src, 0, 0);

        const dstCanvas = document.createElement("canvas");
        dstCanvas.width = width;
        dstCanvas.height = height;
        const dstCtx = dstCanvas.getContext("2d");
        dstCtx.imageSmoothingEnabled = true;
        dstCtx.imageSmoothingQuality = "high";
        dstCtx.drawImage(srcCanvas, 0, 0, width, height);

        this.originalImageData = dstCtx.getImageData(0, 0, width, height);
        this.cropState = null;
        this.resize(width, height);
        this.applyFilters();
    }

    exportImage(type = "image/png", quality = 1) {
        if (!this.currentImageData) return;

        // Make sure canvas reflects current pixels
        this.render();

        const dataURL = this.canvas.toDataURL(type, quality);

        const link = document.createElement("a");
        link.href = dataURL;
        link.download = "edited-image.png";
        link.click();
    }

    drawCropOverlay() {
        if (!this.cropState) return;

        const { x, y, width, height } = this.cropState;

        // Save current state
        this.ctx.save();

        // ---- Dim outside area ----
        this.ctx.fillStyle = "rgba(0, 0, 0, 0.5)";

        // Top
        this.ctx.fillRect(0, 0, this.canvas.width, y);
        // Left
        this.ctx.fillRect(0, y, x, height);
        // Right
        this.ctx.fillRect(x + width, y, this.canvas.width - (x + width), height);
        // Bottom
        this.ctx.fillRect(0, y + height, this.canvas.width, this.canvas.height - (y + height));

        // ---- White dashed border ----
        this.ctx.strokeStyle = "white";
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([8, 6]);

        this.ctx.strokeRect(x, y, width, height);

        this.ctx.restore();
    }

    getMousePos(evt) {
        const rect = this.canvas.getBoundingClientRect();

        // Convert from screen pixels to canvas pixel coordinates.
        // This keeps interactions accurate even when the canvas is scaled via CSS.
        const scaleX = this.canvas.width / rect.width;
        const scaleY = this.canvas.height / rect.height;

        return {
            x: (evt.clientX - rect.left) * scaleX,
            y: (evt.clientY - rect.top) * scaleY
        };
    }

    getCropEdgeAt(x, y) {
        if (!this.cropState) return null;

        const { x: cx, y: cy, width, height } = this.cropState;
        const edgeSize = 8; // hit area thickness

        if (Math.abs(x - cx) <= edgeSize && y >= cy && y <= cy + height)
            return "left";

        if (Math.abs(x - (cx + width)) <= edgeSize && y >= cy && y <= cy + height)
            return "right";

        if (Math.abs(y - cy) <= edgeSize && x >= cx && x <= cx + width)
            return "top";

        if (Math.abs(y - (cy + height)) <= edgeSize && x >= cx && x <= cx + width)
            return "bottom";

        return null;
    }

    applyCrop() {
        if (!this.cropState || !this.originalImageData) return;

        // Save full image state for undo before cropping
        this.saveState();

        const { x, y, width, height } = this.cropState;

        const ix = Math.max(0, Math.round(x));
        const iy = Math.max(0, Math.round(y));
        const iwidth = Math.max(1, Math.round(width));
        const iheight = Math.max(1, Math.round(height));

        const cropped = this.ctx.createImageData(iwidth, iheight);
        const src = this.originalImageData.data;
        const dst = cropped.data;
        const srcWidth = this.originalImageData.width;

        for (let row = 0; row < iheight; row++) {
            for (let col = 0; col < iwidth; col++) {
                const srcIndex =
                    ((iy + row) * srcWidth + (ix + col)) * 4;
                const dstIndex =
                    (row * iwidth + col) * 4;

                dst[dstIndex]     = src[srcIndex];
                dst[dstIndex + 1] = src[srcIndex + 1];
                dst[dstIndex + 2] = src[srcIndex + 2];
                dst[dstIndex + 3] = src[srcIndex + 3];
            }
        }
        // Replace base image
        this.originalImageData = cropped;

        this.resize(iwidth, iheight);

        // Crop overlay should disappear after applying crop
        this.cropState = null;

        this.applyFilters();
    }


}
