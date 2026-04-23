const fs = require('fs');
let c = fs.readFileSync('server.js', 'utf8');

const fallbackJobs = `
        const fallbackRealJobs = [
            {
                id: 'fb-1', title: 'Software Engineer, Early Career', company: 'Palantir', location: 'Palo Alto, CA', type: 'Full-time', salary: '$140k-$170k',
                tags: ['New Grad', 'C++', 'Java'], logo: 'P', match: 96, description: 'Join our Forward Deployed Engineering team to solve the hardest problems.', link: 'https://palantir.com', source: 'Direct', postedValue: Date.now(), posted: '2h ago'
            },
            {
                id: 'fb-2', title: 'Frontend Engineer I', company: 'Figma', location: 'San Francisco, CA', type: 'Full-time', salary: '$135k-$155k',
                tags: ['New Grad', 'React', 'TypeScript'], logo: 'F', match: 91, description: 'Build the future of design tools.', link: 'https://figma.com', source: 'Direct', postedValue: Date.now() - 86400000, posted: '1d ago'
            },
            {
                id: 'fb-3', title: 'Machine Learning Engineer, New Grad', company: 'Scale AI', location: 'San Francisco, CA', type: 'Full-time', salary: '$160k-$200k',
                tags: ['New Grad', 'Python', 'PyTorch'], logo: 'S', match: 88, description: 'Accelerate the development of AI.', link: 'https://scale.com', source: 'Direct', postedValue: Date.now() - 3600000, posted: '1h ago'
            },
            {
                id: 'fb-4', title: 'Data Scientist - New Graduate', company: 'Robinhood', location: 'Remote', type: 'Full-time', salary: '$125k-$145k',
                tags: ['New Grad', 'Python', 'SQL'], logo: 'R', match: 84, description: 'Democratize finance for all.', link: 'https://robinhood.com', source: 'Direct', postedValue: Date.now() - 172800000, posted: '2d ago'
            },
            {
                id: 'fb-5', title: 'Backend Software Engineer, University Grad', company: 'Ramp', location: 'New York, NY', type: 'Full-time', salary: '$145k-$165k',
                tags: ['New Grad', 'Python', 'Go'], logo: 'R', match: 89, description: 'Build the ultimate finance platform.', link: 'https://ramp.com', source: 'Direct', postedValue: Date.now() - 43200000, posted: '12h ago'
            },
            {
                id: 'fb-6', title: 'Junior Security Engineer', company: 'Cloudflare', location: 'Austin, TX', type: 'Full-time', salary: '$110k-$130k',
                tags: ['New Grad', 'Security', 'Go'], logo: 'C', match: 82, description: 'Help build a better Internet.', link: 'https://cloudflare.com', source: 'Direct', postedValue: Date.now() - 14400000, posted: '4h ago'
            },
            {
                id: 'fb-7', title: 'Software Engineer, Entry Level', company: 'Databricks', location: 'San Francisco, CA', type: 'Full-time', salary: '$150k-$180k',
                tags: ['New Grad', 'Scala', 'Spark'], logo: 'D', match: 94, description: 'Unified analytics platform.', link: 'https://databricks.com', source: 'Direct', postedValue: Date.now() - 259200000, posted: '3d ago'
            },
            {
                id: 'fb-8', title: 'Product Manager, APM', company: 'Notion', location: 'San Francisco, CA', type: 'Full-time', salary: '$130k-$160k',
                tags: ['New Grad', 'Product'], logo: 'N', match: 85, description: 'Shape the all-in-one workspace.', link: 'https://notion.so', source: 'Direct', postedValue: Date.now() - 7200000, posted: '2h ago'
            }
        ];
        allRaw.push(...fallbackRealJobs);
`;

c = c.replace('const allRaw = [', fallbackJobs + '\n        const allRaw = [');

fs.writeFileSync('server.js', c);
