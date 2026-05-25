let currentPainting = {};
let audioHasStarted = false;
let currentStream = null;
let allPaintings = []; // Store loaded images for slider

document.addEventListener("DOMContentLoaded", () => {
    document.addEventListener('contextmenu', event => event.preventDefault());

    fetch('data.json')
        .then(response => response.json())
        .then(data => {
            allPaintings = data;
            buildGallery(data);
            initDiagonalSlider(); // Start hero background after data loads
        })
        .catch(err => console.error("Error loading gallery data:", err));
});

// --- DYNAMIC DIAGONAL HERO ENGINE ---
function initDiagonalSlider() {
    const diagonalBox = document.getElementById('diagonal-box');
    if (!diagonalBox || allPaintings.length === 0) return;
    
    const slots = [];
    // Extract just the image URLs
    const images = allPaintings.map(p => p.image);

    // Create 6 slots
    for (let i = 0; i < 6; i++) {
        const s = document.createElement('div');
        s.className = 'slot';
        diagonalBox.appendChild(s);
        slots.push(s);
        updateSlot(i, slots, images);
    }

    // Continuously update random slots
    setInterval(() => {
        updateSlot(Math.floor(Math.random() * 6), slots, images);
    }, 3000);
}

function updateSlot(i, slots, images) {
    const s = slots[i];
    const img = images[Math.floor(Math.random() * images.length)];
    const l = document.createElement('div');
    l.className = 'slice-layer slide-enter';
    l.style.backgroundImage = `url('${img}')`;
    l.style.backgroundPosition = `${Math.random() * 100}% ${Math.random() * 100}%`;
    s.appendChild(l);
    
    setTimeout(() => {
        l.classList.remove('slide-enter');
        l.classList.add('slide-active');
    }, 50);
    
    // Clean up old layers
    if (s.children.length > 1) {
        const old = s.children[0];
        old.style.opacity = '0';
        setTimeout(() => old.remove(), 1500);
    }
}

// --- FORM ENGINE ---
function prepareInquiry() {
    closeModal();
    // Auto-fill the painting name
    document.getElementById('form-painting-name').value = currentPainting.title || "";
    // Scroll smoothly to footer
    document.getElementById('contact-section').scrollIntoView({behavior: 'smooth'});
    // Focus the first input
    setTimeout(() => document.getElementById('form-name').focus(), 500);
}

function handleInquirySubmit(event) {
    event.preventDefault();
    const name = document.getElementById('form-name').value;
    const contact = document.getElementById('form-contact').value;
    const painting = document.getElementById('form-painting-name').value;
    const comments = document.getElementById('form-comments').value;

    const subject = encodeURIComponent(`Ritu Rang Inquiry: ${painting || 'General'}`);
    const body = encodeURIComponent(`Name: ${name}\nContact: ${contact}\nInterested In: ${painting || 'General Collection'}\n\nMessage:\n${comments}`);

    // Opens the user's default email client
    window.location.href = `mailto:daveritu306@gmail.com?subject=${subject}&body=${body}`;
}

// --- AUDIO ENGINE ---
function startExperience() {
    document.getElementById('gallery').scrollIntoView({behavior: 'smooth'});
    if (!audioHasStarted) toggleAudio(true);
}

function toggleAudio(forcePlay = false) {
    const audio = document.getElementById('bg-music');
    const icon = document.getElementById('audio-icon');
    
    if (audio.paused || forcePlay) {
        audio.play().then(() => {
            audioHasStarted = true;
            icon.innerText = "🔊";
        }).catch(err => console.log("Autoplay blocked by browser."));
    } else {
        audio.pause();
        icon.innerText = "🔇";
    }
}

// --- UI ENGINE ---
function extractDominantColor(imageSrc, callback) {
    const img = new Image();
    img.crossOrigin = "Anonymous"; 
    img.src = imageSrc;
    img.onload = function() {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        canvas.width = 1; canvas.height = 1;
        ctx.drawImage(img, 0, 0, 1, 1);
        const data = ctx.getImageData(0, 0, 1, 1).data;
        callback(`rgba(${data[0]}, ${data[1]}, ${data[2]}, 0.4)`);
    };
}

function formatPrice(priceStr) {
    if (!priceStr) return "Price on Request";
    const num = parseFloat(priceStr.replace('K', '')) * 1000;
    return `₹${num.toLocaleString('en-IN')}`;
}

function buildGallery(paintings) {
    const gallery = document.getElementById('gallery');
    
    paintings.forEach(painting => {
        const card = document.createElement('div');
        card.className = 'painting-card';
        card.onclick = () => openModal(painting);

        card.innerHTML = `
            <div class="image-wrapper">
                <div class="theft-overlay"></div>
                <img src="${painting.image}" alt="${painting.title}" loading="lazy">
            </div>
            <div class="info">
                <h3>${painting.title}</h3>
                <p class="price-tag">${formatPrice(painting.price)}</p>
                <p class="dim-tag">Dimensions: ${painting.dimensions}</p>
            </div>
        `;
        gallery.appendChild(card);
    });
    setupScrollAnimations();
}

function setupScrollAnimations() {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry, index) => {
            if (entry.isIntersecting) {
                setTimeout(() => entry.target.classList.add('visible'), index * 100); 
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.15 });

    document.querySelectorAll('.painting-card').forEach(card => observer.observe(card));
}

function openModal(painting) {
    currentPainting = painting;
    document.getElementById('modal-title').innerText = painting.title;
    document.getElementById('modal-price').innerText = formatPrice(painting.price);
    document.getElementById('modal-dim').innerText = painting.dimensions;
    
    extractDominantColor(painting.image, (colorStr) => {
        document.documentElement.style.setProperty('--glow-color', colorStr);
    });
    
    document.getElementById('viewer-modal').style.display = 'flex';
    setMode('mockup');
}

function closeModal() {
    document.getElementById('viewer-modal').style.display = 'none';
    if (currentStream) {
        currentStream.getTracks().forEach(track => track.stop());
        currentStream = null;
    }
    document.getElementById('camera-feed').style.display = 'none';
    document.getElementById('ar-overlay-image').style.display = 'none';
    document.getElementById('start-camera-btn').style.display = 'inline-block';
    document.getElementById('ar-instructions').innerText = "To view, grant camera permissions.";
}

function setMode(mode) {
    const imgEl = document.getElementById('modal-image');
    document.querySelectorAll('.view-area').forEach(el => el.classList.remove('active'));
    
    if (mode === 'mockup' || mode === 'standalone') {
        document.getElementById('mockup-view').classList.add('active');
        if (mode === 'mockup') {
            imgEl.src = currentPainting.image.replace('paintings/', 'mockups/').replace('.webp', '_mockup.webp');
        } else {
            imgEl.src = currentPainting.image;
        }
    } else if (mode === 'ar') {
        document.getElementById('ar-view').classList.add('active');
    }
}

// --- AR CAMERA ENGINE ---
async function startCamera() {
    const video = document.getElementById('camera-feed');
    const btn = document.getElementById('start-camera-btn');
    const instructions = document.getElementById('ar-instructions');
    const overlay = document.getElementById('ar-overlay-image');

    try {
        currentStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        video.srcObject = currentStream;
        video.style.display = 'block';
        overlay.src = currentPainting.image;
        overlay.style.display = 'block';
        btn.style.display = 'none'; 
        instructions.innerText = "Point your camera at a blank wall.";
    } catch (err) {
        console.error("Camera access error:", err);
        alert("Could not access the camera. Please ensure permissions are granted.");
    }
}