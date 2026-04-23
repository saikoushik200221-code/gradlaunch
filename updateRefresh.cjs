const fs = require('fs');
let c = fs.readFileSync('frontend/src/components/AppShell.jsx', 'utf8');

const newFetchJobs = `  const forceScrapeAndFetch = async () => {
    setLoading(true);
    try {
      // Force the backend to scrape immediately
      await fetch(\`\${API}/api/jobs/scrape\`, { 
        method: 'POST', 
        headers: token ? { Authorization: \`Bearer \${token}\` } : {} 
      });
      // Fetch the newly scraped jobs
      const res = await fetch(\`\${API}/api/jobs?limit=100\`, { headers: token ? { Authorization: \`Bearer \${token}\` } : {} });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : (data.jobs || []));
    } catch (e) {}
    setLoading(false);
  };
  
  const fetchJobs = async () => {
    setLoading(true);
    try {
      const res = await fetch(\`\${API}/api/jobs?limit=100\`, { headers: token ? { Authorization: \`Bearer \${token}\` } : {} });
      const data = await res.json();
      setJobs(Array.isArray(data) ? data : (data.jobs || []));
    } catch (e) {}
    setLoading(false);
  };`;

c = c.replace(
  /const fetchJobs = async \(\) => \{[\s\S]*?setLoading\(false\);\n  \};/,
  newFetchJobs
);

c = c.replace(
  'onRefresh={fetchJobs}',
  'onRefresh={forceScrapeAndFetch}'
);

fs.writeFileSync('frontend/src/components/AppShell.jsx', c);
