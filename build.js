const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const rawDir = path.join(__dirname, 'raw_images');
const bgDir = path.join(__dirname, 'mockup_backgrounds');
const outputMockupDir = path.join(__dirname, 'public', 'assets', 'mockups');

// Ensure directories exist
if (!fs.existsSync(outputMockupDir)) fs.mkdirSync(outputMockupDir, { recursive: true });

const spacesData = JSON.parse(fs.readFileSync(path.join(bgDir, 'spaces.json'), 'utf-8'));
const backgrounds = Object.keys(spacesData);

async function processImages() {
    const files = fs.readdirSync(rawDir).filter(f => f.endsWith('.jpg') || f.endsWith('.png'));
    
    for (const file of files) {
        const baseName = path.parse(file).name;
        
        // Pick a random background for this painting
        const bgFilename = backgrounds[Math.floor(Math.random() * backgrounds.length)];
        const bgConfig = spacesData[bgFilename];
        
        const painting = sharp(path.join(rawDir, file));
        const metadata = await painting.metadata();
        
        const scale = Math.min(
            bgConfig.wall.maxWidth / metadata.width,
            bgConfig.wall.maxHeight / metadata.height
        );
        const newWidth = Math.round(metadata.width * scale);
        const newHeight = Math.round(metadata.height * scale);

        const warmthOverlay = Buffer.from(
            `<svg width="${newWidth}" height="${newHeight}">
                <rect x="0" y="0" width="${newWidth}" height="${newHeight}" fill="rgba(${bgConfig.ambientLight.warmth.r}, ${bgConfig.ambientLight.warmth.g}, ${bgConfig.ambientLight.warmth.b}, 0.15)" />
            </svg>`
        );

        const processedPainting = await painting
            .resize(newWidth, newHeight)
            .modulate({
                brightness: bgConfig.ambientLight.brightness,
                saturation: bgConfig.ambientLight.saturation
            })
            .composite([{ input: warmthOverlay }])
            .extend({ top: 20, bottom: 20, left: 20, right: 20, background: '#F5F5DC' })
            .extend({ top: 15, bottom: 15, left: 15, right: 15, background: '#3E2723' })
            .toBuffer();

        const finalImageMeta = await sharp(processedPainting).metadata();
        const stampX = Math.round(bgConfig.wall.x + (bgConfig.wall.maxWidth - finalImageMeta.width) / 2);
        const stampY = Math.round(bgConfig.wall.y + (bgConfig.wall.maxHeight - finalImageMeta.height) / 2);

        const finalMockupPath = path.join(outputMockupDir, `${baseName}_mockup.webp`);
        
        await sharp(path.join(bgDir, bgFilename))
            .composite([
                { input: processedPainting, top: stampY, left: stampX }
            ])
            .webp({ quality: 80 })
            .toFile(finalMockupPath);

        console.log(`Generated baked mockup for: ${baseName}`);
    }
}
processImages().catch(console.error);