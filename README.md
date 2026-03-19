# 🥷 Unexposed - Chrome Extension

![Unexposed Logo](./icons/icon128.png)

A privacy-focused Chrome extension for image post-processing before. The extension overlays an anonymization tool on file upload fields (`<input type="file">`) across any website.

It allows you to clean an image locally before it's sent to the host website's server.

## 🌟 Features

- **100% Metadata Removal**: All EXIF data (GPS coordinates, creation date, device info, etc.) are destroyed.
- **Orientation Preservation**: While EXIF data is removed, the visual orientation is "baked" into the final image pixels, ensuring it's never upside down or sideways.
- **AI Face Blurring**: Using a simple checkbox, a lightweight AI model detects and blurs faces automatically (Strong 30px blur).
- **Supported Formats**: Supports all standard formats (JPEG, PNG, WebP) as well as Apple's **HEIC** format (via secure automatic conversion).
- **Ninja Inspection**: Zoom (x10) and pan functionality on the preview to verify details before confirms.
- **Privacy Indicators**: Contextual alert icons (🛰️ GPS, 📷 Device, 🕒 Date) appear if sensitive data is detected in the original file.
- **100% Local (Client-Side)**: No images are ever uploaded to the cloud for processing. Everything happens on your local machine, ensuring absolute privacy.

## 🛡️ Privacy & Data Handling

This extension is built with a **zero-persistence** policy:
- **RAM-Only Processing**: All image transformations (face detection, EXIF stripping) occur in the browser's volatile memory (RAM).
- **No Disk Storage**: No temporary files are ever written to your hard drive. 
- **Automatic Cleanup**: Once you close the extension overlay or navigate away, the processed image data is marked for garbage collection and wiped from memory.
- **Zero-Cloud**: Neither the original image nor the anonymized version is ever sent to any third-party server by the extension itself.

## 🚀 Local Installation (Developer Mode)

1. Clone this repository to your machine:
   ```bash
   git clone https://github.com/girard-xyz/unexposed.git
   cd image-processor-ext
   ```
2. Open Google Chrome and navigate to: `chrome://extensions/`
3. Enable **Developer mode** via the toggle in the top right corner.
4. Click the **Load unpacked** button.
5. Select the folder containing this `README.md` file.

The extension is installed and ready for testing! 🎉

## 🛠️ Architecture

The extension uses **Manifest V3**:
- **`content.js`**: Monitors the DOM of visited sites. When an `<input type="file">` is detected, it injects the "🥷" processing button.
- **`overlay/`**: Isolated user interface (via Iframe) to avoid breaking the host page's CSS, featuring a clean design inspired by Glassmorphism.
- **ML Model**: The `face-api.js` framework (`tiny_face_detector`) is used to locate faces. The neural network weights (`.bin`) are approximately 1.3MB and are included natively in the extension assets.
- **HEIC Sandbox**: A dedicated sandboxed environment to handle HEIC to JPEG conversion safely while respecting strict Content Security Policies.

## 📜 License

MIT License. Feel free to fork and contribute.
