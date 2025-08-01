import fs from 'fs/promises';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Get the data directory path
const getDataDirPath = () => join(__dirname, '../../data');
const getExampleDataDirPath = () => join(__dirname, '../../data_example');

// Placeholder data templates
const placeholderData = {
  personalInfo: {
    name: "Your Name",
    title: "Software Developer",
    location: "Your City, Country",
    bio: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  },
  about: {
    content: "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum."
  },
  skills: {
    skillCategories: {
      "Frontend": [
        {
          "name": "React",
          "level": "intermediate"
        },
        {
          "name": "JavaScript",
          "level": "advanced"
        },
        {
          "name": "HTML/CSS",
          "level": "advanced"
        }
      ],
      "Backend": [
        {
          "name": "Node.js",
          "level": "intermediate"
        },
        {
          "name": "Express",
          "level": "intermediate"
        }
      ],
      "Database": [
        {
          "name": "MongoDB",
          "level": "intermediate"
        },
        {
          "name": "PostgreSQL",
          "level": "intermediate"
        }
      ]
    }
  },
  experience: {
    jobs: [
      {
        "title": "Software Developer",
        "company": "Your Company",
        "startDate": "2023-01",
        "endDate": null,
        "isCurrent": true,
        "location": "remote",
        "country": "Your Country",
        "city": "Your City",
        "description": "Description 1",
        "achievements": [
          "Achievement 1",
          "Achievement 2",
          "Achievement 3"
        ],
        "skills": ["React", "Node.js", "JavaScript", "Git"]
      }
    ]
  },
  projects: {
    projects: [
      {
        "name": "Portfolio Website",
        "description": "A personal portfolio website built with modern web technologies. Features include responsive design, dynamic content management, and contact forms.",
        "image": "https://picsum.photos/300/200",
        "github": "https://github.com/yourusername/portfolio",
        "technologies": ["React", "Node.js", "Express", "MongoDB"]
      },
      {
        "name": "Application Name",
        "description": "Description 2",
        "image": "https://picsum.photos/300/200",
        "github": "https://github.com/yourusername/applicationname",
        "technologies": ["React", "Socket.io", "Express", "PostgreSQL"]
      }
    ]
  },
  contact: {
    "email": "your.email@example.com",
    "phone": "+1 (555) 123-4567",
    "socialLinks": [
      {
        "platform": "github",
        "url": "https://github.com/yourusername"
      },
      {
        "platform": "linkedin",
        "url": "https://www.linkedin.com/in/yourusername/"
      }
    ]
  }
};

/**
 * Initialize the data directory with placeholder data
 */
export const initializeDataDirectory = async () => {
  const dataDirPath = getDataDirPath();
  const exampleDataDirPath = getExampleDataDirPath();
  
  try {
    // Check if data directory exists
    await fs.access(dataDirPath);
    console.log('Data directory already exists');
    return;
  } catch (error) {
    // Directory doesn't exist, create it
    console.log('Creating data directory...');
    await fs.mkdir(dataDirPath, { recursive: true });
  }

  // Check if example data exists and copy it instead of using placeholder data
  try {
    await fs.access(exampleDataDirPath);
    console.log('Example data found, copying from data_example/...');
    await copyExampleData();
  } catch (error) {
    // No example data, use placeholder data
    console.log('No example data found, creating placeholder data files...');
    await createPlaceholderData();
  }
  
  console.log('Data directory initialization completed!');
  console.log('Please update the data in the data/ folder with your actual information.');
};

/**
 * Copy data from example folder
 */
const copyExampleData = async () => {
  const dataDirPath = getDataDirPath();
  const exampleDataDirPath = getExampleDataDirPath();
  const sections = ['personalInfo', 'about', 'skills', 'experience', 'projects', 'contact'];
  
  for (const section of sections) {
    const sourcePath = join(exampleDataDirPath, `${section}.json`);
    const destPath = join(dataDirPath, `${section}.json`);
    
    try {
      const data = await fs.readFile(sourcePath, 'utf8');
      await fs.writeFile(destPath, data, 'utf8');
      console.log(`Copied ${section}.json from example data`);
    } catch (error) {
      console.error(`Error copying ${section}.json:`, error);
      // Fallback to placeholder data for this section
      await createPlaceholderDataForSection(section);
    }
  }
};

/**
 * Create placeholder data files
 */
const createPlaceholderData = async () => {
  const dataDirPath = getDataDirPath();
  const sections = Object.keys(placeholderData);
  
  for (const section of sections) {
    await createPlaceholderDataForSection(section);
  }
};

/**
 * Create placeholder data for a specific section
 */
const createPlaceholderDataForSection = async (section) => {
  const dataDirPath = getDataDirPath();
  const filePath = join(dataDirPath, `${section}.json`);
  const data = JSON.stringify(placeholderData[section], null, 2);
  
  try {
    await fs.writeFile(filePath, data, 'utf8');
    console.log(`Created ${section}.json with placeholder data`);
  } catch (error) {
    console.error(`Error creating ${section}.json:`, error);
  }
};

/**
 * Check if data directory exists and has all required files
 */
export const checkDataDirectory = async () => {
  const dataDirPath = getDataDirPath();
  const requiredFiles = ['personalInfo.json', 'about.json', 'skills.json', 'experience.json', 'projects.json', 'contact.json'];
  
  try {
    await fs.access(dataDirPath);
    
    // Check if all required files exist
    for (const file of requiredFiles) {
      try {
        await fs.access(join(dataDirPath, file));
      } catch (error) {
        console.warn(`Missing file: ${file}`);
        return false;
      }
    }
    
    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Reset data directory to placeholder data (useful for development)
 */
export const resetDataDirectory = async () => {
  const dataDirPath = getDataDirPath();
  
  try {
    // Remove existing data directory
    await fs.rm(dataDirPath, { recursive: true, force: true });
    console.log('Removed existing data directory');
  } catch (error) {
    console.log('No existing data directory to remove');
  }
  
  // Reinitialize with placeholder data
  await initializeDataDirectory();
  console.log('Data directory reset to placeholder data');
}; 