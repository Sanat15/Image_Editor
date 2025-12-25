import { CanvasEngine } from "./core/canvasEngine.js";

// Element references
const canvas = document.getElementById("editorCanvas");
const imageInput = document.getElementById("imageInput");
const grayscaleBtn = document.getElementById("grayscaleBtn");
const cropBtn = document.getElementById("cropBtn");
const undoBtn = document.getElementById("undoBtn");
const redoBtn = document.getElementById("redoBtn");
const brightnessSlider = document.getElementById("brightnessSlider");
const contrastSlider = document.getElementById("contrastSlider");
const exportBtn = document.getElementById("exportBtn");
const applyCropBtn = document.getElementById("applyCropBtn");
const canvasWrap = document.getElementById("canvasWrap");

const rotateLeftBtn = document.getElementById("rotateLeftBtn");
const rotateRightBtn = document.getElementById("rotateRightBtn");
const flipHBtn = document.getElementById("flipHBtn");
const flipVBtn = document.getElementById("flipVBtn");
const resizeWidthInput = document.getElementById("resizeWidth");
const resizeHeightInput = document.getElementById("resizeHeight");
const applyResizeBtn = document.getElementById("applyResizeBtn");

const menuBtn = document.getElementById("menuBtn");
const layoutRoot = document.querySelector(".layout");
const resizeDropdown = document.getElementById("resizeDropdown");
const resizeWidthValue = document.getElementById("resizeWidthValue");
const resizeHeightValue = document.getElementById("resizeHeightValue");

const emptyState = document.getElementById("emptyState");
const brightnessValue = document.getElementById("brightnessValue");
const contrastValue = document.getElementById("contrastValue");

const engine = new CanvasEngine(canvas);

// UI state helpers
function updateUndoRedoButtons() {
    const hasImage = !!engine.originalImageData;
    undoBtn.disabled = !hasImage || !engine.canUndo();
    redoBtn.disabled = !hasImage || !engine.canRedo();
}

function updateCanvasFit() {
    if (!canvasWrap) return;
    const rect = canvasWrap.getBoundingClientRect();
    const bottomPadding = 24;
    const availableHeight = Math.max(220, Math.floor(window.innerHeight - rect.top - bottomPadding));
    canvasWrap.style.setProperty("--canvasMaxH", `${availableHeight}px`);
}

function toggleSidebar() {
    if (!layoutRoot) return;
    layoutRoot.classList.toggle("layout--sidebarClosed");
    // Layout changes affect available space for the canvas.
    setTimeout(updateCanvasFit, 0);
}

function syncUIWithState() {
    brightnessSlider.value = engine.filters.brightness;
    contrastSlider.value = engine.filters.contrast;

    if (brightnessValue) {
        brightnessValue.textContent = `${Math.round(100 + engine.filters.brightness / 2)}%`;
    }
    if (contrastValue) {
        contrastValue.textContent = `${Math.round(100 + engine.filters.contrast / 2)}%`;
    }
}

function syncResizeInputs() {
    if (!resizeWidthInput || !resizeHeightInput) return;

    const width = engine.canvas.width || 1;
    const height = engine.canvas.height || 1;

    // Provide a practical range for resizing. Users can shrink to 1px and grow to 2x.
    resizeWidthInput.min = "1";
    resizeHeightInput.min = "1";
    resizeWidthInput.max = String(Math.max(1, Math.floor(width * 2)));
    resizeHeightInput.max = String(Math.max(1, Math.floor(height * 2)));

    resizeWidthInput.value = String(width);
    resizeHeightInput.value = String(height);

    if (resizeWidthValue) resizeWidthValue.textContent = `${width}px`;
    if (resizeHeightValue) resizeHeightValue.textContent = `${height}px`;
}

