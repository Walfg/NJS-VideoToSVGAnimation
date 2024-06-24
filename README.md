# Node.js Video to SVG Animation

This project allows you to convert videos to SVG animations. It includes functionality for uploading videos, converting frames to SVG, and playing the resulting SVG animations with options to pause, resume, and control the frame rate.

## Features

- Upload video and convert frames to SVG
- Upload a ZIP file containing SVGs to play SVG animations with pause and resume functionality
- Control frame rate with an option to unlock the frame rate for maximum FPS
- Download generated SVGs as a ZIP file

## Installation

### Prerequisites

- [Node.js](https://nodejs.org/) (version 14 or later)
- [FFmpeg](https://ffmpeg.org/download.html) (for extracting frames from videos)
- [potrace](http://potrace.sourceforge.net/#downloading) (for converting images to SVGs)


### Steps

1. Clone the repository:

```bash
git clone https://github.com/Walfg/NJS-VideoToSVGAnimation.git
cd NJS-VideoToSVGAnimation
```

2. Install the dependencies:
```bash
npm install
```

3. Ensure FFmpeg and potrace are installed and accessible in your system's PATH.
<br>You can install FFmpeg from [ffmpeg.org](http://ffmpeg.org) and potrace from [potrace.sourceforge.net](http://potrace.sourceforge.net).

## Usage

### Running the server
Start the server:
```bash
npm start
```

### Accessing the Application
Open your browser and navigate to http://localhost:3000.

## Dependencies
- express: ^4.17.1
- multer: ^1.4.2
- uuid: ^8.3.2
- archiver: ^5.3.0
- extract-zip: ^2.0.1

## License
This project is licensed under the MIT License.
