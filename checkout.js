/**
 * TaxFlow 2026 - Monetization Bridge
 * Handles Whop checkout and PDF generation flow
 * 
 * Price: $19.99
 * Plan ID: plan_oShbDxIPnAiym
 */

const TaxFlowCheckout = {
    // Configuration
    config: {
        planId: 'plan_oShbDxIPnAiym',
        price: 19.99,
        currency: 'USD',
        productName: 'TaxFlow 2026 - Pre-Filled W-4',
        apiEndpoint: '/.netlify/functions/generate-w4'
    },

    // Pending data storage
    pendingUserData: null,
    pendingCalcResults: null,

    /**
     * Initialize checkout with user data and calculation results
     */
    init(userData, calcResults) {
        this.pendingUserData = userData;
        this.pendingCalcResults = calcResults;
        
        // Also persist to localStorage for redirect flow fallback
        localStorage.setItem('taxflow_userData', JSON.stringify(userData));
        localStorage.setItem('taxflow_calcResults', JSON.stringify(calcResults));
        localStorage.setItem('taxflow_pending', 'true');
    },

    /**
     * Open Whop checkout modal
     * @param {Object} callbacks - { onSuccess, onError, onClose }
     */
    openCheckout(callbacks = {}) {
        const { onSuccess, onError, onClose } = callbacks;

        // Verify Whop SDK is loaded
        if (typeof Whop === 'undefined' || !Whop.openCheckout) {
            console.warn('Whop SDK not loaded, using redirect fallback');
            this.redirectToCheckout();
            return;
        }

        // Open Whop modal
        Whop.openCheckout({
            planId: this.config.planId,
            
            onSuccess: async (result) => {
                try {
                    const whopToken = result?.membership?.id || result?.id || 'sdk_payment_verified';
                    const pdfBlob = await this.generatePDF(whopToken);
                    
                    if (onSuccess) {
                        onSuccess(pdfBlob, result);
                    }
                } catch (err) {
                    console.error('PDF generation failed:', err);
                    if (onError) {
                        onError(err);
                    }
                }
            },

            onClose: () => {
                if (onClose) {
                    onClose();
                }
            }
        });
    },

    /**
     * Fallback: Redirect to Whop hosted checkout
     */
    redirectToCheckout() {
        const returnUrl = encodeURIComponent(window.location.origin + '?payment=success');
        const checkoutUrl = `https://whop.com/checkout/${this.config.planId}?redirect_url=${returnUrl}`;
        window.location.href = checkoutUrl;
    },

    /**
     * Generate PDF by calling the Netlify function
     * @param {string} whopToken - Payment verification token
     * @returns {Promise<Blob>} PDF blob
     */
    async generatePDF(whopToken) {
        if (!whopToken) {
            throw new Error('Payment token required');
        }

        if (!this.pendingUserData || !this.pendingCalcResults) {
            // Try to recover from localStorage
            this.pendingUserData = JSON.parse(localStorage.getItem('taxflow_userData') || 'null');
            this.pendingCalcResults = JSON.parse(localStorage.getItem('taxflow_calcResults') || 'null');
        }

        if (!this.pendingUserData || !this.pendingCalcResults) {
            throw new Error('Session expired. Please try again.');
        }

        const response = await fetch(this.config.apiEndpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userData: this.pendingUserData,
                calcResults: this.pendingCalcResults,
                whopToken: whopToken
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({ error: 'Unknown error' }));
            throw new Error(error.error || 'PDF generation failed');
        }

        // Clear pending flag after successful generation
        localStorage.removeItem('taxflow_pending');

        return response.blob();
    },

    /**
     * Download a PDF blob
     * @param {Blob} blob - PDF blob
     * @param {string} filename - Download filename
     */
    downloadPDF(blob, filename = 'W4-2026-TaxFlow.pdf') {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    },

    /**
     * Check if returning from redirect checkout
     * @returns {boolean}
     */
    isReturningFromCheckout() {
        const urlParams = new URLSearchParams(window.location.search);
        const hasPending = localStorage.getItem('taxflow_pending');
        return urlParams.get('payment') === 'success' && hasPending === 'true';
    },

    /**
     * Handle return from redirect checkout
     * @param {Object} callbacks - { onSuccess, onError }
     */
    async handleCheckoutReturn(callbacks = {}) {
        const { onSuccess, onError } = callbacks;

        if (!this.isReturningFromCheckout()) {
            return false;
        }

        // Clear URL params
        window.history.replaceState({}, document.title, window.location.pathname);

        try {
            const whopToken = 'redirect_payment_verified_' + Date.now();
            const pdfBlob = await this.generatePDF(whopToken);
            
            if (onSuccess) {
                onSuccess(pdfBlob);
            }
            
            return true;
        } catch (err) {
            console.error('Return checkout failed:', err);
            if (onError) {
                onError(err);
            }
            return false;
        }
    },

    /**
     * Full checkout flow: init -> checkout -> download
     * @param {Object} userData - User's personal info
     * @param {Object} calcResults - Tax calculation results
     * @param {Object} callbacks - { onStart, onSuccess, onError, onClose }
     */
    async startCheckoutFlow(userData, calcResults, callbacks = {}) {
        const { onStart, onSuccess, onError, onClose } = callbacks;

        // Initialize with data
        this.init(userData, calcResults);

        if (onStart) {
            onStart();
        }

        // Open checkout
        this.openCheckout({
            onSuccess: async (pdfBlob, result) => {
                this.downloadPDF(pdfBlob);
                if (onSuccess) {
                    onSuccess(pdfBlob, result);
                }
            },
            onError: (err) => {
                if (onError) {
                    onError(err);
                }
            },
            onClose: () => {
                if (onClose) {
                    onClose();
                }
            }
        });
    }
};

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TaxFlowCheckout;
}

// Also attach to window for direct usage
if (typeof window !== 'undefined') {
    window.TaxFlowCheckout = TaxFlowCheckout;
}
