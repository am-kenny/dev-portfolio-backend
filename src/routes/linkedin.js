import express from 'express';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { writeSectionData } from './portfolio.js';

const router = express.Router();

// Configure multer for CSV file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 10 // Max 10 files
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'), false);
    }
  }
});

/**
 * POST /api/linkedin/preview-csv
 * Preview CSV data without saving
 */
router.post('/preview-csv', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No CSV files uploaded' 
      });
    }

    const csvData = await parseLinkedInCSV(req.files);
    const categorization = req.body.categorization || {
      useSubcategories: true,
      minSkillsForSubcategory: 3,
      categoryOverrides: {}
    };
    const portfolioData = transformLinkedInData(csvData, categorization);
    
    res.json({ 
      message: 'CSV data preview',
      portfolioData,
      sections: Object.keys(portfolioData),
      fileCount: req.files.length
    });
  } catch (error) {
    console.error('Error previewing CSV data:', error);
    res.status(500).json({ 
      error: 'Failed to preview CSV data',
      details: error.message 
    });
  }
});

/**
 * POST /api/linkedin/upload-csv
 * Upload and import CSV files
 */
router.post('/upload-csv', authenticateToken, upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        error: 'No CSV files uploaded' 
      });
    }

    const csvData = await parseLinkedInCSV(req.files);
    const categorization = req.body.categorization || {
      useSubcategories: true,
      minSkillsForSubcategory: 3,
      categoryOverrides: {}
    };
    const portfolioData = transformLinkedInData(csvData, categorization);
    
    // Save to portfolio sections
    await saveToPortfolio(portfolioData);
    
    res.json({ 
      message: 'LinkedIn CSV data imported successfully',
      sections: Object.keys(portfolioData),
      fileCount: req.files.length,
      importedData: {
        profile: csvData.profile ? 'Yes' : 'No',
        positions: csvData.positions?.length || 0,
        skills: csvData.skills?.length || 0,
        education: csvData.education?.length || 0
      }
    });
  } catch (error) {
    console.error('Error importing CSV data:', error);
    res.status(500).json({ 
      error: 'Failed to import CSV data',
      details: error.message 
    });
  }
});

/**
 * Parse LinkedIn CSV files
 */
async function parseLinkedInCSV(files) {
  const csvData = {
    profile: null,
    positions: [],
    skills: [],
    education: []
  };

  for (const file of files) {
    const fileName = file.originalname.toLowerCase();
    const csvContent = file.buffer.toString('utf-8');
    
    try {
      if (fileName.includes('profile')) {
        csvData.profile = parseProfileCSV(csvContent);
      } else if (fileName.includes('position')) {
        csvData.positions = parsePositionsCSV(csvContent);
      } else if (fileName.includes('skill')) {
        csvData.skills = parseSkillsCSV(csvContent);
      } else if (fileName.includes('education')) {
        csvData.education = parseEducationCSV(csvContent);
      }
    } catch (error) {
      console.error(`Error parsing ${fileName}:`, error);
      // Continue with other files even if one fails
      // You might want to add this error to the response
    }
  }

  return csvData;
}

/**
 * Parse profile CSV
 */
function parseProfileCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  if (lines.length < 2) {
    throw new Error('Profile CSV must have at least header and one data row');
  }
  
  const headers = lines[0].split(',').map(h => h.trim());
  const data = lines[1].split(',').map(d => d.trim());
  
  const profile = {};
  headers.forEach((header, index) => {
    profile[header.toLowerCase()] = data[index] || '';
  });
  
  return profile;
}

/**
 * Parse positions CSV
 */
function parsePositionsCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const positions = [];
  
  for (let i = 1; i < lines.length; i++) {
    const data = lines[i].split(',').map(d => d.trim());
    const position = {};
    headers.forEach((header, index) => {
      position[header.toLowerCase()] = data[index] || '';
    });
    positions.push(position);
  }
  
  return positions;
}

/**
 * Parse skills CSV
 */
function parseSkillsCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  
  // Handle simple skills format (just names)
  if (lines.length === 0) return [];
  
  const skills = [];
  
  // Check if it's a simple format with just skill names
  if (lines.length === 1 || (lines.length > 1 && lines[0].toLowerCase().includes('name'))) {
    // Simple format: just skill names, one per line
    for (let i = 1; i < lines.length; i++) {
      const skillName = lines[i].trim();
      if (skillName) {
        skills.push({
          name: skillName,
          level: 'intermediate' // Default level
        });
      }
    }
  } else {
    // Complex format with headers
    const headers = lines[0].split(',').map(h => h.trim());
    
    for (let i = 1; i < lines.length; i++) {
      const data = lines[i].split(',').map(d => d.trim());
      const skill = {};
      headers.forEach((header, index) => {
        skill[header.toLowerCase()] = data[index] || '';
      });
      skills.push(skill);
    }
  }
  
  return skills;
}

/**
 * Parse education CSV
 */
function parseEducationCSV(csvContent) {
  const lines = csvContent.split('\n').filter(line => line.trim());
  const headers = lines[0].split(',').map(h => h.trim());
  const education = [];
  
  for (let i = 1; i < lines.length; i++) {
    const data = lines[i].split(',').map(d => d.trim());
    const edu = {};
    headers.forEach((header, index) => {
      edu[header.toLowerCase()] = data[index] || '';
    });
    education.push(edu);
  }
  
  return education;
}

/**
 * Transform LinkedIn data to portfolio format
 */
