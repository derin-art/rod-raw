import { useCursor, useTexture } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useAtom } from "jotai";
import { easing } from "maath";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Bone,
  BoxGeometry,
  CanvasTexture,
  Color,
  Float32BufferAttribute,
  MathUtils,
  MeshLambertMaterial,
  MeshStandardMaterial,
  RepeatWrapping,
  Skeleton,
  SkinnedMesh,
  SRGBColorSpace,
  Uint16BufferAttribute,
  Vector3,
} from "three";
import { degToRad } from "three/src/math/MathUtils.js";
import { pageAtom, pages, pictures } from "./UI";

const easingFactor = 0.5; // Controls the speed of the easing
const easingFactorFold = 0.3; // Controls the speed of the easing
const insideCurveStrength = 0.18; // Controls the strength of the curve
const outsideCurveStrength = 0.05; // Controls the strength of the curve
const turningCurveStrength = 0.09; // Controls the strength of the curve

const PAGE_WIDTH = 1.28;
const PAGE_HEIGHT = 1.28 * (655 / 495); // 495x655 aspect ratio
const PAGE_DEPTH = 0.003;
const PAGE_SEGMENTS = 30;
const SEGMENT_WIDTH = PAGE_WIDTH / PAGE_SEGMENTS;

const pageGeometry = new BoxGeometry(
  PAGE_WIDTH,
  PAGE_HEIGHT,
  PAGE_DEPTH,
  PAGE_SEGMENTS,
  2
);

pageGeometry.translate(PAGE_WIDTH / 2, 0, 0);

const position = pageGeometry.attributes.position;
const vertex = new Vector3();
const skinIndexes = [];
const skinWeights = [];

for (let i = 0; i < position.count; i++) {
  // ALL VERTICES
  vertex.fromBufferAttribute(position, i); // get the vertex
  const x = vertex.x; // get the x position of the vertex

  const skinIndex = Math.max(0, Math.floor(x / SEGMENT_WIDTH)); // calculate the skin index
  let skinWeight = (x % SEGMENT_WIDTH) / SEGMENT_WIDTH; // calculate the skin weight

  skinIndexes.push(skinIndex, skinIndex + 1, 0, 0); // set the skin indexes
  skinWeights.push(1 - skinWeight, skinWeight, 0, 0); // set the skin weights
}

pageGeometry.setAttribute(
  "skinIndex",
  new Uint16BufferAttribute(skinIndexes, 4)
);
pageGeometry.setAttribute(
  "skinWeight",
  new Float32BufferAttribute(skinWeights, 4)
);

const whiteColor = new Color("white");
const emissiveColor = new Color("orange");

const pageMaterials = [
  new MeshLambertMaterial({
    color: whiteColor,
  }),
  new MeshLambertMaterial({
    color: "#111",
  }),
  new MeshLambertMaterial({
    color: whiteColor,
  }),
  new MeshLambertMaterial({
    color: whiteColor,
  }),
];

export const getImagePath = (name) => {
  if (name === "book-cover") {
    return `/images/photos/book/front.png`;
  }
  if (name === "book-back" || name === "book-cover-roughness") {
    return `/textures/${name}.jpg`;
  }
  return `/images/photos/${name}.png`;
};

// pages.forEach((page) => {
//   useTexture.preload(getImagePath(page.front));
//   useTexture.preload(getImagePath(page.back));
//   useTexture.preload(getImagePath("book-cover-roughness"));
// });