function clearCropMode() {
    engine.cropState = null;
    engine.cropInteraction.dragging = false;
    engine.cropInteraction.edge = null;
    applyCropBtn.disabled = true;
    canvas.style.cursor = "default";
    engine.render();
    updateCanvasFit();
}

function setControlsEnabled(enabled) {
    grayscaleBtn.disabled = !enabled;
    cropBtn.disabled = !enabled;
    brightnessSlider.disabled = !enabled;
    contrastSlider.disabled = !enabled;
    exportBtn.disabled = !enabled;

    rotateLeftBtn.disabled = !enabled;
    rotateRightBtn.disabled = !enabled;
    flipHBtn.disabled = !enabled;
    flipVBtn.disabled = !enabled;
    resizeWidthInput.disabled = !enabled;
    resizeHeightInput.disabled = !enabled;
    applyResizeBtn.disabled = !enabled;

    if (!enabled) {
        undoBtn.disabled = true;
        redoBtn.disabled = true;
    } else {
        updateUndoRedoButtons();
    }

    if (resizeDropdown) {
        resizeDropdown.hidden = true;
    }
}

function applyCropAndExit() {
    if (!engine.cropState) return;
    engine.applyCrop();
    clearCropMode();
    updateUndoRedoButtons();
    updateCanvasFit();
}

function enterCropMode() {
    if (!engine.originalImageData) return;

    engine.cropState = {
        x: 0,
        y: 0,
        width: engine.canvas.width,
        height: engine.canvas.height
    };

    engine.cropInteraction.dragging = false;
    engine.cropInteraction.edge = null;

    applyCropBtn.disabled = false;
    canvas.style.cursor = "default";
    engine.render();
    updateCanvasFit();
}

// Image loading
imageInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    engine.loadImage(file).then(() => {
        setControlsEnabled(true);

        if (emptyState) {
            emptyState.hidden = true;
        }

        if (resizeDropdown) {
            resizeDropdown.hidden = true;
        }

        clearCropMode();
        syncUIWithState();
        syncResizeInputs();
        updateUndoRedoButtons();
        updateCanvasFit();
    });

});

window.addEventListener("resize", () => {
    updateCanvasFit();
});

if (menuBtn) {
    menuBtn.addEventListener("click", () => {
        toggleSidebar();
    });
}

