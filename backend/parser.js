const pdf = require('pdf-parse');

/**
 * Extracts text from a PDF buffer.
 * @param {Buffer} dataBuffer 
 * @returns {Promise<string>}
 */
async function parseResumePDF(dataBuffer) {
    try {
        const data = await pdf(dataBuffer);
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
