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
    const portfolioData = transformLinkedInData(csvData);
    
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
    const portfolioData = transformLinkedInData(csvData);
    
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
    }
  }

  return csvData;
}

/**
 * Parse profile CSV
 */
function parseProfileCSV(csvContent) {
  const lines = csvContent.split('\n');
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
  const headers = lines[0].split(',').map(h => h.trim());
  const skills = [];
  
  for (let i = 1; i < lines.length; i++) {
    const data = lines[i].split(',').map(d => d.trim());
    const skill = {};
    headers.forEach((header, index) => {
      skill[header.toLowerCase()] = data[index] || '';
    });
    skills.push(skill);
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
function transformLinkedInData(csvData) {
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
    const categories = {
      'Languages': [],
      'Frontend': [],
      'Backend': [],
      'Databases': [],
      'DevOps & Cloud': [],
      'Tools': [],
      'Other': []
    };

    const skillCategories = {
      'Languages': [
        'python', 'java', 'javascript', 'typescript', 'go', 'c++', 'c#', 'php', 'ruby', 'swift', 'kotlin', 'rust'
      ],
      'Frontend': [
        'react', 'vue', 'angular', 'html', 'css', 'sass', 'less', 'bootstrap', 'tailwind', 'redux', 'next.js', 'nuxt.js'
      ],
      'Backend': [
        'node.js', 'express', 'django', 'flask', 'fastapi', 'spring', 'spring boot', 'spring mvc', 'laravel', 'asp.net',
        'spring framework', 'spring security', 'hibernate', 'thymeleaf', 'gradle', 'maven', 'celery'
      ],
      'Databases': [
        'mongodb', 'postgresql', 'mysql', 'sqlite', 'redis', 'elasticsearch', 'big data', 'data analytics', 'sql'
      ],
      'DevOps & Cloud': [
        'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'gitlab', 'ci/cd', 'terraform', 'ansible'
      ],
      'Tools': [
        'git', 'github', 'jira', 'confluence', 'notion', 'postman', 'vagrant', 'inno setup', 'linux'
      ]
    };

    csvData.skills.forEach(skill => {
      const skillName = skill.name || skill.skill_name || skill;
      const skillLevel = skill.level || skill.proficiency || 'intermediate';
      
      let category = 'Other';
      const skillNameLower = skillName.toLowerCase();
      
      // Simple and clear matching
      for (const [catName, catSkills] of Object.entries(skillCategories)) {
        if (catSkills.some(catSkill => skillNameLower.includes(catSkill.toLowerCase()))) {
          category = catName;
          break;
        }
      }
      
      if (!categories[category]) {
        categories[category] = [];
      }
      
      categories[category].push({
        name: skillName,
        level: skillLevel
      });
    });

    // Remove empty categories
    const filteredCategories = {};
    Object.entries(categories).forEach(([category, skills]) => {
      if (skills.length > 0) {
        filteredCategories[category] = skills;
      }
    });

    portfolioData.skills = {
      skillCategories: filteredCategories
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

export default router; 