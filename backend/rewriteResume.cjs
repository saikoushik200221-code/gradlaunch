const fs = require('fs');
let c = fs.readFileSync('routes/resume.js', 'utf8');

c = c.replace(
  "const Anthropic = require('@anthropic-ai/sdk');",
  "const { GoogleGenAI } = require('@google/genai');"
);
c = c.replace(
  "const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });",
  "const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });"
);

c = c.replace(
  /const parseResp = await anthropic\.messages\.create\(\{[\s\S]*?\}\);[\s\S]*?const parsedText = parseResp\.content\[0\]\.text\.trim\(\)\.replace\(\/\^```json\\s\*\|\\s\*```\$\/g, ''\);/,
  `const parseResp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: PARSE_PROMPT + rawText,
    });
 
    const parsedText = parseResp.text.trim().replace(/^\\s*\`\`\`json\\s*|\\s*\`\`\`\\s*$/g, '');`
);

c = c.replace(
  /const resp = await anthropic\.messages\.create\(\{[\s\S]*?\}\);[\s\S]*?const rawOutput = resp\.content\[0\]\.text\.trim\(\)\.replace\(\/\^```json\\s\*\|\\s\*```\$\/g, ''\);/,
  `const resp = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: TAILOR_PROMPT(resume, job_description),
    });
 
    const rawOutput = resp.text.trim().replace(/^\\s*\`\`\`json\\s*|\\s*\`\`\`\\s*$/g, '');`
);

const downloadRoute = `// GET /api/resume/download
router.get('/download', async (req, res) => {
  try {
    const userId = req.user?.id || req.query.user_id || 'demo-user';
    const { job_id } = req.query;

    const resumeRow = await db.execute({
      sql: 'SELECT parsed_json FROM resumes WHERE user_id = ?',
      args: [userId],
    });
    if (resumeRow.rows.length === 0) return res.status(404).send('No resume found');
    const resume = JSON.parse(resumeRow.rows[0].parsed_json);

    let bullets = [];
    if (job_id) {
      const tailoredRow = await db.execute({
        sql: 'SELECT bullets_json FROM tailored_resumes WHERE user_id = ? AND job_id = ?',
        args: [userId, job_id],
      });
      if (tailoredRow.rows.length > 0) {
        bullets = JSON.parse(tailoredRow.rows[0].bullets_json);
      }
    }

    let textOutput = \`\${resume.name || 'Candidate Name'}\\n\${resume.email || ''} | \${resume.phone || ''}\\n\\n\`;
    textOutput += \`EXPERIENCE\\n--------------------------\\n\`;
    (resume.experience || []).forEach((exp, i) => {
      textOutput += \`\${exp.role} at \${exp.company} (\${exp.dates})\\n\`;
      if (bullets.length > 0 && bullets[i]) {
        textOutput += \`- \${bullets[i]}\\n\`;
      } else {
        (exp.bullets || []).forEach(b => { textOutput += \`- \${b}\\n\`; });
      }
      textOutput += \`\\n\`;
    });
    
    textOutput += \`EDUCATION\\n--------------------------\\n\`;
    (resume.education || []).forEach(edu => {
      textOutput += \`\${edu.degree} - \${edu.school} (\${edu.dates})\\n\`;
    });

    res.setHeader('Content-disposition', 'attachment; filename=Tailored_Resume.txt');
    res.setHeader('Content-type', 'text/plain');
    res.send(textOutput);
  } catch (err) {
    res.status(500).send('Error generating resume');
  }
});

`;

c = c.replace('module.exports = router;', downloadRoute + 'module.exports = router;');

fs.writeFileSync('routes/resume.js', c);
