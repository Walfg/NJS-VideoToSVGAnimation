const express = require('express');
const multer = require('multer');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const archiver = require('archiver');
const extract = require('extract-zip');

const app = express();
const upload = multer({ dest: 'uploads/' });

const framesDir = path.join(__dirname, 'frames');
const svgBaseDir = path.join(__dirname, 'svg_videos');

if (!fs.existsSync(framesDir)) fs.mkdirSync(framesDir);
if (!fs.existsSync(svgBaseDir)) fs.mkdirSync(svgBaseDir);

fs.readdir(framesDir, (err, files) => {
  if (err) {
    console.error('Error reading frames directory:', err);
  } else {
    files.forEach(file => {
      fs.unlink(path.join(framesDir, file), err => {
        if (err) console.error(`Error deleting frame file ${file}:`, err);
      });
    });
    console.log('All frame files deleted.');
  }
});

app.use(express.static('public'));

app.post('/upload', upload.single('video'), (req, res) => {
  const videoPath = req.file.path;
  const frameSkip = parseInt(req.body.frameSkip, 10);
  const videoId = uuidv4();
  const svgDir = path.join(svgBaseDir, videoId);
  const fpsFile = path.join(svgDir, 'fps.txt');

  if (!fs.existsSync(svgDir)) fs.mkdirSync(svgDir);

  exec(`ffmpeg -i ${videoPath} -vf "select=not(mod(n\\,${frameSkip}))" -vsync vfr ${framesDir}/frame_%04d.bmp`, (err, stdout, stderr) => {
    if (err) {
      console.error('Error extracting frames:', err);
      res.status(500).send('Error extracting frames');
      return;
    }

    const fpsMatch = stderr.match(/, (\d+(\.\d+)?) fps,/);
    const fps = fpsMatch ? parseFloat(fpsMatch[1]) : 24;

    fs.writeFileSync(fpsFile, fps.toString());

    fs.readdir(framesDir, (err, files) => {
      if (err) {
        console.error('Error reading frames directory:', err);
        res.status(500).send('Error reading frames directory');
        return;
      }

      let totalFiles = files.length;
      let processedFiles = 0;

      let svgConversionPromises = files.map((file, index) => {
        return new Promise((resolve, reject) => {
          const inputFile = path.join(framesDir, file);
          const outputFile = path.join(svgDir, `frame_${String(index).padStart(4, '0')}.svg`);
          exec(`potrace -s -o ${outputFile} ${inputFile}`, (err) => {
            if (err) {
              console.error(`Error converting ${inputFile} to SVG:`, err);
              reject(err);
            } else {
              fs.readFile(outputFile, 'utf8', (err, data) => {
                if (err) {
                  console.error(`Error reading ${outputFile}:`, err);
                  reject(err);
                } else if (data.trim() === '') {
                  fs.unlink(outputFile, (err) => {
                    if (err) console.error(`Error deleting empty file ${outputFile}:`, err);
                    resolve();
                  });
                } else {
                  resolve();
                }
              });
            }
          });
        }).finally(() => {
          processedFiles++;
          const progress = (processedFiles / totalFiles) * 100;
          res.write(`data: {"progress":${progress},"message":"Converting to SVG"}\n\n`);
        });
      });

      Promise.all(svgConversionPromises)
        .then(() => {
          fs.readdir(framesDir, (err, files) => {
            if (err) {
              console.error('Error reading frames directory for deletion:', err);
            } else {
              files.forEach(file => {
                fs.unlink(path.join(framesDir, file), err => {
                  if (err) console.error(`Error deleting frame file ${file}:`, err);
                });
              });
            }
          });
          res.write(`data: {"progress":100,"message":"Frames converted to SVG successfully", "videoId": "${videoId}"}\n\n`);
          res.end();
        })
        .catch(err => {
          console.error('Error converting frames to SVG:', err);
          res.write(`data: {"progress":100,"message":"Error converting frames to SVG"}\n\n`);
          res.end();
        });
    });
  });
});

app.post('/upload-zip', upload.single('svgZip'), async (req, res) => {
  const zipPath = req.file.path;
  const videoId = uuidv4();
  const svgDir = path.join(svgBaseDir, videoId);

  if (!fs.existsSync(svgDir)) fs.mkdirSync(svgDir);

  try {
    await extract(zipPath, { dir: svgDir });

    fs.readdir(svgDir, (err, files) => {
      if (err) {
        console.error('Error reading SVG directory:', err);
        res.status(500).send('Error reading SVG directory');
        return;
      }

      const validFiles = files.filter(file => path.extname(file).toLowerCase() === '.svg');

      if (validFiles.length === 0) {
        res.status(400).send('No valid SVG files found in the ZIP');
        return;
      }

      res.write(`data: {"progress":100,"message":"SVGs uploaded successfully", "videoId": "${videoId}"}\n\n`);
      res.end();
    });
  } catch (err) {
    console.error('Error extracting ZIP:', err);
    res.status(500).send('Error extracting ZIP');
  }
});

app.use('/svg', express.static(svgBaseDir));

app.get('/svg/:videoId', (req, res) => {
  const svgDir = path.join(svgBaseDir, req.params.videoId);
  fs.readdir(svgDir, (err, files) => {
    if (err) {
      console.error('Error reading SVG directory:', err);
      return res.status(500).send('Error reading SVG directory');
    }
    files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
    res.json(files);
  });
});

app.get('/svg/:videoId/fps.txt', (req, res) => {
  const fpsFile = path.join(svgBaseDir, req.params.videoId, 'fps.txt');
  if (fs.existsSync(fpsFile)) {
    res.sendFile(fpsFile);
  } else {
    res.status(404).send('FPS file not found');
  }
});

app.get('/download/:videoId', (req, res) => {
  const svgDir = path.join(svgBaseDir, req.params.videoId);
  const zipFilePath = path.join(svgBaseDir, `${req.params.videoId}.zip`);

  const output = fs.createWriteStream(zipFilePath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });

  output.on('close', function() {
    console.log(archive.pointer() + ' total bytes');
    res.download(zipFilePath);
  });

  archive.on('error', function(err) {
    throw err;
  });

  archive.pipe(output);

  archive.directory(svgDir, false);

  archive.finalize();
});

app.listen(3000, () => {
  console.log('Server started on http://localhost:3000');
});
