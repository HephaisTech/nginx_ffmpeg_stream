const express = require("express");
const path = require("path");
const fs = require("fs");
const ffmpeg = require("fluent-ffmpeg");
const os = require("os");

const app = express();
const VIDEOS_DIR =
  process.env.VIDEOS_DIR || path.join(os.homedir(), "Downloads");
const HLS_DIR = path.join(__dirname, "hls");
const PORT = 3000;

if (!fs.existsSync(HLS_DIR)) fs.mkdirSync(HLS_DIR, { recursive: true });

app.use(express.static("public"));

app.get("/api/videos", (req, res) => {
  const files = fs
    .readdirSync(VIDEOS_DIR)
    .filter((f) => /\.(mp4|mkv|avi|mov|webm)$/i.test(f));
  res.json(files);
});

app.get("/api/stream/:file", (req, res) => {
  const file = req.params.file;
  const input = path.join(VIDEOS_DIR, file);
  if (!fs.existsSync(input)) return res.status(404).send("not found");

  const outDir = path.join(HLS_DIR, path.parse(file).name);
  const playlist = path.join(outDir, "index.m3u8");

  if (fs.existsSync(playlist))
    return res.json({ url: `/hls/${path.parse(file).name}/index.m3u8` });

  fs.mkdirSync(outDir, { recursive: true });

  ffmpeg(input)
    .outputOptions([
      "-c:v libx264",
      "-preset veryfast",
      "-crf 23",
      "-c:a aac",
      "-b:a 128k",
      "-hls_time 6",
      "-hls_playlist_type vod",
      "-hls_segment_filename",
      path.join(outDir, "seg_%03d.ts"),
    ])
    .output(playlist)
    .on("end", () =>
      res.json({ url: `/hls/${path.parse(file).name}/index.m3u8` }),
    )
    .on("error", (err) => res.status(500).send(err.message))
    .run();
});

app.use("/hls", express.static(HLS_DIR));

app.listen(PORT, () => console.log(`http://localhost:${PORT}`));
