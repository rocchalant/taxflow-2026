const { PDFDocument } = require('pdf-lib');

/**
 * TaxFlow 2026 - W-4 PDF Generator with Whop Paywall
 * 
 * This serverless function:
 * 1. VERIFIES a Whop token exists (payment proof)
 * 2. Fetches the official IRS W-4 PDF
 * 3. Fills it with user data
 * 4. Returns the pre-filled PDF
 */

// Verified 2026 W-4 Field IDs (extracted from IRS PDF)
const FIELDS = {
  // Step 1a: Personal Info
  firstName: 'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]',
  lastName: 'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]',
  address: 'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]',
  cityStateZip: 'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]',
  
  // Step 1c: Filing Status
  single: 'topmostSubform[0].Page1[0].c1_1[0]',
  married: 'topmostSubform[0].Page1[0].c1_1[1]',
  hoh: 'topmostSubform[0].Page1[0].c1_1[2]',
  
  // Step 2c: Multiple Jobs
  multipleJobs: 'topmostSubform[0].Page1[0].c1_2[0]',
  
  // Step 3: Dependents
  step3a: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_06[0]',
  step3b: 'topmostSubform[0].Page1[0].Step3_ReadOrder[0].f1_07[0]',
  step3Total: 'topmostSubform[0].Page1[0].f1_08[0]',
  
  // Step 4: Adjustments
  step4a: 'topmostSubform[0].Page1[0].f1_09[0]',
  step4b: 'topmostSubform[0].Page1[0].f1_10[0]',
  step4c: 'topmostSubform[0].Page1[0].f1_11[0]',
};

// SSN field candidates (IRS changes these periodically)
const SSN_FIELD_CANDIDATES = [
  'topmostSubform[0].Page1[0].Step1b[0].f1_05[0]',
  'topmostSubform[0].Page1[0].Step1b[0].f1_04[0]',
  'topmostSubform[0].Page1[0].Step1a[0].f1_05[0]',
  'topmostSubform[0].Page1[0].Step1a[0].f1_04[1]',
  'topmostSubform[0].Page1[0].f1_05[0]',
  'topmostSubform[0].Page1[0].f1_04[0]'
];

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  // Only allow POST
  if (event.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      headers, 
      body: JSON.stringify({ error: 'Method not allowed' }) 
    };
  }

  try {
    const { userData, calcResults, whopToken } = JSON.parse(event.body);

    // ==========================================
    // SECURITY CHECK: Verify Whop token exists
    // ==========================================
    if (!whopToken) {
      console.warn('PDF generation attempted without Whop token');
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ 
          error: 'Payment required',
          message: 'Please complete payment to generate your W-4'
        })
      };
    }

    // Log for analytics (token is the Whop membership ID)
    console.log('Generating W-4 for token:', whopToken.substring(0, 10) + '...');

    // Optional: Verify token with Whop API (uncomment if you have WHOP_API_KEY)
    // const isValid = await verifyWhopToken(whopToken);
    // if (!isValid) {
    //   return {
    //     statusCode: 403,
    //     headers,
    //     body: JSON.stringify({ error: 'Invalid payment token' })
    //   };
    // }

    // ==========================================
    // Fetch W-4 PDF from IRS
    // ==========================================
    const pdfUrl = 'https://www.irs.gov/pub/irs-pdf/fw4.pdf';
    const pdfResponse = await fetch(pdfUrl);
    
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch W-4 PDF from IRS');
    }
    
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // ==========================================
    // Fill the PDF
    // ==========================================
    
    // Personal info (force uppercase for official forms)
    setText(form, FIELDS.firstName, upper(userData.firstName));
    setText(form, FIELDS.lastName, upper(userData.lastName));
    setText(form, FIELDS.address, upper(userData.address));
    setText(form, FIELDS.cityStateZip, upper(
      `${userData.city || ''}, ${userData.state || ''} ${userData.zip || ''}`.trim()
    ));

    // SSN - find the correct field dynamically
    const ssnField = findFirstTextField(form, SSN_FIELD_CANDIDATES);
    if (ssnField) {
      setText(form, ssnField.name, formatSSN(userData.ssn));
    } else {
      console.warn('SSN field not found in PDF');
    }

    // Filing status checkboxes
    const filingMap = {
      'single': FIELDS.single,
      'mfs': FIELDS.single,     // MFS uses same checkbox as single
      'married': FIELDS.married,
      'widow': FIELDS.married,   // Widow uses married checkbox
      'head': FIELDS.hoh
    };
    
    if (filingMap[userData.filing]) {
      setCheck(form, filingMap[userData.filing]);
    }

    // Step 2c: Multiple jobs checkbox
    if (calcResults.multipleJobs) {
      setCheck(form, FIELDS.multipleJobs);
    }

    // Step 3: Dependents
    if (calcResults.childrenCredit > 0) {
      setText(form, FIELDS.step3a, calcResults.childrenCredit.toString());
    }
    if (calcResults.otherCredit > 0) {
      setText(form, FIELDS.step3b, calcResults.otherCredit.toString());
    }
    if (calcResults.totalCredits > 0) {
      setText(form, FIELDS.step3Total, calcResults.totalCredits.toString());
    }

    // Step 4a: Other income
    if (calcResults.otherIncome > 0) {
      setText(form, FIELDS.step4a, calcResults.otherIncome.toString());
    }

    // Step 4b: Deductions (OBBBA deductions go here)
    if (calcResults.deductions > 0) {
      setText(form, FIELDS.step4b, calcResults.deductions.toString());
    }

    // Step 4c: Extra withholding per paycheck
    if (calcResults.extraWithholding > 0) {
      setText(form, FIELDS.step4c, calcResults.extraWithholding.toString());
    }

    // ==========================================
    // Flatten and return PDF
    // ==========================================
    form.flatten();
    const filledPdf = await pdfDoc.save();

    return {
      statusCode: 200,
      headers: {
        ...headers,
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="W4-2026-TaxFlow.pdf"'
      },
      body: Buffer.from(filledPdf).toString('base64'),
      isBase64Encoded: true
    };

  } catch (error) {
    console.error('Error generating W-4:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: error.message || 'Failed to generate PDF',
        hint: 'Please try again or contact support'
      })
    };
  }
};

