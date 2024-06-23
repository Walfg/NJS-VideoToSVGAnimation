document.getElementById('uploadForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = new FormData(this);
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = '0%';
  progressBar.style.backgroundColor = 'blue';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload', true);

  xhr.upload.onprogress = function(event) {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      progressBar.style.width = `${percentComplete}%`;
    }
  };

  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
      const lines = xhr.responseText.trim().split('\n');
      lines.forEach(line => {
        if (line.startsWith('data:')) {
          const data = JSON.parse(line.replace('data: ', ''));
          if (data.progress <= 50) {
            progressBar.style.backgroundColor = 'blue';
            progressBar.style.width = `${data.progress}%`;
          } else {
            progressBar.style.backgroundColor = 'green';
            progressBar.style.width = `${data.progress}%`;
          }
          if (data.progress >= 100 && data.videoId) {
            displaySVGAnimation(data.videoId);
            enableDownloadButton(data.videoId);
          }
        }
      });
    }
  };

  xhr.send(formData);
});

document.getElementById('uploadZipForm').addEventListener('submit', function(event) {
  event.preventDefault();

  const formData = new FormData(this);
  const progressBar = document.getElementById('progress-bar');
  progressBar.style.width = '0%';
  progressBar.style.backgroundColor = 'blue';

  const xhr = new XMLHttpRequest();
  xhr.open('POST', '/upload-zip', true);

  xhr.upload.onprogress = function(event) {
    if (event.lengthComputable) {
      const percentComplete = (event.loaded / event.total) * 100;
      progressBar.style.width = `${percentComplete}%`;
    }
  };

  xhr.onreadystatechange = function() {
    if (xhr.readyState === XMLHttpRequest.LOADING || xhr.readyState === XMLHttpRequest.DONE) {
      const lines = xhr.responseText.trim().split('\n');
      lines.forEach(line => {
        if (line.startsWith('data:')) {
          const data = JSON.parse(line.replace('data: ', ''));
          if (data.progress <= 50) {
            progressBar.style.backgroundColor = 'blue';
            progressBar.style.width = `${data.progress}%`;
          } else {
            progressBar.style.backgroundColor = 'green';
            progressBar.style.width = `${data.progress}%`;
          }
          if (data.progress >= 100 && data.videoId) {
            displaySVGAnimation(data.videoId);
            enableDownloadButton(data.videoId);
          }
        }
      });
    }
  };

  xhr.send(formData);
});

let isPaused = false;
let currentFrame = 0;
let frames = [];
let animationFrameId;
let originalFps = 24;
let unlockFramerate = false;

document.getElementById('unlockFramerate').addEventListener('change', function() {
  unlockFramerate = this.checked;
});

function displaySVGAnimation(videoId) {
  fetch(`/svg/${videoId}`)
    .then(response => response.json())
    .then(files => {
      const container = document.getElementById('animation-container');
      container.innerHTML = '';
      frames = files.filter(file => file.trim() !== '').map(file => {
        const img = document.createElement('img');
        img.src = `/svg/${videoId}/${file}`;
        img.style.display = 'none';
        container.appendChild(img);
        return img;
      });

      fetch(`/svg/${videoId}/fps.txt`)
        .then(response => response.text())
        .then(fpsText => {
          originalFps = parseFloat(fpsText) || 24;
          document.getElementById('pauseButton').style.display = 'block';
          currentFrame = 0; 
          isPaused = false;
          animateSVGs();
        });
    });
}

function animateSVGs() {
  if (!isPaused && frames.length > 0) {
    frames.forEach(frame => frame.style.display = 'none');
    frames[currentFrame].style.display = 'block';
    currentFrame = (currentFrame + 1) % frames.length;
    const interval = unlockFramerate ? 1000 / 60 : 1000 / originalFps;
    animationFrameId = setTimeout(animateSVGs, interval);
  }
}

document.getElementById('pauseButton').addEventListener('click', function() {
  if (isPaused) {
    isPaused = false;
    animateSVGs();
  } else {
    isPaused = true;
    clearTimeout(animationFrameId);
  }
  this.textContent = isPaused ? 'Resume' : 'Pause';
});

function enableDownloadButton(videoId) {
  const downloadButton = document.getElementById('downloadButton');
  downloadButton.disabled = false;
  downloadButton.onclick = function() {
    window.location.href = `/download/${videoId}`;
  };
}
