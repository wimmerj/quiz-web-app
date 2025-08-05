// Accessibility vylepšení

class AccessibilityManager {
    constructor() {
        this.init();
    }
    
    init() {
        this.setupKeyboardNavigation();
        this.setupFocusManagement();
        this.setupScreenReaderSupport();
        this.setupHighContrastMode();
    }
    
    setupKeyboardNavigation() {
        // Tab navigation pro modály
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    this.trapFocus(e, openModal);
                }
            }
            
            // ESC pro zavření modálů
            if (e.key === 'Escape') {
                const openModal = document.querySelector('.modal:not(.hidden)');
                if (openModal) {
                    app.closeModal(openModal.id);
                }
            }
        });
    }
    
    trapFocus(e, container) {
        const focusableElements = container.querySelectorAll(
            'button, input, select, textarea, [href], [tabindex]:not([tabindex="-1"])'
        );
        
        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        
        if (e.shiftKey && document.activeElement === firstElement) {
            e.preventDefault();
            lastElement.focus();
        } else if (!e.shiftKey && document.activeElement === lastElement) {
            e.preventDefault();
            firstElement.focus();
        }
    }
    
    setupFocusManagement() {
        // Přidání focus indikátorů
        const style = document.createElement('style');
        style.textContent = `
            .focus-visible {
                outline: 3px solid #4A90E2;
                outline-offset: 2px;
                border-radius: 4px;
            }
            
            [data-focus-method="keyboard"] *:focus {
                outline: 3px solid #4A90E2;
                outline-offset: 2px;
            }
            
            [data-focus-method="mouse"] *:focus {
                outline: none;
            }
        `;
        document.head.appendChild(style);
        
        // Detekce způsobu navigace
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.documentElement.setAttribute('data-focus-method', 'keyboard');
            }
        });
        
        document.addEventListener('mousedown', () => {
            document.documentElement.setAttribute('data-focus-method', 'mouse');
        });
    }
    
    setupScreenReaderSupport() {
        // Live region pro oznámení
        if (!document.getElementById('sr-live-region')) {
            const liveRegion = document.createElement('div');
            liveRegion.id = 'sr-live-region';
            liveRegion.setAttribute('aria-live', 'polite');
            liveRegion.setAttribute('aria-atomic', 'true');
            liveRegion.style.cssText = `
                position: absolute;
                left: -10000px;
                width: 1px;
                height: 1px;
                overflow: hidden;
            `;
            document.body.appendChild(liveRegion);
        }
        
        // ARIA labels pro tlačítka
        this.addAriaLabels();
    }
    
    addAriaLabels() {
        const ariaLabels = {
            'backBtn': 'Předchozí otázka',
            'forwardBtn': 'Další otázka',
            'randomBtn': 'Náhodná otázka',
            'hardBtn': 'Zapnout/vypnout těžký režim',
            'loadBtn': 'Načíst otázky ze souboru',
            'incorrectBtn': 'Označit otázku jako chybnou',
            'startBattleBtn': 'Založit novou bitvu',
            'joinBattleBtn': 'Připojit se k bitvě',
            'answerA': 'Odpověď A',
            'answerB': 'Odpověď B',
            'answerC': 'Odpověď C'
        };
        
        Object.entries(ariaLabels).forEach(([id, label]) => {
            const element = document.getElementById(id);
            if (element) {
                element.setAttribute('aria-label', label);
            }
        });
    }
    
    announceToScreenReader(message) {
        const liveRegion = document.getElementById('sr-live-region');
        if (liveRegion) {
            liveRegion.textContent = message;
            
            // Vyčistit po 1 sekundě
            setTimeout(() => {
                liveRegion.textContent = '';
            }, 1000);
        }
    }
    
    setupHighContrastMode() {
        // Detekce high contrast preference
        const mediaQuery = window.matchMedia('(prefers-contrast: high)');
        this.updateHighContrast(mediaQuery.matches);
        
        mediaQuery.addEventListener('change', (e) => {
            this.updateHighContrast(e.matches);
        });
    }
    
    updateHighContrast(enabled) {
        document.documentElement.setAttribute('data-high-contrast', enabled);
    }
    
    // Utility funkce pro fokus
    moveFocusTo(element) {
        if (element) {
            element.focus();
            
            // Scroll do view pokud je potřeba
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }
    
    // Kontrola accessibility
    checkAccessibility() {
        const issues = [];
        
        // Kontrola alt textů u obrázků
        const images = document.querySelectorAll('img:not([alt])');
        if (images.length > 0) {
            issues.push(`${images.length} obrázků bez alt textu`);
        }
        
        // Kontrola form labelů
        const inputs = document.querySelectorAll('input:not([aria-label]):not([aria-labelledby])');
        const unlabeledInputs = Array.from(inputs).filter(input => {
            const id = input.getAttribute('id');
            return !id || !document.querySelector(`label[for="${id}"]`);
        });
        
        if (unlabeledInputs.length > 0) {
            issues.push(`${unlabeledInputs.length} input polí bez labelů`);
        }
        
        // Kontrola kontrastů (základní)
        const lowContrastElements = this.findLowContrastElements();
        if (lowContrastElements.length > 0) {
            issues.push(`${lowContrastElements.length} elementů s možně nízkým kontrastem`);
        }
        
        return issues;
    }
    
    findLowContrastElements() {
        // Zjednodušená kontrola kontrastu
        const elements = document.querySelectorAll('*');
        const lowContrast = [];
        
        elements.forEach(el => {
            const styles = window.getComputedStyle(el);
            const color = styles.color;
            const backgroundColor = styles.backgroundColor;
            
            // Zde by byla implementace skutečné kontroly kontrastu
            // Pro demonstraci pouze označíme prvky s velmi světlými barvami
            if (color.includes('rgba(255,255,255,0.') && parseFloat(color.match(/0\.\d+/)?.[0] || 1) < 0.7) {
                lowContrast.push(el);
            }
        });
        
        return lowContrast;
    }
}