function transformLinkedInData(csvData, userPreferences = {
  useSubcategories: true,
  minSkillsForSubcategory: 3,
  categoryOverrides: {}
}) {
  const portfolioData = {};

  // Transform profile data
  if (csvData.profile) {
    portfolioData.personalInfo = {
      name: csvData.profile.full_name || csvData.profile.name || 'Your Name',
      title: csvData.profile.headline || csvData.profile.title || 'Software Developer',
      location: csvData.profile.location || 'Your Location',
      bio: csvData.profile.summary || 'A passionate software developer...'
    };

    portfolioData.about = {
      content: csvData.profile.summary || 'I am a passionate software developer...'
    };
  }

  // Transform positions data
  if (csvData.positions && csvData.positions.length > 0) {
    portfolioData.experience = {
      jobs: csvData.positions.map(position => ({
        title: position.title || position.job_title || 'Software Developer',
        company: position.company || position.organization || 'Company Name',
        startDate: position.start_date || position.from || '2023-01',
        endDate: position.end_date || position.to || null,
        isCurrent: position.is_current === 'true' || position.current === 'true' || false,
        location: position.location || 'remote',
        country: position.country || 'Your Country',
        city: position.city || 'Your City',
        description: position.description || 'Develop and maintain web applications...',
        achievements: position.achievements ? position.achievements.split(';') : [
          'Developed and deployed 3 major features',
          'Improved application performance by 30%'
        ],
        skills: position.skills ? position.skills.split(',').map(s => s.trim()) : ['React', 'Node.js', 'JavaScript']
      }))
    };
  }

  // Transform skills data
  if (csvData.skills && csvData.skills.length > 0) {
    // Role-based hierarchy with subcategories
    const roleCategories = {
      'Frontend Development': {
        'Languages': ['javascript', 'typescript', 'html', 'css'],
        'Frameworks': ['react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt.js'],
        'Styling': ['sass', 'less', 'bootstrap', 'tailwind', 'styled-components'],
        'Build Tools': ['webpack', 'vite', 'parcel', 'gulp']
      },
      'Backend Development': {
        'Languages': ['python', 'java', 'c#', 'go', 'php', 'ruby', 'node.js'],
        'Frameworks': ['express', 'django', 'spring', 'fastapi', 'laravel', 'asp.net'],
        'APIs': ['rest', 'graphql', 'grpc', 'soap'],
        'Architecture': ['microservices', 'monolith', 'serverless', 'event-driven']
      },
      'Data & Analytics': {
        'Databases': ['mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch'],
        'Big Data': ['hadoop', 'spark', 'kafka', 'airflow', 'snowflake'],
        'Analytics': ['tableau', 'power bi', 'python pandas', 'numpy'],
        'Machine Learning': ['tensorflow', 'pytorch', 'scikit-learn', 'keras']
      },
      'DevOps & Infrastructure': {
        'Cloud': ['aws', 'azure', 'google cloud', 'gcp'],
        'Containers': ['docker', 'kubernetes', 'podman', 'rancher'],
        'CI/CD': ['jenkins', 'gitlab ci', 'github actions', 'circleci'],
        'Monitoring': ['prometheus', 'grafana', 'elk stack', 'datadog']
      },
      'Tools & Platforms': {
        'Version Control': ['git', 'github', 'gitlab', 'bitbucket'],
        'Project Management': ['jira', 'confluence', 'notion', 'trello'],
        'Development': ['vs code', 'intellij', 'postman', 'swagger'],
        'Testing': ['jest', 'cypress', 'selenium', 'junit']
      },
      'Other': {
        'General': ['leadership', 'communication', 'problem solving', 'teamwork'],
        'Soft Skills': ['presentation', 'negotiation', 'mentoring', 'collaboration'],
        'Domain Knowledge': ['finance', 'healthcare', 'ecommerce', 'education'],
        'Certifications': ['pmp', 'scrum', 'agile', 'six sigma']
      }
    };



    // Categorize skills
    const categorizedSkills = {};
    
    csvData.skills.forEach(skill => {
      const skillName = skill.name || skill.skill_name || skill;
      const skillLevel = skill.level || skill.proficiency || 'intermediate';
      const skillNameLower = skillName.toLowerCase();
      
      let assignedRole = 'Other';
      let assignedSubcategory = null;
      
      // Find the best matching role and subcategory
      for (const [role, subcategories] of Object.entries(roleCategories)) {
        if (typeof subcategories === 'object' && !Array.isArray(subcategories)) {
          // Check subcategories
          for (const [subcategory, skills] of Object.entries(subcategories)) {
            if (skills.some(skillKeyword => {
              const keyword = skillKeyword.toLowerCase();
              return skillNameLower.includes(keyword) || 
                     skillNameLower.includes(keyword.replace(' ', '')) ||
                     skillNameLower.includes(keyword.replace(' ', '-')) ||
                     skillNameLower.includes(keyword.replace(' ', '.')) ||
                     skillNameLower.includes(keyword.replace(' ', '_'));
            })) {
              assignedRole = role;
              assignedSubcategory = subcategory;
              break;
            }
          }
          if (assignedRole !== 'Other') break; // Stop if we found a match
        } else if (Array.isArray(subcategories)) {
          // Check role-level skills
          if (subcategories.some(skillKeyword => {
            const keyword = skillKeyword.toLowerCase();
            return skillNameLower.includes(keyword) || 
                   skillNameLower.includes(keyword.replace(' ', '')) ||
                   skillNameLower.includes(keyword.replace(' ', '-')) ||
                   skillNameLower.includes(keyword.replace(' ', '.')) ||
                   skillNameLower.includes(keyword.replace(' ', '_'));
          })) {
            assignedRole = role;
            break;
          }
        }
      }
      
      // Initialize role if not exists
      if (!categorizedSkills[assignedRole]) {
        categorizedSkills[assignedRole] = {};
      }
      
      // Add to appropriate subcategory or role level
      if (assignedSubcategory) {
        if (!categorizedSkills[assignedRole][assignedSubcategory]) {
          categorizedSkills[assignedRole][assignedSubcategory] = [];
        }
        categorizedSkills[assignedRole][assignedSubcategory].push({
          name: skillName,
          level: skillLevel
        });
      } else {
        if (!categorizedSkills[assignedRole]['Other']) {
          categorizedSkills[assignedRole]['Other'] = [];
        }
        categorizedSkills[assignedRole]['Other'].push({
          name: skillName,
          level: skillLevel
        });
      }
    });

    // Apply user preferences and smart defaults
    const finalSkills = {};
    
    // Define the preferred order of roles
    const roleOrder = [
      'Frontend Development',
      'Backend Development', 
      'Data & Analytics',
      'DevOps & Infrastructure',
      'Tools & Platforms',
      'Other'
    ];
    
    // Sort roles by preferred order
    const sortedRoles = Object.keys(categorizedSkills).sort((a, b) => {
      const aIndex = roleOrder.indexOf(a);
      const bIndex = roleOrder.indexOf(b);
      return aIndex - bIndex;
    });
    
    sortedRoles.forEach(role => {
      const subcategories = categorizedSkills[role];
      const userOverride = userPreferences.categoryOverrides?.[role];
      const totalSkills = Object.values(subcategories).flat().length;
      
      if (userOverride === 'flat' || (!userPreferences.useSubcategories && totalSkills < userPreferences.minSkillsForSubcategory)) {
        // Flatten the structure
        finalSkills[role] = Object.values(subcategories).flat();
      } else if (userOverride === 'subcategories' || (userPreferences.useSubcategories && totalSkills >= userPreferences.minSkillsForSubcategory)) {
        // Use subcategories, but remove empty ones
        const filteredSubcategories = {};
        Object.entries(subcategories).forEach(([subcategory, skills]) => {
          if (skills.length > 0) {
            filteredSubcategories[subcategory] = skills;
          }
        });
        finalSkills[role] = filteredSubcategories;
      } else {
        // Default to flat for small categories
        finalSkills[role] = Object.values(subcategories).flat();
      }
    });

    portfolioData.skills = {
      skillCategories: finalSkills,
      categorization: {
        useSubcategories: userPreferences.useSubcategories,
        minSkillsForSubcategory: userPreferences.minSkillsForSubcategory,
        categoryOverrides: userPreferences.categoryOverrides || {}
      }
    };
  }

  // Transform education data
  if (csvData.education && csvData.education.length > 0) {
    portfolioData.education = {
      degrees: csvData.education.map(edu => ({
        degree: edu.degree || edu.degree_name || 'Bachelor\'s Degree',
        school: edu.school || edu.institution || 'University Name',
        field: edu.field || edu.major || 'Computer Science',
        startDate: edu.start_date || edu.from || '2019-09',
        endDate: edu.end_date || edu.to || '2023-05',
        description: edu.description || 'Relevant coursework and projects...'
      }))
    };
  }

  return portfolioData;
}

