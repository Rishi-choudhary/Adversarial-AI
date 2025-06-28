let isGenerating = false;
let currentDebate = null;


document.addEventListener('DOMContentLoaded', function() {
    initializeAnimations();
    initializeInteractions();
    initializeForms();
    initializeAccessibility();
    
    
    createPixelParticles();
});


function initializeAnimations() {
    
    const bounceIcons = document.querySelectorAll('.bounce-icon, .gavel-bounce');
    bounceIcons.forEach(icon => {
        icon.addEventListener('mouseenter', function() {
            this.style.animationPlayState = 'paused';
        });
        icon.addEventListener('mouseleave', function() {
            this.style.animationPlayState = 'running';
        });
    });
    
   
    const cards = document.querySelectorAll('.card');
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.4, 0.0, 0.2, 1)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, 100 + (index * 100));
    });
}


function initializeInteractions() {
    
    const topicChips = document.querySelectorAll('.topic-chip');
    topicChips.forEach(chip => {
        chip.addEventListener('click', function() {
            const topic = this.textContent.trim();
            fillTopicInput(topic);
            
            
            this.style.transform = 'scale(0.95)';
            setTimeout(() => {
                this.style.transform = '';
            }, 150);
        });
        
        
        chip.addEventListener('mouseenter', function() {
            this.style.boxShadow = '0 8px 16px rgba(141, 180, 212, 0.3)';
        });
        
        chip.addEventListener('mouseleave', function() {
            this.style.boxShadow = '';
        });
    });
    
    
    const pixelButtons = document.querySelectorAll('[class*="pixel-btn"]');
    pixelButtons.forEach(button => {
        button.addEventListener('mouseenter', function() {
            this.style.transform = 'translateY(-2px) scale(1.02)';
        });
        
        button.addEventListener('mouseleave', function() {
            this.style.transform = '';
        });
    });
}


function initializeForms() {
    
    const legalForm = document.querySelector('.legal-input-form');
    if (legalForm) {
        legalForm.addEventListener('submit', function(e) {
            if (isGenerating) {
                e.preventDefault();
                return;
            }
            
            const topic = this.querySelector('#topic').value.trim();
            if (!topic) {
                e.preventDefault();
                showNotification('Please enter a legal topic', 'warning');
                return;
            }
            
            startGenerating();
        });
    }
    
    
    const authForms = document.querySelectorAll('.auth-form');
    authForms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalHTML = submitBtn.innerHTML;
            
            
            if (!validateAuthForm(this)) {
                e.preventDefault();
                return;
            }
            
            
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin me-2"></i>Processing...';
            submitBtn.disabled = true;
            
            
            setTimeout(() => {
                if (submitBtn.disabled) {
                    submitBtn.innerHTML = originalHTML;
                    submitBtn.disabled = false;
                }
            }, 10000);
        });
    });
}


function initializeAccessibility() {
    
    const topicChips = document.querySelectorAll('.topic-chip');
    topicChips.forEach(chip => {
        chip.setAttribute('tabindex', '0');
        chip.setAttribute('role', 'button');
        
        chip.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                this.click();
            }
        });
    });
    
    
    const inputs = document.querySelectorAll('input, textarea, button');
    inputs.forEach(input => {
        input.addEventListener('focus', function() {
            this.style.outline = '3px solid var(--pixel-primary)';
            this.style.outlineOffset = '2px';
        });
        
        input.addEventListener('blur', function() {
            this.style.outline = '';
            this.style.outlineOffset = '';
        });
    });
}


function fillTopicInput(topic) {
    const topicInput = document.getElementById('topic');
    if (topicInput) {
        topicInput.value = topic;
        topicInput.focus();
        
        
        topicInput.scrollIntoView({ 
            behavior: 'smooth', 
            block: 'center' 
        });
        
        
        topicInput.style.background = 'var(--pixel-parchment)';
        setTimeout(() => {
            topicInput.style.background = '';
        }, 1000);
    }
}

function startGenerating() {
    isGenerating = true;
    const submitBtn = document.querySelector('.legal-input-form button[type="submit"]');
    
    if (submitBtn) {
        const originalHTML = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-cog fa-spin me-2"></i>Generating Arguments...';
        submitBtn.disabled = true;
        
        
        createLoadingEffect();
        
        
        setTimeout(() => {
            if (isGenerating) {
                submitBtn.innerHTML = originalHTML;
                submitBtn.disabled = false;
                isGenerating = false;
            }
        }, 30000);
    }
}

