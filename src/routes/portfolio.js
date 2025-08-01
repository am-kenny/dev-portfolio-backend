import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs/promises';
import { authenticateToken } from '../middleware/auth.js';
import { validateSection } from '../validation/schemas.js';

const router = express.Router();

// Get directory name for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const VALID_SECTIONS = ['personalInfo', 'about', 'skills', 'experience', 'projects', 'contact'];

// Helper function to get file path for a section
const getSectionPath = (section) => join(__dirname, `../../data/${section}.json`);

// Helper function to read section data
const readSectionData = async (section) => {
  const data = await fs.readFile(getSectionPath(section), 'utf8');
  const parsedData = JSON.parse(data);
  
  // Sort experience jobs by startDate (newest first)
  if (section === 'experience' && parsedData.jobs) {
    parsedData.jobs.sort((a, b) => {
      // Handle current jobs (isCurrent: true) - they should appear first
      if (a.isCurrent && !b.isCurrent) return -1;
      if (!a.isCurrent && b.isCurrent) return 1;
      
      // For non-current jobs, sort by startDate descending (newest first)
      return new Date(b.startDate) - new Date(a.startDate);
    });
  }
  
  return parsedData;
};

// Helper function to write section data
const writeSectionData = async (section, data) => {
  await fs.writeFile(
    getSectionPath(section),
    JSON.stringify(data, null, 2),
    'utf8'
  );
};

// Get all portfolio data
router.get('/', async (req, res) => {
  try {
    const portfolioData = {};
    for (const section of VALID_SECTIONS) {
      try {
        portfolioData[section] = await readSectionData(section);
      } catch (error) {
        console.error(`Error reading ${section} data:`, error);
        portfolioData[section] = null;
      }
    }
    res.json(portfolioData);
  } catch (error) {
    console.error('Error reading portfolio data:', error);
    res.status(500).json({ error: 'Error reading portfolio data' });
  }
});

// Get specific section
router.get('/:section', async (req, res) => {
  try {
    const { section } = req.params;
    
    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    const data = await readSectionData(section);
    res.json(data);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ error: 'Section not found' });
    }
    console.error('Error reading portfolio section:', error);
    res.status(500).json({ error: 'Error reading portfolio section' });
  }
});

// Update all portfolio data
router.put('/', authenticateToken, async (req, res) => {
  try {
    const newData = req.body;
    const validationErrors = {};
    
    // Validate sections
    for (const section of Object.keys(newData)) {
      if (!VALID_SECTIONS.includes(section)) {
        return res.status(400).json({ error: `Invalid section: ${section}` });
      }

      // Validate section data
      const { error } = validateSection(section, newData[section]);
      if (error) {
        validationErrors[section] = error.details.map(detail => detail.message);
      }
    }

    // If there are validation errors, return them
    if (Object.keys(validationErrors).length > 0) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Update each section
    for (const section of VALID_SECTIONS) {
      if (newData[section]) {
        await writeSectionData(section, newData[section]);
      }
    }

    res.json({ message: 'Portfolio data updated successfully' });
  } catch (error) {
    console.error('Error updating portfolio data:', error);
    res.status(500).json({ error: 'Error updating portfolio data' });
  }
});

// Update specific section
router.put('/:section', authenticateToken, async (req, res) => {
  try {
    const { section } = req.params;
    const newSectionData = req.body;

    if (!VALID_SECTIONS.includes(section)) {
      return res.status(400).json({ error: 'Invalid section' });
    }

    // Validate section data
    const { error, value } = validateSection(section, newSectionData);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation failed',
        details: error.details.map(detail => detail.message)
      });
    }

    // Write validated and sanitized data
    await writeSectionData(section, value);
    res.json({ message: `${section} section updated successfully` });
  } catch (error) {
    console.error('Error updating portfolio section:', error);
    res.status(500).json({ error: 'Error updating portfolio section' });
  }
});

export default router; 