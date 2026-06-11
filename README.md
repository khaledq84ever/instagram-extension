# InstaGet — Instagram Downloader

> Browser extension to download Instagram posts, Reels, and images — fast, watermark-free, with one click.

<p align="center">
  <img src="assets/icon-128.png" width="96" alt="InstaGet icon" />
</p>

<p align="center">
  <a href="https://github.com/khaledq84ever/instagram-extension/releases/latest"><img src="https://img.shields.io/github/v/release/khaledq84ever/instagram-extension?label=version&color=DD2A7B" alt="Latest release"/></a>
  <img src="https://img.shields.io/badge/Manifest-V3-DD2A7B" alt="Manifest V3" />
  <img src="https://img.shields.io/badge/Chrome%20%7C%20Edge%20%7C%20Firefox-supported-DD2A7B" alt="Supported browsers" />
  <img src="https://img.shields.io/badge/WCAG-AA-10B981" alt="WCAG AA verified" />
</p>

---

## 🌐 Website

No extension needed — use it straight from the browser:

**https://sunny-creation-production-05bc.up.railway.app**

Paste any Instagram link → download videos, Reels, and images.

Get this extension (and its siblings for YouTube, Twitter, Instagram, TikTok) from the download hub: **https://getpack-production.up.railway.app**

## Features

- **Auto download buttons** on every post and Reel while you browse Instagram
- **Right-click any link** → "Download with InstaGet"
- **Paste any URL** into the popup as a fallback
- **Settings drawer**: in-page toggle, custom filename template, default action
- **API status pill** shows backend health (online / slow / offline)
- **Light + dark mode** (auto-follows your OS)
- **Full keyboard navigation** and screen-reader labels
- **Zero build step** — pure vanilla JS + CSS

## Install (Developer Mode)

1. Download the latest release zip from [Releases](https://github.com/khaledq84ever/instagram-extension/releases/latest) **or** `git clone` this repo
2. Open `chrome://extensions` (Chrome / Edge / Brave) or `about:debugging` (Firefox)
3. Enable **Developer mode**
4. Click **Load unpacked** → pick the extension folder

Works on Chrome 109+, Edge 109+, Firefox 121+, Brave, Opera, and any other Chromium-based browser.

## Tech

| Layer | Used |
|---|---|
| Spec | Manifest V3 |
| UI | Vanilla HTML / CSS / ES modules (no build) |
| Fonts | Inter Variable + Space Grotesk (Google Fonts) |
| Backend | [`sunny-creation-production-05bc.up.railway.app`](https://sunny-creation-production-05bc.up.railway.app) — Flask + yt-dlp |
| A11y | WCAG AA contrast verified, `prefers-reduced-motion` respected |

## Filename templates

In the settings drawer, customize how downloads are named:

```
{uploader}_{title}     →  natgeo_Sunrise_Over_Sahara
{title}                →  Sunrise_Over_Sahara
{uploader}_{id}        →  natgeo_1748293
```

## Credits

Programmed by **[@KhaledQ84Ever](https://x.com/KhaledQ84Ever)** · made with ♥ in Kuwait
