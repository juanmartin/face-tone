import * as faceapi from "face-api.js";
import { TINY_FACE_DETECTOR, isFaceDetectionModelLoaded, getFaceDetectorOptions, changeFaceDetector, changeInputSize } from "./faceDetectionControls";
import $ from "jquery";

let forwardTimes = [];
let withBoxes = true;

let connected = false;

const ws = new WebSocket("ws://127.0.01:9001");
ws.addEventListener('open', () => {
  connected = true;
  console.log("connected");
});
const send = (data) => {
  if (connected) {
    ws.send(JSON.stringify(data));
  }
}

export function onChangeHideBoundingBoxes(e) {
  withBoxes = !$(e.target).prop("checked");
}

export function updateTimeStats(timeInMs) {
  forwardTimes = [timeInMs].concat(forwardTimes).slice(0, 30);
  const avgTimeInMs =
    forwardTimes.reduce((total, t) => total + t) / forwardTimes.length;
  $("#time").val(`${Math.round(avgTimeInMs)} ms`);
  $("#fps").val(`${faceapi.utils.round(1000 / avgTimeInMs)}`);
}

export async function onPlay() {
  const videoEl = $("#inputVideo").get(0);

  if (videoEl.paused || videoEl.ended || !isFaceDetectionModelLoaded())
    return setTimeout(() => onPlay());

  const options = getFaceDetectorOptions();

  const ts = Date.now();

  const result = await faceapi
    .detectSingleFace(videoEl, options)
    .withFaceLandmarks();

  updateTimeStats(Date.now() - ts);

  if (result) {
    // Canvas
    const canvas = $("#overlay").get(0);
    const dims = faceapi.matchDimensions(canvas, videoEl, true);
    const resizedResult = faceapi.resizeResults(result, dims);

    if (withBoxes) {
      faceapi.draw.drawDetections(canvas, resizedResult);
    }
    faceapi.draw.drawFaceLandmarks(canvas, resizedResult);

    // Mouth Data sent to pd
    const mouth = result.landmarks.getMouth();
    send(mouth);
  }

  setTimeout(() => onPlay());
}

export async function run() {
  // load face detection and face landmark models
  await changeFaceDetector(TINY_FACE_DETECTOR);
  await faceapi.loadFaceLandmarkModel("/");
  changeInputSize(224);

  // try to access users webcam and stream the images
  // to the video element
  const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
  const videoEl = $("#inputVideo").get(0);
  videoEl.srcObject = stream;
}

export function updateResults() { }

$(document).ready(function () {
  run();
});
