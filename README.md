# TaxFlow 2026 - W-4 Calculator

A free W-4 withholding calculator with **2026 OBBBA tax law** support and **pre-filled PDF generation**.

## Features

- ✅ 2026 tax brackets and standard deductions
- ✅ OBBBA deductions (tips, overtime, car loan interest, senior)
- ✅ Child Tax Credit ($2,200 per child)
- ✅ Side hustle / 1099 income with SE tax calculation
- ✅ **Pre-filled W-4 PDF generation**
- ✅ Real-time refund/owe estimate

## Deploy to Netlify

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/YOUR_USERNAME/taxflow-2026)

Or manually:

1. Fork this repo
2. Connect to Netlify
3. Deploy (no build settings needed)

## Project Structure

```
├── public/
│   └── index.html          # Calculator UI
├── netlify/
│   └── functions/
│       └── generate-w4.js  # PDF generation function
├── package.json
├── netlify.toml
└── README.md
```

## How It Works

1. User enters income, withholding, dependents, deductions
2. Calculator computes tax liability vs projected withholding
3. Shows refund/owe amount and W-4 instructions
4. User can generate a pre-filled W-4 PDF

The PDF is fetched from IRS.gov and filled using verified field IDs extracted from the official 2026 Form W-4.

## 2026 W-4 Field IDs

These are the verified field names from the IRS PDF:

| Field | ID |
|-------|-----|
| Name | `topmostSubform[0].Page1[0].Step1a[0].f1_01[0]` |
| Address | `topmostSubform[0].Page1[0].Step1a[0].f1_02[0]` |
| City/State/ZIP | `topmostSubform[0].Page1[0].Step1a[0].f1_03[0]` |
| Filing: Single | `topmostSubform[0].Page1[0].c1_1[0]` |
| Filing: Married | `topmostSubform[0].Page1[0].c1_1[1]` |
| Filing: HOH | `topmostSubform[0].Page1[0].c1_1[2]` |
| Step 2(c) checkbox | `topmostSubform[0].Page1[0].c1_2[0]` |
| Step 3 total | `topmostSubform[0].Page1[0].f1_08[0]` |
| Step 4(a) | `topmostSubform[0].Page1[0].f1_09[0]` |
| Step 4(b) | `topmostSubform[0].Page1[0].f1_10[0]` |
| Step 4(c) | `topmostSubform[0].Page1[0].f1_11[0]` |

## Tech Stack

- Vanilla HTML/CSS/JS (no framework)
- Netlify Functions (serverless)
- pdf-lib for PDF manipulation

## License

MIT
