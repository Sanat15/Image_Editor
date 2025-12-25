# 🖼️ Image Editor (Canvas-based Web Application)

A modern, browser-based image editing application built using **HTML, CSS, and JavaScript**, leveraging the **HTML5 Canvas API**.  
The project focuses on **non-destructive editing**, clean UI/UX, and a scalable internal architecture.

🔗 **Live Demo:**  
https://image-editor-henna-one.vercel.app/

---

## ✨ Features

- 📤 Upload images directly in the browser
- 🎨 Non-destructive editing pipeline
- 🌑 Greyscale filter
- 🔆 Brightness adjustment
- 🔳 Contrast adjustment
- ✂️ Interactive crop tool with overlay
- ↩️ Undo / redo history
- 🔄 Rotate image (90° left/right)
- 🔁 Flip image horizontally & vertically
- 📐 Resize image using sliders
- 💾 Export edited image as PNG
- 🖥️ Responsive, clean UI
- ⌨️ Keyboard shortcuts for undo/redo

---

## 📸 Screenshots

### Main Interface
![Main UI](Screenshots/Screenshot 2025-12-25 215001.png)

### Crop Tool
![Crop Tool](Screenshot 2025-12-25 215026.png)

> Screenshots are included in the `Screenshots/` directory.

---

## 🧠 Technical Overview

### Architecture
- **CanvasEngine**  
  Handles:
  - Image data
  - Filters
  - Crop logic
  - Undo/redo history
  - Transform operations

- **UI Layer (`main.js`)**  
  Responsible for:
  - Event handling
  - Tool activation
  - State synchronization
  - Keyboard shortcuts

This separation ensures:
- Maintainability
- Easy feature extension
- Clear responsibility boundaries

---

## 🔄 Non-Destructive Editing

The editor uses a **non-destructive workflow**:
- The original image data is preserved
- All filters are reapplied from the base image
- Transformations (crop, rotate, resize) integrate cleanly with undo/redo
- No permanent pixel loss unless explicitly exported

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|--------|-------|
| Ctrl / Cmd + Z | Undo |
| Ctrl / Cmd + Shift + Z | Redo |
| Ctrl / Cmd + Y | Redo |
| Enter (during crop) | Apply crop |

---

## 🛠️ Technologies Used

- **HTML5**
- **CSS3**
- **JavaScript (ES Modules)**
- **HTML5 Canvas API**
- **Vercel** (deployment)

No external frameworks or libraries were used.

---

## 🚀 Deployment

The project is deployed using **Vercel** as a static frontend application.

- Automatic redeploy on GitHub push
- HTTPS enabled
- Zero-config setup

---

## 📁 Project Structure

Image Editing Project/
├── index.html
├── style.css
├── src/
│ ├── core/
│ │ └── CanvasEngine.js
│ └── main.js
└── Screenshots/


---

## 🔮 Planned Enhancements

- Layer-based editing (text, shapes, emojis, images)
- Freehand drawing & eraser tools
- Advanced rotation & transform handles
- Collage templates
- Freeform (mask-based) cropping
- AI-powered features (object removal, image generation)
- Optional backend support for saved projects

---

## 👤 Author

**Sanat Shukla**  
IIT Indore  
Frontend & Systems Programming Enthusiast

---

## 📄 License

This project is licensed under the **MIT License**.  
Feel free to use, modify, and learn from it.