// Basic tools
grayscaleBtn.addEventListener("click", () => {
    engine.toggleGrayscale();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

// History (buttons)
undoBtn.addEventListener("click", () => {
    engine.undo();
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

redoBtn.addEventListener("click", () => {
    engine.redo();
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
    const isMac = navigator.platform.toUpperCase().includes("MAC");
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

    if (e.key === "Enter" && engine.cropState) {
        e.preventDefault();
        applyCropAndExit();
        return;
    }

    if (!ctrlOrCmd) return;

    if (e.key === "z" && !e.shiftKey) {
        e.preventDefault();
        engine.undo();
        clearCropMode();
        syncUIWithState();
        syncResizeInputs();
        updateUndoRedoButtons();
    }

    if (e.key === "y" || (e.key === "z" && e.shiftKey)) {
        e.preventDefault();
        engine.redo();
        clearCropMode();
        syncUIWithState();
        syncResizeInputs();
        updateUndoRedoButtons();
    }
});

// Adjustments
brightnessSlider.addEventListener("input", (e) => {
    engine.filters.brightness = Number(e.target.value);
    engine.applyFilters();
    if (brightnessValue) {
        brightnessValue.textContent = `${Math.round(100 + engine.filters.brightness / 2)}%`;
    }
});

contrastSlider.addEventListener("input", (e) => {
    engine.filters.contrast = Number(e.target.value);
    engine.applyFilters();
    if (contrastValue) {
        contrastValue.textContent = `${Math.round(100 + engine.filters.contrast / 2)}%`;
    }
});

brightnessSlider.addEventListener("change", () => {
    engine.saveState();
    updateUndoRedoButtons();
});

contrastSlider.addEventListener("change", () => {
    engine.saveState();
    updateUndoRedoButtons();
});

// Export
exportBtn.addEventListener("click", () => {
    engine.exportImage();
});

// Transform
rotateLeftBtn.addEventListener("click", () => {
    engine.rotate90("left");
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

rotateRightBtn.addEventListener("click", () => {
    engine.rotate90("right");
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

flipHBtn.addEventListener("click", () => {
    engine.flip("horizontal");
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

flipVBtn.addEventListener("click", () => {
    engine.flip("vertical");
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
});

applyResizeBtn.addEventListener("click", () => {
    if (!resizeDropdown) return;
    const isOpen = !resizeDropdown.hidden;
    resizeDropdown.hidden = isOpen;
    // No resize is applied on button click; resizing happens on slider release.
});

resizeWidthInput.addEventListener("input", () => {
    if (resizeWidthValue) resizeWidthValue.textContent = `${Math.round(Number(resizeWidthInput.value))}px`;
});

resizeHeightInput.addEventListener("input", () => {
    if (resizeHeightValue) resizeHeightValue.textContent = `${Math.round(Number(resizeHeightInput.value))}px`;
});

function applyResizeFromSliders() {
    const w = Number(resizeWidthInput.value);
    const h = Number(resizeHeightInput.value);
    engine.resizeImage(w, h);
    clearCropMode();
    syncUIWithState();
    syncResizeInputs();
    updateUndoRedoButtons();
}

resizeWidthInput.addEventListener("change", () => {
    applyResizeFromSliders();
});

resizeHeightInput.addEventListener("change", () => {
    applyResizeFromSliders();
});

// Crop
cropBtn.addEventListener("click", () => {
    enterCropMode();
});

canvas.addEventListener("mousedown", (e) => {
    if (!engine.cropState) return;

    const { x, y } = engine.getMousePos(e);
    const edge = engine.getCropEdgeAt(x, y);

    if (!edge) return;

    engine.cropInteraction.dragging = true;
    engine.cropInteraction.edge = edge;
    engine.cropInteraction.startX = x;
    engine.cropInteraction.startY = y;
});

canvas.addEventListener("mousemove", (e) => {
    if (!engine.cropState) return;

    const { x, y } = engine.getMousePos(e);

    // Cursor feedback
    const edge = engine.getCropEdgeAt(x, y);
    canvas.style.cursor =
        edge === "left" || edge === "right" ? "ew-resize" :
        edge === "top" || edge === "bottom" ? "ns-resize" :
        "default";

    if (!engine.cropInteraction.dragging) return;

    const dx = x - engine.cropInteraction.startX;
    const dy = y - engine.cropInteraction.startY;

    const crop = engine.cropState;

    switch (engine.cropInteraction.edge) {
        case "left":
            crop.x += dx;
            crop.width -= dx;
            break;
        case "right":
            crop.width += dx;
            break;
        case "top":
            crop.y += dy;
            crop.height -= dy;
            break;
        case "bottom":
            crop.height += dy;
            break;
    }

    // Minimum crop size
    crop.width = Math.max(20, crop.width);
    crop.height = Math.max(20, crop.height);

    // Keep inside canvas
    crop.x = Math.max(0, crop.x);
    crop.y = Math.max(0, crop.y);

    crop.width = Math.min(engine.canvas.width - crop.x, crop.width);
    crop.height = Math.min(engine.canvas.height - crop.y, crop.height);

    engine.cropInteraction.startX = x;
    engine.cropInteraction.startY = y;

    engine.render();
    applyCropBtn.disabled = false;
});


canvas.addEventListener("mouseup", () => {
    engine.cropInteraction.dragging = false;
    engine.cropInteraction.edge = null;
});

applyCropBtn.addEventListener("click", () => {
    applyCropAndExit();
});

setControlsEnabled(false);
applyCropBtn.disabled = true;
updateCanvasFit();

