const { PDFDocument } = require('pdf-lib');

// Verified 2026 W-4 Field IDs (extracted from IRS PDF)
const FIELDS = {
  // Step 1a: Personal Info
  name: 'topmostSubform[0].Page1[0].Step1a[0].f1_01[0]',
  address: 'topmostSubform[0].Page1[0].Step1a[0].f1_02[0]',
  cityStateZip: 'topmostSubform[0].Page1[0].Step1a[0].f1_03[0]',
  ssn: 'topmostSubform[0].Page1[0].Step1a[0].f1_04[0]',
  
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

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { userData, calcResults } = JSON.parse(event.body);

    // Fetch the 2026 W-4 PDF from IRS
    const pdfUrl = 'https://www.irs.gov/pub/irs-pdf/fw4.pdf';
    const pdfResponse = await fetch(pdfUrl);
    
    if (!pdfResponse.ok) {
      throw new Error('Failed to fetch W-4 PDF from IRS');
    }
    
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    const form = pdfDoc.getForm();

    // Fill personal info
    setText(form, FIELDS.name, `${userData.firstName || ''} ${userData.lastName || ''}`.trim());
    setText(form, FIELDS.address, userData.address || '');
    setText(form, FIELDS.cityStateZip, `${userData.city || ''}, ${userData.state || ''} ${userData.zip || ''}`.trim());
    setText(form, FIELDS.ssn, formatSSN(userData.ssn));

    // Filing status
    const filingMap = {
      'single': FIELDS.single,
      'mfs': FIELDS.single,
      'married': FIELDS.married,
      'widow': FIELDS.married,
      'head': FIELDS.hoh
    };
    if (filingMap[userData.filing]) {
      setCheck(form, filingMap[userData.filing]);
    }

    // Step 2c: Multiple jobs
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

    // Step 4b: Deductions (OBBBA)
    if (calcResults.deductions > 0) {
      setText(form, FIELDS.step4b, calcResults.deductions.toString());
    }

    // Step 4c: Extra withholding
    if (calcResults.extraWithholding > 0) {
      setText(form, FIELDS.step4c, calcResults.extraWithholding.toString());
    }

    // Flatten and return
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
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || 'Failed to generate PDF' })
    };
  }
};

function setText(form, field, value) {
  try {
    form.getTextField(field).setText(value);
  } catch (e) {
    console.warn('Field not found:', field);
  }
}

function setCheck(form, field) {
  try {
    form.getCheckBox(field).check();
  } catch (e) {
    console.warn('Checkbox not found:', field);
  }
}

function formatSSN(ssn) {
  if (!ssn) return '';
  const d = ssn.replace(/\D/g, '');
  if (d.length !== 9) return ssn;
  return `${d.slice(0,3)}-${d.slice(3,5)}-${d.slice(5)}`;
}