const useMagazineTexture = (number, face, animationType, imageName, isVisible) => {
  const [texture, setTexture] = useState(null);
  const canvasRef = useRef(null);
  const [img, setImg] = useState(null);
  const [imgSec, setImgSec] = useState(null);
  const [imgTer, setImgTer] = useState(null);
  const [imgQuad, setImgQuad] = useState(null);

  const isAnimated = animationType === "bounce" || animationType === "spin" || animationType === "wave";

  // Preload photograph image and its adjacent photos for grid layouts immediately
  useEffect(() => {
    if (isAnimated || !imageName || imageName === "book-cover" || imageName === "book-back") {
      setImg(null);
      setImgSec(null);
      setImgTer(null);
      setImgQuad(null);
      return;
    }

    // Load Primary
    const image = new Image();
    image.src = getImagePath(imageName);
    image.onload = () => setImg(image);
    image.onerror = () => setImg(null);

    // Look up current index in the pictures array to get actual files
    const idx = pictures.indexOf(imageName);
    if (idx !== -1) {
      // Secondary (Next image in array)
      const secName = pictures[(idx + 1) % pictures.length];
      const secImage = new Image();
      secImage.src = getImagePath(secName);
      secImage.onload = () => setImgSec(secImage);
      secImage.onerror = () => setImgSec(null);

      // Tertiary (Previous image in array)
      const terName = pictures[(idx - 1 + pictures.length) % pictures.length];
      const terImage = new Image();
      terImage.src = getImagePath(terName);
      terImage.onload = () => setImgTer(terImage);
      terImage.onerror = () => setImgTer(null);

      // Quad (Next + 2 image in array)
      const quadName = pictures[(idx + 2) % pictures.length];
      const quadImage = new Image();
      quadImage.src = getImagePath(quadName);
      quadImage.onload = () => setImgQuad(quadImage);
      quadImage.onerror = () => setImgQuad(null);
    }
  }, [imageName, isAnimated]);

  // Allocate canvas & WebGL texture exactly once on mount to prevent page-turn lag
  useEffect(() => {
    const canvas = document.createElement("canvas");
    if (isAnimated) {
      // 1980x2620 texture grid for 4x4 frames of 495x655 aspect ratio
      canvas.width = 1980;
      canvas.height = 2620;
    } else {
      // 990x1310 static canvas (double 495x655 for crisp retina resolutions)
      canvas.width = 990;
      canvas.height = 1310;
    }
    canvasRef.current = canvas;

    const tex = new CanvasTexture(canvas);
    tex.colorSpace = SRGBColorSpace;
    
    if (isAnimated) {
      tex.repeat.set(0.25, 0.25);
    } else {
      tex.repeat.set(1.0, 1.0);
    }

    setTexture(tex);

    // Bake all 16 animation frames onto the grid immediately on startup
    if (isAnimated) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        const cols = 4;
        const cellW = 495;
        const cellH = 655;

        for (let f = 0; f < 16; f++) {
          const col = f % cols;
          const row = Math.floor(f / cols);
          const startX = col * cellW;
          const startY = row * cellH;

          // Warm paper background inside cell
          ctx.fillStyle = "#faf6eb";
          ctx.fillRect(startX, startY, cellW, cellH);

          // Elegant frame border
          ctx.strokeStyle = "rgba(138, 123, 106, 0.35)";
          ctx.lineWidth = 10;
          ctx.strokeRect(startX + 20, startY + 20, cellW - 40, cellH - 40);

          if (animationType === "bounce") {
            ctx.fillStyle = "#8a7b6a";
            ctx.font = "bold 24px 'Poppins', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("BOUNCING BALL", startX + cellW / 2, startY + cellH * 0.18);
            ctx.font = "14px 'Poppins', sans-serif";
            ctx.fillText("GPU Sprite Sheet Loop", startX + cellW / 2, startY + cellH * 0.25);

            const radius = 35;
            const t = f / 16;
            const bounceHeight = Math.abs(Math.sin(t * Math.PI)) * (cellH - 180);
            const ballY = startY + cellH - 80 - bounceHeight;
            const ballX = startX + cellW / 2;

            const shadowScale = 1.0 - (bounceHeight / (cellH - 180)) * 0.7;
            ctx.beginPath();
            ctx.ellipse(ballX, startY + cellH - 80, radius * shadowScale, radius * 0.25 * shadowScale, 0, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(0, 0, 0, 0.15)";
            ctx.fill();

            const grad = ctx.createRadialGradient(ballX - 10, ballY - 10, 5, ballX, ballY, radius);
            grad.addColorStop(0, "#ff8888");
            grad.addColorStop(1, "#cc2222");

            ctx.beginPath();
            ctx.arc(ballX, ballY, radius, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();

          } else if (animationType === "spin") {
            const cx = startX + cellW / 2;
            const cy = startY + cellH / 2 + 50;
            const R1 = 120;
            const R2 = 50;
            const rotationAngle = (f / 16) * Math.PI * 2;

            ctx.save();
            ctx.translate(cx, cy);
            ctx.rotate(rotationAngle);

            ctx.beginPath();
            for (let k = 0; k < 20; k++) {
              const a = (k / 20) * Math.PI * 2;
              const r = k % 2 === 0 ? R1 : R2;
              if (k === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
              else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
            }
            ctx.closePath();

            const grad = ctx.createLinearGradient(-R1, -R1, R1, R1);
            grad.addColorStop(0, "#ffd700");
            grad.addColorStop(0.5, "#ff8800");
            grad.addColorStop(1, "#d4af37");

            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = "#8b5cf6";
            ctx.lineWidth = 4;
            ctx.stroke();
            ctx.restore();

            ctx.fillStyle = "#8a7b6a";
            ctx.font = "bold 24px 'Poppins', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("ROTATING ROSETTE", startX + cellW / 2, startY + cellH * 0.18);
            ctx.font = "14px 'Poppins', sans-serif";
            ctx.fillText("Smooth GPU Offset Shift", startX + cellW / 2, startY + cellH * 0.25);

          } else if (animationType === "wave") {
            ctx.strokeStyle = "#10b981";
            ctx.lineWidth = 5;
            ctx.beginPath();
            const waveShift = (f / 16) * Math.PI * 2;
            for (let x = 40; x < cellW - 40; x++) {
              const y = startY + cellH / 2 + 65 + Math.sin(x * 0.025 + waveShift) * 60;
              if (x === 40) ctx.moveTo(startX + x, y);
              else ctx.lineTo(startX + x, y);
            }
            ctx.stroke();

            for (let i = 0; i < 5; i++) {
              const partX = 80 + i * (cellW - 160) / 4;
              const partY = startY + cellH / 2 + 65 + Math.sin(partX * 0.025 + waveShift) * 60;
              ctx.beginPath();
              ctx.arc(startX + partX, partY, 15, 0, Math.PI * 2);
              ctx.fillStyle = "#3b82f6";
              ctx.fill();
            }

            ctx.fillStyle = "#8a7b6a";
            ctx.font = "bold 24px 'Poppins', sans-serif";
            ctx.textAlign = "center";
            ctx.fillText("WAVE SIMULATOR", startX + cellW / 2, startY + cellH * 0.2);
            ctx.font = "14px 'Poppins', sans-serif";
            ctx.fillText("GPU Vertex UV Wave", startX + cellW / 2, startY + cellH * 0.27);
          }
        }
        tex.needsUpdate = true;
      }
    }

    return () => {
      tex.dispose();
    };
  }, [isAnimated, animationType]);

  // Helper text wrapping function
  const wrapText = (ctx, text, x, y, maxWidth, lineHeight) => {
    const words = text.split(" ");
    let line = "";
    let currentY = y;

    for (let n = 0; n < words.length; n++) {
      const testLine = line + words[n] + " ";
      const testWidth = ctx.measureText(testLine).width;
      if (testWidth > maxWidth && n > 0) {
        ctx.fillText(line, x, currentY);
        line = words[n] + " ";
        currentY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, currentY);
    return currentY;
  };

  // Render static album pages ONCE on load (0% frame overhead during page turns)
  useEffect(() => {
    if (isAnimated || !texture || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const W = canvas.width;
    const H = canvas.height;
    const pageNum = number * 2 + (face === "front" ? 1 : 0);

    // Warm paper background
    ctx.fillStyle = "#faf6eb";
    ctx.fillRect(0, 0, W, H);

    // Elegant thin layout margins
    ctx.strokeStyle = "rgba(138, 123, 106, 0.2)";
    ctx.lineWidth = 2;
    ctx.strokeRect(50, 50, W - 100, H - 100);

    // Editorial Header (Clean & Small)
    ctx.fillStyle = "rgba(138, 123, 106, 0.75)";
    ctx.font = "bold 13px 'Poppins', sans-serif";
    ctx.textAlign = "left";
    ctx.fillText("PORTFOLIO ARCHIVE  //  VOL. 26", 75, 85);
    ctx.textAlign = "right";
    ctx.fillText("INDEX " + number.toString().padStart(2, '0'), W - 75, 85);

    // Footer Page Number
    ctx.fillStyle = "rgba(138, 123, 106, 0.6)";
    ctx.textAlign = face === "front" ? "right" : "left";
    ctx.fillText("P. " + pageNum.toString().padStart(3, '0'), face === "front" ? W - 75 : 75, H - 75);

    if (face === "back") {
      // LEFT PAGES (Back Face)
      if (number === 1) {
        // 1. 2x2 Photo Grid
        const cellW = 410;
        const cellH = 470;

        // Top Left
        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.strokeRect(75, 130, cellW, cellH);
        if (img) ctx.drawImage(img, 75, 130, cellW, cellH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 130, cellW, cellH); }
        ctx.fillStyle = "rgba(138, 123, 106, 0.8)";
        ctx.font = "bold 10px 'Poppins', sans-serif";
        ctx.fillText("PLATE 01.A", 75, 630);

        // Top Right
        ctx.strokeRect(525, 130, cellW + 14, cellH);
        if (imgSec) ctx.drawImage(imgSec, 525, 130, cellW + 14, cellH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(525, 130, cellW + 14, cellH); }
        ctx.fillText("PLATE 01.B", 525, 630);

        // Bottom Left
        ctx.strokeRect(75, 670, cellW, cellH);
        if (imgTer) ctx.drawImage(imgTer, 75, 670, cellW, cellH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 670, cellW, cellH); }
        ctx.fillText("PLATE 01.C", 75, 1170);

        // Bottom Right
        ctx.strokeRect(525, 670, cellW + 14, cellH);
        if (imgQuad) ctx.drawImage(imgQuad, 525, 670, cellW + 14, cellH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(525, 670, cellW + 14, cellH); }
        ctx.fillText("PLATE 01.D", 525, 1170);

      } else if (number === 2) {
        // 2. 3-Column Vertical Strips
        const colW = 260;
        const colH = 920;
        const colY = 130;

        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;

        // Column 1
        ctx.strokeRect(75, colY, colW, colH);
        if (img) ctx.drawImage(img, 75, colY, colW, colH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, colY, colW, colH); }
        ctx.fillStyle = "#2c241e";
        ctx.font = "bold 11px 'Poppins', sans-serif";
        ctx.fillText("01 // ELEVATION", 75, 1100);

        // Column 2
        ctx.strokeRect(382, colY, colW, colH);
        if (imgSec) ctx.drawImage(imgSec, 382, colY, colW, colH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(382, colY, colW, colH); }
        ctx.fillText("02 // STRUCTURE", 382, 1100);

        // Column 3
        ctx.strokeRect(689, colY, colW, colH);
        if (imgTer) ctx.drawImage(imgTer, 689, colY, colW, colH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(689, colY, colW, colH); }
        ctx.fillText("03 // DEPTH", 689, 1100);

        ctx.fillStyle = "rgba(138, 123, 106, 0.85)";
        ctx.font = "italic 11px 'Poppins', sans-serif";
        ctx.fillText("Sequential geometric snapshots exploring structural limits.", 75, 1135);

      } else if (number === 3) {
        // 3. Dual Horizontal Stack
        const rowW = 874;
        const rowH = 470;

        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;

        // Top Row
        ctx.strokeRect(75, 130, rowW, rowH);
        if (img) ctx.drawImage(img, 75, 130, rowW, rowH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 130, rowW, rowH); }
        ctx.fillStyle = "rgba(138, 123, 106, 0.8)";
        ctx.font = "bold 10px 'Poppins', sans-serif";
        ctx.fillText("HORIZON A // PRIMARY FOCUS", 75, 630);

        // Bottom Row
        ctx.strokeRect(75, 660, rowW, rowH);
        if (imgTer) ctx.drawImage(imgTer, 75, 660, rowW, rowH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 660, rowW, rowH); }
        ctx.fillText("HORIZON B // CONTEXT FILL", 75, 1160);

      } else if (number === 4) {
        // 4. Asymmetric Collage with Rotated Sidebar Text
        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;

        // Big Left Portrait Hero
        ctx.strokeRect(75, 130, 480, 970);
        if (img) ctx.drawImage(img, 75, 130, 480, 970);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 130, 480, 970); }

        // Stacked Right side photos
        ctx.strokeRect(585, 130, 364, 465);
        if (imgSec) ctx.drawImage(imgSec, 585, 130, 364, 465);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(585, 130, 364, 465); }

        ctx.strokeRect(585, 635, 364, 465);
        if (imgTer) ctx.drawImage(imgTer, 585, 635, 364, 465);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(585, 635, 364, 465); }

        // Rotated vertical header caption (Swiss look)
        ctx.save();
        ctx.translate(970, 130);
        ctx.rotate(Math.PI / 2);
        ctx.fillStyle = "rgba(138, 123, 106, 0.9)";
        ctx.font = "bold 11px 'Poppins', sans-serif";
        ctx.fillText("STAGGERED COLLAGE COMPOSITION // SPEC. 240B", 0, 0);
        ctx.restore();

        ctx.fillStyle = "rgba(138, 123, 106, 0.85)";
        ctx.font = "italic 11px 'Poppins', sans-serif";
        ctx.fillText("Asymmetric layout balance with staggered right-side modules.", 75, 1145);

      } else if (number === 5) {
        // 5. Circular Clipped Hero Photo
        ctx.save();
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 - 50, 380, 0, Math.PI * 2);
        ctx.clip();
        if (img) {
          ctx.drawImage(img, W / 2 - 380, H / 2 - 430, 760, 760);
        } else {
          ctx.fillStyle = "rgba(138, 123, 106, 0.05)";
          ctx.fill();
        }
        ctx.restore();

        ctx.strokeStyle = "rgba(138, 123, 106, 0.35)";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2 - 50, 382, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "#2c241e";
        ctx.textAlign = "center";
        ctx.font = "bold 15px 'Poppins', sans-serif";
        ctx.fillText("PLATE 05 // THE RADIAL AXIS", W / 2, 1080);
        ctx.fillStyle = "rgba(138, 123, 106, 0.85)";
        ctx.font = "italic 11px 'Poppins', sans-serif";
        ctx.fillText("Clipped boundary circles analyzing focal depth and center constraints.", W / 2, 1120);

      } else {
        // Default Left Page: Standard 2-Photo Editorial Layout
        const img1X = 75;
        const img1Y = 130;
        const img1W = 874;
        const img1H = 500;
        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(img1X, img1Y, img1W, img1H);

        if (img) ctx.drawImage(img, img1X, img1Y, img1W, img1H);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(img1X, img1Y, img1W, img1H); }

        const img2X = 75;
        const img2Y = 690;
        const img2W = 420;
        const img2H = 440;
        ctx.strokeRect(img2X, img2Y, img2W, img2H);

        if (imgTer) ctx.drawImage(imgTer, img2X, img2Y, img2W, img2H);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(img2X, img2Y, img2W, img2H); }

        ctx.fillStyle = "#2c241e";
        ctx.textAlign = "left";
        ctx.font = "bold 16px 'Poppins', sans-serif";
        ctx.fillText("EXHIBITION STUDY // SPATIAL ARCHITECTURE", 525, 715);

        ctx.strokeStyle = "#8a7b6a";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(525, 735);
        ctx.lineTo(W - 75, 735);
        ctx.stroke();

        ctx.fillStyle = "#3a3026";
        ctx.font = "12px/1.6 'Poppins', sans-serif";
        const description = "A continuous digital catalog analyzing lighting, structural depth, and material textures. Captured during real-time dynamic testing.";
        wrapText(ctx, description, 525, 765, 410, 20);

        ctx.fillStyle = "rgba(138, 123, 106, 0.8)";
        ctx.font = "italic 11px 'Poppins', sans-serif";
        ctx.fillText("Fig 02a: Perspective studies.", 75, 1195);
      }
    } else {
      // RIGHT PAGES (Front Face)
      if (number === 1) {
        // PROMOTION POSTER (Page 1 Front)
        
        // 1. Dark accent border
        ctx.strokeStyle = "#1a1510";
        ctx.lineWidth = 4;
        ctx.strokeRect(60, 60, W - 120, H - 120);

        // 2. Large Editorial Header
        ctx.fillStyle = "#1a1510";
        ctx.textAlign = "center";
        ctx.font = "bold 56px 'Playfair Display', 'Didot', 'Georgia', serif";
        ctx.fillText("T H E   G A L L E R Y", W / 2, 180);
        
        ctx.font = "italic 20px 'Playfair Display', Georgia, serif";
        ctx.fillText("A Real-Time Exhibition Catalog", W / 2, 225);

        // 3. Divider Line
        ctx.strokeStyle = "rgba(26, 21, 16, 0.25)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(150, 260);
        ctx.lineTo(W - 150, 260);
        ctx.stroke();

        // 4. Hero Photograph Placement
        const heroX = 120;
        const heroY = 300;
        const heroW = W - 240;
        const heroH = 500;
        
        ctx.strokeStyle = "#1a1510";
        ctx.lineWidth = 2;
        ctx.strokeRect(heroX, heroY, heroW, heroH);
        if (img) {
          ctx.drawImage(img, heroX, heroY, heroW, heroH);
        } else {
          ctx.fillStyle = "rgba(138, 123, 106, 0.05)";
          ctx.fillRect(heroX, heroY, heroW, heroH);
        }

        // 5. Promo Copy & Details
        ctx.fillStyle = "#1a1510";
        ctx.font = "bold 24px 'Poppins', sans-serif";
        ctx.fillText("PRE-ORDER NOW", W / 2, 870);
        
        ctx.font = "14px 'Poppins', sans-serif";
        ctx.fillStyle = "#5c4f43";
        ctx.fillText("Scan code or visit our website to secure your copy", W / 2, 905);

        // 6. Hardcover Specifications
        ctx.fillStyle = "#1a1510";
        ctx.font = "600 12px 'Poppins', sans-serif";
        ctx.fillText("HARDCOVER EDITION  //  240 PAGES  //  LUSTRE FINISH", W / 2, 960);
        ctx.font = "11px 'Poppins', sans-serif";
        ctx.fillStyle = "rgba(138, 123, 106, 0.8)";
        ctx.fillText("ISBN 978-3-16-148410-0  |  $55.00 USD", W / 2, 985);

        // 7. Procedural Barcode
        const barcodeX = W / 2 - 120;
        const barcodeY = 1040;
        const barcodeH = 80;
        ctx.fillStyle = "#1a1510";
        let currentBarX = barcodeX;
        const barPattern = [2, 1, 4, 1, 2, 3, 1, 2, 4, 1, 1, 2, 3, 1, 4, 2, 1, 3, 1, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 2, 1, 1];
        for (let b = 0; b < barPattern.length; b++) {
          const w = barPattern[b] * 2.5;
          if (b % 2 === 0) {
            ctx.fillRect(currentBarX, barcodeY, w, barcodeH);
          }
          currentBarX += w + 2;
        }
        
        ctx.font = "10px monospace";
        ctx.textAlign = "center";
        ctx.fillStyle = "#1a1510";
        ctx.fillText("0   12345   67890   5", W / 2, 1150);

        // 8. Purchase Seal/Stamp
        ctx.save();
        ctx.translate(W - 170, 350);
        ctx.rotate(-Math.PI / 12);
        ctx.strokeStyle = "#b91c1c";
        ctx.lineWidth = 3;
        ctx.strokeRect(-80, -25, 160, 50);
        ctx.fillStyle = "#b91c1c";
        ctx.font = "bold 16px 'Poppins', sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("LIMITED RUN", 0, 7);
        ctx.restore();

      } else if (number === 2) {
        // 1. Large Landscape Center Bleed with Eames Quote
        const bleedW = 874;
        const bleedH = 750;

        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(75, 220, bleedW, bleedH);
        if (img) ctx.drawImage(img, 75, 220, bleedW, bleedH);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 220, bleedW, bleedH); }

        ctx.fillStyle = "#2c241e";
        ctx.textAlign = "center";
        ctx.font = "italic 14px 'Poppins', sans-serif";
        ctx.fillText('"THE DETAILS ARE NOT THE DETAILS. THEY MAKE THE DESIGN."', W / 2, 1040);
        ctx.fillStyle = "rgba(138, 123, 106, 0.9)";
        ctx.font = "bold 11px 'Poppins', sans-serif";
        ctx.fillText("— CHARLES EAMES", W / 2, 1080);

      } else if (number === 4) {
        // 2. Swiss Design Catalog Grid (3 Photos & Index Table)
        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;

        // Top main horizontal
        ctx.strokeRect(75, 130, 530, 420);
        if (img) ctx.drawImage(img, 75, 130, 530, 420);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(75, 130, 530, 420); }

        // Stacked side panels
        ctx.strokeRect(635, 130, 314, 195);
        if (imgSec) ctx.drawImage(imgSec, 635, 130, 314, 195);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(635, 130, 314, 195); }

        ctx.strokeRect(635, 355, 314, 195);
        if (imgTer) ctx.drawImage(imgTer, 635, 355, 314, 195);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(635, 355, 314, 195); }

        // Switzerland Grid Details Table
        ctx.strokeStyle = "rgba(138, 123, 106, 0.4)";
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(75, 610);
        ctx.lineTo(W - 75, 610);
        ctx.moveTo(75, 1150);
        ctx.lineTo(W - 75, 1150);
        ctx.stroke();

        ctx.fillStyle = "#2c241e";
        ctx.textAlign = "left";
        ctx.font = "bold 12px 'Poppins', sans-serif";
        ctx.fillText("PROJECT CATALOG SUMMARY", 75, 650);

        // Column 1
        ctx.fillStyle = "rgba(138, 123, 106, 0.9)";
        ctx.font = "bold 10px 'Poppins', sans-serif";
        ctx.fillText("LOCATION:", 75, 700);
        ctx.fillText("YEAR:", 75, 800);
        ctx.fillText("PHASE:", 75, 900);

        ctx.fillStyle = "#3a3026";
        ctx.font = "12px 'Poppins', sans-serif";
        ctx.fillText("TOKYO, JAPAN", 75, 730);
        ctx.fillText("2026", 75, 830);
        ctx.fillText("PROTOTYPE DEVELOPMENT", 75, 930);

        // Column 2
        ctx.fillStyle = "rgba(138, 123, 106, 0.9)";
        ctx.font = "bold 10px 'Poppins', sans-serif";
        ctx.fillText("CLIENT:", 380, 700);
        ctx.fillText("CATEGORY:", 380, 800);
        ctx.fillText("COLLABORATOR:", 380, 900);

        ctx.fillStyle = "#3a3026";
        ctx.font = "12px 'Poppins', sans-serif";
        ctx.fillText("CREATIVE LABS CORP", 380, 730);
        ctx.fillText("3D RENDER EXHIBIT", 380, 830);
        ctx.fillText("DEEPMIND ANTIGRAVITY", 380, 930);

        // Column 3
        ctx.fillStyle = "rgba(138, 123, 106, 0.9)";
        ctx.font = "bold 10px 'Poppins', sans-serif";
        ctx.fillText("SOFTWARE:", 690, 700);
        ctx.fillText("API STACK:", 690, 800);
        ctx.fillText("ENGINE SPEED:", 690, 900);

        ctx.fillStyle = "#3a3026";
        ctx.font = "12px 'Poppins', sans-serif";
        ctx.fillText("THREE.JS / NODE.JS", 690, 730);
        ctx.fillText("REACT THREE FIBER", 690, 830);
        ctx.fillText("60 FPS TARGET (GPU ACCEL)", 690, 930);

      } else {
        // Default Right Page: Standard 3-Photo Album Grid
        const img1X = 75;
        const img1Y = 130;
        const img1W = 420;
        const img1H = 900;
        ctx.strokeStyle = "rgba(138, 123, 106, 0.3)";
        ctx.lineWidth = 1;
        ctx.strokeRect(img1X, img1Y, img1W, img1H);

        if (img) ctx.drawImage(img, img1X, img1Y, img1W, img1H);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(img1X, img1Y, img1W, img1H); }

        const img2X = 525;
        const img2Y = 130;
        const img2W = 424;
        const img2H = 435;
        ctx.strokeRect(img2X, img2Y, img2W, img2H);

        if (imgSec) ctx.drawImage(imgSec, img2X, img2Y, img2W, img2H);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(img2X, img2Y, img2W, img2H); }

        const img3X = 525;
        const img3Y = 595;
        const img3W = 424;
        const img3H = 435;
        ctx.strokeRect(img3X, img3Y, img3W, img3H);

        if (imgTer) ctx.drawImage(imgTer, img3X, img3Y, img3W, img3H);
        else { ctx.fillStyle = "rgba(138, 123, 106, 0.05)"; ctx.fillRect(img3X, img3Y, img3W, img3H); }

        ctx.fillStyle = "#2c241e";
        ctx.textAlign = "left";
        ctx.font = "bold 13px 'Poppins', sans-serif";
        ctx.fillText("GRID COMPOSITION // PLATES " + pageNum + "-" + (pageNum + 2), 75, 1090);

        ctx.fillStyle = "rgba(138, 123, 106, 0.85)";
        ctx.font = "italic 11px 'Poppins', sans-serif";
        ctx.fillText("Visual studies in geometric alignment and render balance.", 75, 1120);
      }
    }

    texture.needsUpdate = true;
  }, [texture, img, imgSec, imgTer, imgQuad, animationType, number, face, isAnimated]);

  // Run 100% GPU-driven UV offset shifting in useFrame
  useFrame((state) => {
    if (!isAnimated || !texture || !isVisible) return;

    const fps = 24;
    const totalFrames = 16;
    const currentFrame = Math.floor(state.clock.getElapsedTime() * fps) % totalFrames;

    const col = currentFrame % 4;
    const row = 3 - Math.floor(currentFrame / 4); // Y-axis is inverted in WebGL texture coords

    texture.offset.set(col * 0.25, row * 0.25);
  });



  return texture;
};