// ==========================================
// Helper Functions
// ==========================================

function setText(form, fieldName, value) {
  try {
    const field = form.getTextField(fieldName);
    field.setText(value || '');
  } catch (e) {
    console.warn('Field not found:', fieldName);
  }
}

function setCheck(form, fieldName) {
  try {
    const checkbox = form.getCheckBox(fieldName);
    checkbox.check();
  } catch (e) {
    console.warn('Checkbox not found:', fieldName);
  }
}

function upper(value) {
  return (value || '').toString().toUpperCase();
}

function formatSSN(ssn) {
  if (!ssn) return '';
  const digits = ssn.replace(/\D/g, '');
  if (digits.length !== 9) return ssn;
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

function findFirstTextField(form, candidates) {
  for (const name of candidates) {
    try {
      const field = form.getTextField(name);
      field.getText(); // Validate field exists
      return { name, field };
    } catch (e) {
      // Continue to next candidate
    }
  }
  return null;
}

// ==========================================
// Optional: Whop API Verification
// ==========================================

async function verifyWhopToken(membershipId) {
  const apiKey = process.env.WHOP_API_KEY;
  if (!apiKey) {
    console.warn('WHOP_API_KEY not set - skipping verification');
    return true; // Allow in dev if no key set
  }

  try {
    const response = await fetch(`https://api.whop.com/api/v2/memberships/${membershipId}`, {
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    });

    if (!response.ok) {
      console.warn('Whop verification failed:', response.status);
      return false;
    }

    const membership = await response.json();
    
    // Check if membership is valid (not expired, not canceled)
    const validStatuses = ['active', 'trialing', 'past_due'];
    return validStatuses.includes(membership.status);
    
  } catch (err) {
    console.error('Whop API error:', err);
    return false;
  }
}
