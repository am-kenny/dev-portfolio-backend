import Joi from 'joi';
import { LocationTypes } from '../constants/locationTypes.js';
import { SkillLevels } from '../constants/skillLevels.js';

// Personal Info Schema
export const personalInfoSchema = Joi.object({
  name: Joi.string().min(2).max(100).required(),
  title: Joi.string().min(2).max(100),
  location: Joi.string().min(2).max(100).allow(''),
  bio: Joi.string().min(10).max(500).allow('')
});

// About Schema
export const aboutSchema = Joi.object({
  content: Joi.string().required().min(10).max(1000)
});

// Skills Schema - Supports both flat and hierarchical structures
export const skillsSchema = Joi.object({
  skillCategories: Joi.object().pattern(
    Joi.string(),
    Joi.alternatives().try(
      // Flat structure: array of skills
      Joi.array().items(
        Joi.object({
          name: Joi.string().required().min(1).max(100),
          level: Joi.string().valid(...Object.values(SkillLevels)).required()
        })
      ),
      // Hierarchical structure: object with subcategories
      Joi.object().pattern(
        Joi.string(),
        Joi.array().items(
          Joi.object({
            name: Joi.string().required().min(1).max(100),
            level: Joi.string().valid(...Object.values(SkillLevels)).required()
          })
        )
      )
    )
  ).required(),
  categorization: Joi.object({
    useSubcategories: Joi.boolean().default(true),
    minSkillsForSubcategory: Joi.number().integer().min(1).max(10).default(3),
    categoryOverrides: Joi.object().pattern(
      Joi.string(),
      Joi.string().valid('flat', 'subcategories')
    ).default({})
  }).optional()
});

// Experience Schema
const jobSchema = Joi.object({
  title: Joi.string().required().min(2).max(100),
  company: Joi.string().required().min(2).max(100),
  startDate: Joi.string().required().pattern(/^\d{4}-\d{2}$/), // YYYY-MM
  endDate: Joi.string().allow('').pattern(/^\d{4}-\d{2}$/), // YYYY-MM or empty
  isCurrent: Joi.boolean().required(),
  location: Joi.string().valid(...Object.values(LocationTypes)).required(),
  country: Joi.string().required().min(2).max(100),
  city: Joi.string().required().min(2).max(100),
  description: Joi.string().allow('').max(500),
  achievements: Joi.array().items(Joi.string().min(1).max(200)).default([]),
  skills: Joi.array().items(Joi.string().min(1).max(50)).default([])
});

export const experienceSchema = Joi.object({
  jobs: Joi.array().items(jobSchema).min(0).required()
});

// Projects Schema
const projectSchema = Joi.object({
  name: Joi.string().required().min(2).max(100),
  description: Joi.string().required().min(10).max(500),
  technologies: Joi.array().items(Joi.string().min(1).max(50)).default([]),
  url: Joi.string().uri().allow(''),
  github: Joi.string().uri().allow(''),
  image: Joi.string().uri().allow('')
});

export const projectsSchema = Joi.object({
  projects: Joi.array().items(projectSchema).min(0).required()
});

// Contact Schema
export const contactSchema = Joi.object({
  email: Joi.string().required().email(),
  phone: Joi.string().allow(''),
  socialLinks: Joi.array().items(
    Joi.object({
      platform: Joi.string().required(),
      url: Joi.string().uri().required()
    })
  ).default([])
});

// Map of section names to their schemas
export const schemaMap = {
  personalInfo: personalInfoSchema,
  about: aboutSchema,
  skills: skillsSchema,
  experience: experienceSchema,
  projects: projectsSchema,
  contact: contactSchema
};

// Validation middleware
export const validateSection = (section, data) => {
  const schema = schemaMap[section];
  if (!schema) {
    throw new Error(`No schema found for section: ${section}`);
  }
  
  return schema.validate(data, {
    abortEarly: false, // Return all errors, not just the first one
    stripUnknown: true // Remove unknown fields
  });
};

 