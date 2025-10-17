// Trail Life Troop PA-1997 JavaScript

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Form submission handlers
const contactForm = document.getElementById('contactForm');
if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for your message! We\'ll get back to you soon.\n\nNote: To make this form actually send emails, you\'ll need to connect it to a form service like Formspree, Netlify Forms, or EmailJS.');
        this.reset();
    });
}

const newsletterForm = document.getElementById('newsletterForm');
if (newsletterForm) {
    newsletterForm.addEventListener('submit', function(e) {
        e.preventDefault();
        alert('Thank you for subscribing to our newsletter! You\'ll receive our weekly updates soon.\n\nNote: To make this form actually work, you\'ll need to connect it to a form service or email list provider.');
        this.reset();
    });
}

// PWA Install Button
const installBtn = document.getElementById('installAppBtn');
if (installBtn) {
    let deferredPrompt;

    // Show button based on device
    function showInstallOptions() {
        const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
        const isAndroid = /Android/.test(navigator.userAgent);
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;

        // Don't show if already installed
        if (isStandalone) {
            return;
        }

        if (isIOS || isAndroid || true) {
            installBtn.style.display = 'inline-block';
            installBtn.addEventListener('click', () => {
                if (deferredPrompt) {
                    deferredPrompt.prompt();
                    deferredPrompt.userChoice.then((choiceResult) => {
                        deferredPrompt = null;
                        if (choiceResult.outcome === 'accepted') {
                            installBtn.style.display = 'none';
                        }
                    });
                } else {
                    // Show instructions in an alert for iOS/other browsers
                    if (isIOS) {
                        alert('To Install on iPhone:\n\n1. Tap the Share button ⬆️ at the bottom of Safari\n2. Scroll down and tap "Add to Home Screen"\n3. Tap "Add" - Done!');
                    } else if (isAndroid) {
                        alert('To Install on Android:\n\n1. Tap the menu ⋮ (3 dots) in the top right\n2. Tap "Add to Home screen" or "Install app"\n3. Tap "Add" - Done!');
                    } else {
                        alert('To Install:\n\nVisit this site on your phone to install the Trailhead PA-1997 app for easy access to troop information!');
                    }
                }
            });
        }
    }

    // Call on page load
    showInstallOptions();

    // Capture install prompt for Android
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        installBtn.style.display = 'inline-block';
    });
}

// Register Service Worker for PWA
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => console.log('Service Worker registered'))
            .catch(err => console.log('Service Worker registration failed'));
    });
}