import { NextResponse } from 'next/server';
import mammoth from 'mammoth';
import pdfParse from 'pdf-parse';
import  OpenAI  from 'openai';

const openai = process.env.OPENAI_API_KEY ? new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
}) : null;

console.log('Raw OPENAI_API_KEY from env:', process.env.OPENAI_API_KEY);
console.log('OpenAI API Key loaded:', process.env.OPENAI_API_KEY ? 'Yes' : 'No');
console.log('OpenAI client initialized:', openai ? 'Yes' : 'No');

// Test OpenAI connection
if (openai) {
  openai.models.list().then(() => console.log('OpenAI connection test: SUCCESS')).catch(err => console.error('OpenAI connection test: FAILED', err.message));
}

function normalizeText(text: string) {
  return text.replace(/\s+/g, ' ').trim();
}

async function analyzeResume(text: string, jobDescription?: string) {
  const normalized = normalizeText(text);

  if (!openai || process.env.OPENAI_API_KEY === 'your_openai_api_key_here') {
    // Fallback to basic analysis if no API key
    const commonSkills = [
      'React', 'Node', 'TypeScript', 'JavaScript', 'Python', 'AWS', 'Docker',
      'Kubernetes', 'SQL', 'PostgreSQL', 'API', 'Rest', 'Next.js', 'Tailwind',
      'HTML', 'CSS', 'Redux', 'Git', 'GitHub', 'Figma', 'GraphQL', 'PHP', 'Ruby',
      'Go', 'C#', 'Java', 'Spring', 'MongoDB', 'Redis', 'Express', 'Aura', 'CI/CD',
      'Performance', 'Scalability', 'Optimization', 'Testing', 'Jest', 'Agile',
      'Scrum', 'Leadership', 'Management', 'Communication', 'UI', 'UX', 'Design',
      'Cloud', 'Azure', 'GCP', 'Mobile', 'iOS', 'Android', 'Flutter', 'Angular',
      'Vue', 'Security', 'Database', 'Microservices', 'Frontend', 'Backend', 'Fullstack'
    ];

    const resumeMatches = commonSkills.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(normalized));
    
    let matchScore = 0;
    let requirementsChecklist: any[] = [];
    let missingKeywords: string[] = [];

    if (jobDescription && jobDescription.trim()) {
      const jdNormalized = normalizeText(jobDescription);
      
      // Try to extract tech skills first
      let jdSkills = commonSkills.filter((s) => new RegExp(`\\b${s}\\b`, 'i').test(jdNormalized));
      
      // If no tech skills found, try to extract bullet points or sentences as requirements
      if (jdSkills.length === 0) {
        const sentences = jobDescription.split(/[.\n•-]/).map(s => s.trim()).filter(s => s.length > 15);
        jdSkills = sentences.slice(0, 5); // Take top 5 requirements
      }

      if (jdSkills.length > 0) {
        const matchingJdSkills = jdSkills.filter(s => {
          const regex = new RegExp(`\\b${s}\\b`, 'i');
          return regex.test(normalized);
        });
        
        missingKeywords = jdSkills.filter(s => !resumeMatches.includes(s) && !new RegExp(`\\b${s}\\b`, 'i').test(normalized));
        
        matchScore = Math.round((matchingJdSkills.length / jdSkills.length) * 100);
        
        requirementsChecklist = jdSkills.map(requirement => {
          const regex = new RegExp(`\\b${requirement.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          const isMatched = regex.test(normalized);
          return {
            requirement: requirement,
            status: isMatched ? 'Meets' : 'Lacks',
            reason: isMatched 
              ? `Your resume mentions "${requirement}" or similar concepts.` 
              : `This requirement was not explicitly found in your resume text.`
          };
        });
      }
    }

    const lengthScore = Math.min(40, Math.floor(normalized.length / 25));
    const keywordHits = resumeMatches.slice(0, 10);
    const score = Math.min(100, Math.round((lengthScore + (keywordHits.length * 5) + 20)));

    return {
      score,
      matchScore: jobDescription ? matchScore : undefined,
      strength: score >= 80 ? 'Strong resume foundation' : 'Needs improvement in skills and detail',
      suggestions: [
        'Add more specific project details to boost your score.',
        'Ensure key technologies are mentioned in context.',
        'Quantify achievements with metrics (e.g., "Improved performance by 20%").'
      ],
      keywordHighlights: keywordHits,
      missingKeywords: jobDescription ? missingKeywords : undefined,
      requirementsChecklist: jobDescription ? requirementsChecklist : undefined,
    };
  }

  try {
    console.log('Attempting OpenAI analysis...');
    const prompt = `
Analyze the following resume text. 
${jobDescription ? `Compare it against the provided Job Description.` : 'Provide a general analysis.'}

Provide a JSON response with the following structure:
{
  "score": number (0-100, based on overall quality),
  ${jobDescription ? '"matchScore": number (0-100, how well the resume matches the JD),' : ''}
  "strength": string (brief summary of resume strength),
  "suggestions": array of strings (3-5 improvement suggestions),
  "keywordHighlights": array of strings (top 5-10 relevant keywords found)${jobDescription ? ',' : ''}
  ${jobDescription ? '"missingKeywords": array of strings (important keywords from the JD that are NOT in the resume)' : ''}
}

Resume text:
${normalized}

${jobDescription ? `Job Description:
${normalizeText(jobDescription)}` : ''}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 500,
      temperature: 0.7,
    });

    const choice = response.choices?.[0];
    if (!choice || !choice.message || !choice.message.content) {
      throw new Error('Invalid response from OpenAI');
    }

    const content = choice.message.content.trim();
    let result;
    try {
      result = JSON.parse(content);
    } catch (parseError) {
      console.error('JSON parse error:', parseError, 'Content:', content);
      throw new Error('Failed to parse OpenAI response');
    }

    // Validate the result structure
    if (typeof result.score !== 'number' || typeof result.strength !== 'string' ||
        !Array.isArray(result.suggestions) || !Array.isArray(result.keywordHighlights)) {
      throw new Error('Invalid response structure from OpenAI');
    }

    return result;
  } catch (error: any) {
    console.error('OpenAI analysis error:', error);
    console.error('Error details:', error.message, error.status, error.code);
    // Fallback to basic analysis
    const lengthScore = Math.min(40, Math.floor(normalized.length / 25));
    const keywordHits = ['JavaScript', 'React', 'Node', 'TypeScript', 'API'].filter((keyword) =>
      new RegExp(`\\b${keyword}\\b`, 'i').test(normalized)
    );
    const keywordScore = Math.min(40, keywordHits.length * 5);
    const score = Math.min(100, lengthScore + keywordScore + 20);

    return {
      score,
      strength: score >= 80 ? 'Strong resume' : 'Needs improvement',
      suggestions: ['Add more details', 'Include keywords', 'Quantify achievements'],
      keywordHighlights: keywordHits,
    };
  }
}

async function parseResumeFile(file: File) {
  const lowerName = file.name.toLowerCase();
  const buffer = Buffer.from(await file.arrayBuffer());

  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    const data = await pdfParse(buffer);
    return data.text || '';
  }

  if (
    file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    lowerName.endsWith('.docx')
  ) {
    const { value } = await mammoth.extractRawText({ buffer });
    return value;
  }

  if (file.type === 'text/plain' || lowerName.endsWith('.txt')) {
    return await file.text();
  }

  throw new Error('Unsupported file format.');
}

export async function POST(request: Request) {
  const contentType = request.headers.get('content-type') || '';
  let resumeText = '';
  let jobDescription = '';

  if (contentType.includes('multipart/form-data')) {
    const formData = await request.formData();
    const file = formData.get('resumeFile');
    jobDescription = (formData.get('jobDescription') as string) || '';

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Resume file is required.' }, { status: 400 });
    }

    try {
      resumeText = await parseResumeFile(file);
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  } else {
    const body = await request.json();
    resumeText = typeof body.resumeText === 'string' ? body.resumeText : '';
    jobDescription = typeof body.jobDescription === 'string' ? body.jobDescription : '';
  }

  if (!resumeText.trim()) {
    return NextResponse.json({ error: 'Resume text is required.' }, { status: 400 });
  }

  const result = await analyzeResume(resumeText, jobDescription);
  return NextResponse.json(result);
}