function validateAuthForm(form) {
    const inputs = form.querySelectorAll('input[required]');
    let isValid = true;
    
    inputs.forEach(input => {
        const value = input.value.trim();
        
        
        input.classList.remove('is-invalid', 'is-valid');
        
        if (!value) {
            input.classList.add('is-invalid');
            isValid = false;
        } else if (input.type === 'email' && !validateEmail(value)) {
            input.classList.add('is-invalid');
            showNotification('Please enter a valid email address', 'error');
            isValid = false;
        } else if (input.type === 'password' && value.length < 6) {
            input.classList.add('is-invalid');
            showNotification('Password must be at least 6 characters long', 'error');
            isValid = false;
        } else {
            input.classList.add('is-valid');
        }
    });
    
    return isValid;
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function showNotification(message, type = 'info') {
    
    const notification = document.createElement('div');
    notification.className = `alert alert-${type === 'error' ? 'danger' : type === 'success' ? 'success' : 'info'} alert-dismissible fade show pixel-alert`;
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.zIndex = '9999';
    notification.style.minWidth = '300px';
    
    const icon = type === 'error' ? 'exclamation-triangle' : 
                 type === 'success' ? 'check-circle' : 'info-circle';
    
    notification.innerHTML = `
        <i class="fas fa-${icon} me-2"></i>
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;
    
    document.body.appendChild(notification);
    
    
    setTimeout(() => {
        if (notification.parentNode) {
            notification.remove();
        }
    }, 5000);
}

function createPixelParticles() {
    
    const particleContainer = document.createElement('div');
    particleContainer.style.position = 'fixed';
    particleContainer.style.top = '0';
    particleContainer.style.left = '0';
    particleContainer.style.width = '100%';
    particleContainer.style.height = '100%';
    particleContainer.style.pointerEvents = 'none';
    particleContainer.style.zIndex = '-1';
    particleContainer.style.opacity = '0.1';
    
    for (let i = 0; i < 5; i++) {
        const particle = document.createElement('div');
        particle.innerHTML = '⚖️';
        particle.style.position = 'absolute';
        particle.style.fontSize = '2rem';
        particle.style.left = Math.random() * 100 + '%';
        particle.style.top = Math.random() * 100 + '%';
        particle.style.animation = `float ${5 + Math.random() * 5}s ease-in-out infinite`;
        particle.style.animationDelay = Math.random() * 5 + 's';
        
        particleContainer.appendChild(particle);
    }
    
    document.body.appendChild(particleContainer);
}

function createLoadingEffect() {
    const loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'loading-overlay';
    loadingOverlay.style.position = 'fixed';
    loadingOverlay.style.top = '0';
    loadingOverlay.style.left = '0';
    loadingOverlay.style.width = '100%';
    loadingOverlay.style.height = '100%';
    loadingOverlay.style.background = 'rgba(244, 228, 188, 0.9)';
    loadingOverlay.style.display = 'flex';
    loadingOverlay.style.alignItems = 'center';
    loadingOverlay.style.justifyContent = 'center';
    loadingOverlay.style.zIndex = '9998';
    loadingOverlay.style.flexDirection = 'column';
    
    loadingOverlay.innerHTML = `
        <div style="text-align: center;">
            <div style="font-size: 4rem; margin-bottom: 2rem;">
                <i class="fas fa-balance-scale" style="animation: gavel-bounce 1.5s infinite; color: var(--pixel-primary);"></i>
            </div>
            <h3 style="font-family: var(--font-pixel-title); color: var(--pixel-primary); font-size: 1.2rem; margin-bottom: 1rem;">
                Generating Legal Arguments...
            </h3>
            <p style="font-family: var(--font-pixel-mono); color: var(--pixel-neutral); font-size: 1rem;">
                Our AI is analyzing legal precedents and crafting your debate
            </p>
            <div style="margin-top: 2rem;">
                <div style="display: inline-block; padding: 8px 16px; background: var(--pixel-primary); color: white; border-radius: 8px; font-family: var(--font-pixel-body);">
                    <i class="fas fa-cog fa-spin me-2"></i>Processing...
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(loadingOverlay);
    
    
    window.addEventListener('beforeunload', function() {
        const overlay = document.getElementById('loading-overlay');
        if (overlay) {
            overlay.remove();
        }
    });
}


function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(function() {
        showNotification('Copied to clipboard!', 'success');
    }).catch(function(err) {
        console.error('Could not copy text: ', err);
        showNotification('Failed to copy to clipboard', 'error');
    });
}


document.addEventListener('click', function(e) {
    if (e.target.matches('a[href^="#"]')) {
        e.preventDefault();
        const targetId = e.target.getAttribute('href');
        const targetElement = document.querySelector(targetId);
        
        if (targetElement) {
            targetElement.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }
});


const style = document.createElement('style');
style.textContent = `
    @keyframes float {
        0%, 100% { transform: translateY(0px) rotate(0deg); }
        50% { transform: translateY(-20px) rotate(180deg); }
    }
    
    @keyframes fadeInUp {
        from {
            opacity: 0;
            transform: translateY(30px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
    
    .fade-in-up {
        animation: fadeInUp 0.6s ease-out;
    }
`;
document.head.appendChild(style);


function reportWebVitals() {
    
    window.addEventListener('load', function() {
        const loadTime = performance.now();
        console.log('Page load time:', loadTime.toFixed(2), 'ms');
        
        if (loadTime > 3000) {
            console.warn('Page load time is above 3 seconds');
        }
    });
}


reportWebVitals();


window.addEventListener('error', function(e) {
    console.error('JavaScript error:', e.error);
    showNotification('An error occurred. Please refresh the page.', 'error');
});


if ('serviceWorker' in navigator) {
    window.addEventListener('load', function() {
        
        console.log('Service Worker support detected');
    });
}


if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        fillTopicInput,
        validateEmail,
        validateAuthForm,
        showNotification
    };
}
