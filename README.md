# TaxFlow 2026 - Instant Raise Calculator

**Don't wait until 2027 for your refund. Get it today.**

Stop giving the IRS a 0% interest loan.

## 💰 Revenue Model

- **Free**: Calculator + W-4 instructions
- **$19.99**: Pre-filled W-4 PDF (instant download)
- **40% affiliate commissions** via Whop

**Target: $100k** = 5,001 sales × $19.99

## 🚀 Deploy Tonight

### 1. Upload to GitHub

1. Go to [github.com/new](https://github.com/new)
2. Create repo: `taxflow-2026`
3. Upload all files from this ZIP

### 2. Deploy to Netlify

1. Go to [app.netlify.com](https://app.netlify.com)
2. Click **"Import an existing project"**
3. Select your GitHub repo
4. Click **Deploy**

**Done. Live in 2 minutes.**

## 📁 File Structure

```
taxflow-2026/
├── public/
│   └── index.html              # Calculator UI + Whop checkout
├── src/
│   └── checkout.js             # Monetization bridge
├── netlify/
│   └── functions/
│       └── generate-w4.js      # Secure PDF generator
├── package.json                # pdf-lib + crypto
├── netlify.toml                # esbuild config
└── README.md
```

## 🔒 Security: Paywall Enforcement

The PDF generator **refuses** to work without a payment token:

```javascript
// netlify/functions/generate-w4.js (line 77)
if (!whopToken) {
  return {
    statusCode: 403,
    body: JSON.stringify({ 
      error: 'Payment required',
      message: 'Please complete payment to generate your W-4'
    })
  };
}
```

**No token = No PDF. Period.**

## 🎯 Marketing Hooks (Built In)

- "Don't wait until 2027 for your refund. Get it today."
- "Stop giving the IRS a 0% interest loan."
- Button: "📄 Get My Instant Raise — $19.99"

## ⚙️ Configuration

### Whop Plan ID (Already Set)
```javascript
planId: 'plan_oShbDxIPnAiym'
```

### Price (Already Set)
```javascript
price: 19.99
```

### Change Price Later
1. Update in Whop Dashboard
2. Search `$19.99` in `index.html` and update button text

## 🔄 How It Works

```
User completes free calculator
        ↓
Clicks "Get My Instant Raise — $19.99"
        ↓
Fills personal info (name, SSN, address)
        ↓
Clicks "Continue to Payment"
        ↓
Whop checkout modal opens
        ↓
User pays $19.99
        ↓
Whop returns membership token
        ↓
Token sent to generate-w4 function
        ↓
Function VERIFIES token exists
        ↓
Fetches W-4 from IRS.gov
        ↓
Fills with user's data
        ↓
Ooze animation plays
        ↓
PDF downloads instantly
```

## 📊 2026 W-4 Field IDs (Verified)

| Field | ID |
|-------|-----|
| First Name | `topmostSubform[0].Page1[0].Step1a[0].f1_01[0]` |
| Last Name | `topmostSubform[0].Page1[0].Step1a[0].f1_02[0]` |
| Address | `topmostSubform[0].Page1[0].Step1a[0].f1_03[0]` |
| City/State/ZIP | `topmostSubform[0].Page1[0].Step1a[0].f1_04[0]` |
| Filing: Single | `topmostSubform[0].Page1[0].c1_1[0]` |
| Filing: Married | `topmostSubform[0].Page1[0].c1_1[1]` |
| Filing: HOH | `topmostSubform[0].Page1[0].c1_1[2]` |
| Step 2(c) | `topmostSubform[0].Page1[0].c1_2[0]` |
| Step 3 total | `topmostSubform[0].Page1[0].f1_08[0]` |
| Step 4(a) | `topmostSubform[0].Page1[0].f1_09[0]` |
| Step 4(b) | `topmostSubform[0].Page1[0].f1_10[0]` |
| Step 4(c) | `topmostSubform[0].Page1[0].f1_11[0]` |

## 🎨 Features

### Calculator (Free)
- ✅ All 5 filing statuses
- ✅ 2026 tax brackets
- ✅ OBBBA deductions (tips $25k, overtime $12.5k/$25k, car loan $10k, senior $6k)
- ✅ Child Tax Credit ($2,200/child)
- ✅ Side hustle calculator with 15.3% SE tax
- ✅ Real-time refund/owe in header
- ✅ Reactive background (green = refund, red = owe)

### PDF Generation (Paid)
- ✅ Fetches official IRS W-4 at runtime
- ✅ Fills all fields automatically
- ✅ Forces uppercase for official forms
- ✅ SSN formatting (XXX-XX-XXXX)
- ✅ "Ooze" loading animation
- ✅ Instant download

## 🚨 Troubleshooting

### "Payment required" error
- User didn't complete Whop checkout
- Token not passed to function

### PDF fields not filling
- IRS updated field names (rare)
- Check Netlify function logs

### Whop modal not opening
- SDK still loading (async)
- Falls back to redirect automatically

## 📈 Analytics to Add

```javascript
// In handlePaymentSuccess()
gtag('event', 'purchase', { value: 19.99, currency: 'USD' });
fbq('track', 'Purchase', { value: 19.99, currency: 'USD' });
```

## License

MIT

---

**Ship it. Get paid. 🚀**

Built by Rochester × Claude × Gemini