/**
 * Save portfolio data to files
 */
async function saveToPortfolio(portfolioData) {
  const sections = ['personalInfo', 'about', 'skills', 'experience', 'education'];
  
  for (const section of sections) {
    if (portfolioData[section]) {
      try {
        await writeSectionData(section, portfolioData[section]);
        console.log(`Updated ${section}.json with LinkedIn CSV data`);
      } catch (error) {
        console.error(`Error updating ${section}.json:`, error);
      }
    }
  }
}

/**
 * GET /api/linkedin/configure-categorization
 * Get current skill categorization preferences
 */
router.get('/configure-categorization', authenticateToken, async (req, res) => {
  try {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const preferencesPath = path.join(process.cwd(), 'data', 'categorization.json');
    
    try {
      const data = await fs.readFile(preferencesPath, 'utf8');
      const preferences = JSON.parse(data);
      res.json(preferences);
    } catch (error) {
      if (error.code === 'ENOENT') {
        // Return default preferences if file doesn't exist
        const defaultPreferences = {
          useSubcategories: true,
          minSkillsForSubcategory: 3,
          categoryOverrides: {}
        };
        res.json(defaultPreferences);
      } else {
        throw error;
      }
    }
  } catch (error) {
    console.error('Error fetching categorization preferences:', error);
    res.status(500).json({ 
      error: 'Failed to fetch categorization preferences',
      details: error.message 
    });
  }
});

/**
 * POST /api/linkedin/configure-categorization
 * Configure skill categorization preferences
 */
router.post('/configure-categorization', authenticateToken, async (req, res) => {
  try {
    const { categorization } = req.body;
    
    if (!categorization) {
      return res.status(400).json({ 
        error: 'Categorization preferences are required' 
      });
    }

    // Validate categorization preferences
    const validPreferences = {
      useSubcategories: categorization.useSubcategories ?? true,
      minSkillsForSubcategory: categorization.minSkillsForSubcategory ?? 3,
      categoryOverrides: categorization.categoryOverrides || {}
    };

    // Save preferences to file
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const preferencesPath = path.join(process.cwd(), 'data', 'categorization.json');
    await fs.writeFile(preferencesPath, JSON.stringify(validPreferences, null, 2));

    res.json({ 
      message: 'Categorization preferences updated successfully',
      preferences: validPreferences
    });
  } catch (error) {
    console.error('Error configuring categorization:', error);
    res.status(500).json({ 
      error: 'Failed to configure categorization',
      details: error.message 
    });
  }
});

export default router; 