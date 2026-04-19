// Lazy load pdf-parse only when needed (optional dependency)
let pdf = null;

async function getPDFParser() {
    if (!pdf) {
        try {
            pdf = require('pdf-parse');
        } catch (e) {
            console.warn('[Parser] pdf-parse not available, PDF parsing disabled');
            return null;
        }
    }
    return pdf;
}

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} dataBuffer 
 * @returns {Promise<string>}
 */
async function parseResumePDF(dataBuffer) {
    try {
        const pdfParser = await getPDFParser();
        if (!pdfParser) {
            throw new Error('PDF parsing library not available');
        }
        const data = await pdfParser(dataBuffer);
        // Clean up the text: remove excessive newlines and whitespace
        return data.text
            .replace(/\n\s*\n/g, '\n') // Remove empty lines
            .replace(/[ \t]+/g, ' ')   // Collapse horizontal whitespace
            .trim();
    } catch (error) {
        console.error('[Parser] Error parsing PDF:', error);
        throw new Error('Failed to parse resume PDF');
    }
}

module.exports = {
    parseResumePDF
};