const Page = ({ number, front, back, page, opened, bookClosed, frontAnim, backAnim, ...props }) => {
  const [coverFront, coverBack, coverRoughness] = useTexture([
    getImagePath("book-cover"),
    getImagePath("book-back"),
    getImagePath("book-cover-roughness"),
  ]);
  coverFront.colorSpace = coverBack.colorSpace = SRGBColorSpace;

  const isVisible = page === number || page === number + 1;
  const frontAnimTexture = useMagazineTexture(number, "front", frontAnim, front, isVisible);
  const backAnimTexture = useMagazineTexture(number, "back", backAnim, back, isVisible);

  const group = useRef();
  const turnedAt = useRef(0);
  const lastOpened = useRef(opened);

  const skinnedMeshRef = useRef();

  const isFrontCover = number === 0;
  const isBackCover = number === pages.length - 1;

  const manualSkinnedMesh = useMemo(() => {
    const bones = [];
    for (let i = 0; i <= PAGE_SEGMENTS; i++) {
      let bone = new Bone();
      bones.push(bone);
      if (i === 0) {
        bone.position.x = 0;
      } else {
        bone.position.x = SEGMENT_WIDTH;
      }
      if (i > 0) {
        bones[i - 1].add(bone);
      }
    }
    const skeleton = new Skeleton(bones);

    const materials = [
      ...pageMaterials,
      new MeshLambertMaterial({
        color: whiteColor,
        map: isFrontCover ? coverFront : null,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
      new MeshLambertMaterial({
        color: whiteColor,
        map: isBackCover ? coverBack : null,
        emissive: emissiveColor,
        emissiveIntensity: 0,
      }),
    ];
    const mesh = new SkinnedMesh(pageGeometry, materials);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false;
    mesh.add(skeleton.bones[0]);
    mesh.bind(skeleton);
    return mesh;
  }, [coverFront, coverBack, isFrontCover, isBackCover]);

  useEffect(() => {
    if (!isFrontCover && frontAnimTexture && manualSkinnedMesh) {
      manualSkinnedMesh.material[4].map = frontAnimTexture;
      manualSkinnedMesh.material[4].needsUpdate = true;
    }
  }, [frontAnimTexture, manualSkinnedMesh, isFrontCover]);

  useEffect(() => {
    if (!isBackCover && backAnimTexture && manualSkinnedMesh) {
      manualSkinnedMesh.material[5].map = backAnimTexture;
      manualSkinnedMesh.material[5].needsUpdate = true;
    }
  }, [backAnimTexture, manualSkinnedMesh, isBackCover]);

  // useHelper(skinnedMeshRef, SkeletonHelper, "red");

  useFrame((_, delta) => {
    if (!skinnedMeshRef.current) {
      return;
    }

    const emissiveIntensity = 0;
    skinnedMeshRef.current.material[4].emissiveIntensity =
      skinnedMeshRef.current.material[5].emissiveIntensity = MathUtils.lerp(
        skinnedMeshRef.current.material[4].emissiveIntensity,
        emissiveIntensity,
        0.1
      );

    if (lastOpened.current !== opened) {
      turnedAt.current = +new Date();
      lastOpened.current = opened;
    }
    let turningTime = Math.min(400, new Date() - turnedAt.current) / 400;
    turningTime = Math.sin(turningTime * Math.PI);

    let targetRotation = opened ? -Math.PI / 2 : Math.PI / 2;
    if (!bookClosed) {
      targetRotation += degToRad(number * 0.8);
    }

    const bones = skinnedMeshRef.current.skeleton.bones;
    for (let i = 0; i < bones.length; i++) {
      const target = i === 0 ? group.current : bones[i];

      const insideCurveIntensity = i < 8 ? Math.sin(i * 0.2 + 0.25) : 0;
      const outsideCurveIntensity = i >= 8 ? Math.cos(i * 0.3 + 0.09) : 0;
      const turningIntensity =
        Math.sin(i * Math.PI * (1 / bones.length)) * turningTime;
      let rotationAngle =
        insideCurveStrength * insideCurveIntensity * targetRotation -
        outsideCurveStrength * outsideCurveIntensity * targetRotation +
        turningCurveStrength * turningIntensity * targetRotation;
      let foldRotationAngle = degToRad(Math.sign(targetRotation) * 2);
      if (bookClosed) {
        if (i === 0) {
          rotationAngle = targetRotation;
          foldRotationAngle = 0;
        } else {
          rotationAngle = 0;
          foldRotationAngle = 0;
        }
      }
      easing.dampAngle(
        target.rotation,
        "y",
        rotationAngle,
        easingFactor,
        delta
      );

      const foldIntensity =
        i > 8
          ? Math.sin(i * Math.PI * (1 / bones.length) - 0.5) * turningTime
          : 0;
      easing.dampAngle(
        target.rotation,
        "x",
        foldRotationAngle * foldIntensity,
        easingFactorFold,
        delta
      );
    }
  });

  const [_, setPage] = useAtom(pageAtom);
  const [highlighted, setHighlighted] = useState(false);
  useCursor(highlighted);

  return (
    <group
      {...props}
      ref={group}
      onPointerEnter={(e) => {
        e.stopPropagation();
        setHighlighted(true);
      }}
      onPointerLeave={(e) => {
        e.stopPropagation();
        setHighlighted(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        setPage(opened ? number : number + 1);
        setHighlighted(false);
      }}
    >
      <primitive
        object={manualSkinnedMesh}
        ref={skinnedMeshRef}
        position-z={-number * PAGE_DEPTH + page * PAGE_DEPTH}
      />
    </group>
  );
};

// Procedural Wood Grain & Normal Map Generator
const createProceduralWood = () => {
  const size = 512;
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");

  const normCanvas = document.createElement("canvas");
  normCanvas.width = size;
  normCanvas.height = size;
  const normCtx = normCanvas.getContext("2d");

  const imgData = ctx.createImageData(size, size);
  const normData = normCtx.createImageData(size, size);

  const cx = size * 0.35;
  const cy = size * -0.6;
  const heights = new Float32Array(size * size);

  // Simple deterministic pseudorandom hash
  const hash = (x, y) => {
    const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453123;
    return h - Math.floor(h);
  };

  const smoothNoise = (x, y) => {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    const a = hash(ix, iy);
    const b = hash(ix + 1, iy);
    const c = hash(ix, iy + 1);
    const d = hash(ix + 1, iy + 1);

    const ux = fx * fx * (3.0 - 2.0 * fx);
    const uy = fy * fy * (3.0 - 2.0 * fy);

    return (1.0 - ux) * (1.0 - uy) * a +
           ux * (1.0 - uy) * b +
           (1.0 - ux) * uy * c +
           ux * uy * d;
  };

  const fbm = (x, y) => {
    let value = 0.0;
    let amplitude = 1.0;
    let frequency = 1.0;
    for (let i = 0; i < 3; i++) {
      value += amplitude * smoothNoise(x * frequency, y * frequency);
      amplitude *= 0.5;
      frequency *= 2.0;
    }
    return value;
  };

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;

      const dx = (x - cx) * 0.85;
      const dy = (y - cy) * 0.22; // stretched grain look
      const dist = Math.sqrt(dx * dx + dy * dy);

      const warp = fbm(x * 0.035, y * 0.015) * 32.0;
      const r = dist + warp;

      // Concentric rings
      const ring = Math.sin(r * 0.18) * 0.5 + 0.5;

      // Fine wood grain lines overlay
      const grain = smoothNoise(x * 0.5, y * 0.15) * 0.15;

      const hVal = ring * 0.78 + grain * 0.22;
      heights[idx] = hVal;

      // Light oak / maple wood colors
      const mixVal = hVal;
      const rColor = Math.floor(170 * (1 - mixVal) + 210 * mixVal);
      const gColor = Math.floor(130 * (1 - mixVal) + 170 * mixVal);
      const bColor = Math.floor(80 * (1 - mixVal) + 110 * mixVal);

      const dIdx = idx * 4;
      imgData.data[dIdx] = rColor;
      imgData.data[dIdx + 1] = gColor;
      imgData.data[dIdx + 2] = bColor;
      imgData.data[dIdx + 3] = 255;
    }
  }

  // Generate Normal Map from heights
  const strength = 3.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = y * size + x;

      const xL = x > 0 ? x - 1 : 0;
      const xR = x < size - 1 ? x + 1 : size - 1;
      const yT = y > 0 ? y - 1 : 0;
      const yB = y < size - 1 ? y + 1 : size - 1;

      const hL = heights[y * size + xL];
      const hR = heights[y * size + xR];
      const hT = heights[yT * size + x];
      const hB = heights[yB * size + x];

      const dx = (hR - hL) * strength;
      const dy = (hB - hT) * strength;

      const nx = -dx;
      const ny = -dy;
      const nz = 1.0;

      const len = Math.sqrt(nx * nx + ny * ny + nz * nz);
      const nX = nx / len;
      const nY = ny / len;
      const nZ = nz / len;

      const dIdx = idx * 4;
      normData.data[dIdx] = Math.floor((nX * 0.5 + 0.5) * 255);
      normData.data[dIdx + 1] = Math.floor((nY * 0.5 + 0.5) * 255);
      normData.data[dIdx + 2] = Math.floor((nZ * 0.5 + 0.5) * 255);
      normData.data[dIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  normCtx.putImageData(normData, 0, 0);

  return { canvas, normCanvas };
};

// Cylindrical Tripod Stool
export const Stool = () => {
  const woodTextures = useMemo(() => {
    const { canvas, normCanvas } = createProceduralWood();
    
    const texture = new CanvasTexture(canvas);
    texture.wrapS = texture.wrapT = RepeatWrapping;
    texture.repeat.set(4.5, 4.5);
    
    const normalTexture = new CanvasTexture(normCanvas);
    normalTexture.wrapS = normalTexture.wrapT = RepeatWrapping;
    normalTexture.repeat.set(4.5, 4.5);

    return { map: texture, normalMap: normalTexture };
  }, []);

  const material = useMemo(() => {
    return new MeshStandardMaterial({
      map: woodTextures.map,
      normalMap: woodTextures.normalMap,
      roughness: 0.38,
      metalness: 0.08,
    });
  }, [woodTextures]);

  return (
    <group>
      {/* Cylindrical Stool Top Seat (Wider and Thicker) */}
      <mesh material={material} castShadow receiveShadow>
        <cylinderGeometry args={[1.0, 1.0, 0.14, 32]} />
      </mesh>

      {/* 3 Legs angled outwards symmetrically */}
      {[0, 1, 2].map((i) => {
        const theta = (i * Math.PI * 2) / 3;
        return (
          <group key={i} rotation={[0, theta, 0]}>
            <group position={[0, -0.57, 0.55]} rotation={[0.15, 0, 0]}>
              <mesh material={material} castShadow receiveShadow>
                <cylinderGeometry args={[0.03, 0.02, 1.0, 16]} />
              </mesh>
            </group>
          </group>
        );
      })}
    </group>
  );
};

export const Book = ({ ...props }) => {
  const [page] = useAtom(pageAtom);
  const [delayedPage, setDelayedPage] = useState(page);

  useEffect(() => {
    let timeout;
    const goToPage = () => {
      setDelayedPage((delayedPage) => {
        if (page === delayedPage) {
          return delayedPage;
        } else {
          timeout = setTimeout(
            () => {
              goToPage();
            },
            Math.abs(page - delayedPage) > 2 ? 50 : 150
          );
          if (page > delayedPage) {
            return delayedPage + 1;
          }
          if (page < delayedPage) {
            return delayedPage - 1;
          }
        }
      });
    };
    goToPage();
    return () => {
      clearTimeout(timeout);
    };
  }, [page]);

  return (
    <group {...props} rotation-y={-Math.PI / 2}>
      {[...pages].map((pageData, index) => (
        <Page
          key={index}
          page={delayedPage}
          number={index}
          opened={delayedPage > index}
          bookClosed={delayedPage === 0 || delayedPage === pages.length}
          {...pageData}
        />
      ))}
    </group>
  );
};
