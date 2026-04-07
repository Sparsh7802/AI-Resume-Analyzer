'use client';

import { useEffect, useState } from 'react';

type AnalysisResult = {
  score: number;
  matchScore?: number;
  strength: string;
  suggestions: string[];
  keywordHighlights: string[];
  missingKeywords?: string[];
  requirementsChecklist?: {
    requirement: string;
    status: 'Meets' | 'Partially Meets' | 'Lacks';
    reason: string;
  }[];
};

export default function Home() {
  const [resumeText, setResumeText] = useState('');
  const [jobDescription, setJobDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  // Bullet point enhancer state
  const [bulletInput, setBulletInput] = useState('');
  const [enhancedResult, setEnhancedResult] = useState('');
  const [enhancingBullet, setEnhancingBullet] = useState(false);
  const [enhancerError, setEnhancerError] = useState('');
  const [enhancerNote, setEnhancerNote] = useState('');

  useEffect(() => {
    const storedTheme = window.localStorage.getItem('resume-analyzer-theme') as 'light' | 'dark' | null;
    const initialTheme = storedTheme ?? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    setTheme(initialTheme);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    window.localStorage.setItem('resume-analyzer-theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
  };

  const analyze = async () => {
    setError('');
    setResult(null);
    setProgress(0);

    if (!resumeText.trim() && !selectedFile) {
      setError('Please paste your resume text or upload a resume file before analyzing.');
      return;
    }

    setLoading(true);

    // Simulate progress
    const progressInterval = setInterval(() => {
      setProgress((prev) => Math.min(95, prev + 10));
    }, 200);

    try {
      let response: Response;

      if (selectedFile) {
        const formData = new FormData();
        formData.append('resumeFile', selectedFile);
        if (jobDescription) {
          formData.append('jobDescription', jobDescription);
        }
        response = await fetch('/api/analyze', {
          method: 'POST',
          body: formData,
        });
      } else {
        response = await fetch('/api/analyze', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ resumeText, jobDescription }),
        });
      }

      if (!response.ok) {
        const text = await response.text();
        throw new Error(text || 'Analysis request failed');
      }

      const data = await response.json();
      if ('error' in data) {
        throw new Error(data.error);
      }

      setProgress(100);
      setResult(data);
    } catch (err) {
      setError((err as Error).message || 'Unexpected error');
    } finally {
      clearInterval(progressInterval);
      setLoading(false);
      setProgress(0);
    }
  };

  const handleFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setError('');
    setResult(null);
    setFileName(file.name);

    const lowerFileName = file.name.toLowerCase();
    if (file.type === 'text/plain' || lowerFileName.endsWith('.txt')) {
      const text = await file.text();
      setResumeText(text);
      setSelectedFile(null);
      return;
    }

    if (
      file.type === 'application/pdf' ||
      lowerFileName.endsWith('.pdf') ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      lowerFileName.endsWith('.docx')
    ) {
      setResumeText('');
      setSelectedFile(file);
      return;
    }

    setError('Please upload a .txt, .pdf, or .docx resume file.');
    setResumeText('');
    setSelectedFile(null);
    setFileName('');
  };

  const setExampleJD = () => {
    const examples = [
      "- Strong experience with React and TypeScript\n- Knowledge of Node.js and REST APIs\n- Performance optimization and scalability focus\n- UI/UX design sensibility with Figma",
      "- Proficiency in Python and Django/FastAPI\n- Managing PostgreSQL databases and Redis caching\n- Designing and maintaining microservices architecture\n- Experience with AWS (EC2, S3, Lambda)",
      "- Skilled in Java and Spring Boot framework\n- Building and consuming secure GraphQL APIs\n- Implementing CI/CD pipelines with Jenkins/GitHub Actions\n- Unit and Integration testing with JUnit"
    ];
    
    // Find the current index or start at 0
    const currentIndex = examples.indexOf(jobDescription);
    const nextIndex = (currentIndex + 1) % examples.length;
    setJobDescription(examples[nextIndex]);
  };

  const enhanceBullet = async () => {
    if (!bulletInput.trim() || bulletInput.length < 5) {
      setEnhancerError('Please enter a longer bullet point to enhance.');
      return;
    }

    setEnhancingBullet(true);
    setEnhancerError('');
    setEnhancedResult('');
    setEnhancerNote('');

    try {
      const resp = await fetch('/api/enhance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bulletPoint: bulletInput }),
      });

      const data = await resp.json();
      if (!resp.ok) throw new Error(data.error || 'Failed to enhance');

      setEnhancedResult(data.enhanced);
      if (data.isFallback) setEnhancerNote(data.note);
    } catch (err: any) {
      setEnhancerError(err.message);
    } finally {
      setEnhancingBullet(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Simple visual feedback could be added here
  };

  return (
    <main className="page-shell">
      <div className="hero-layer" />
      <div className="hero-grid animate-fade-in">
        <section className="hero-copy-block">
          <h1>Build a resume experience that feels premium.</h1>
          <p className="hero-copy">
            Upload your resume in text, PDF, or DOCX and get a sharp AI analysis that highlights keywords,
            achievements, and formatting improvements.
          </p>
          <div className="hero-actions">
            <button className="primary-cta" onClick={() => document.getElementById('resume-form')?.scrollIntoView({ behavior: 'smooth' })}>
              Analyze your resume
            </button>
            <button className="secondary-cta" onClick={toggleTheme}>
              <span className="theme-icon" aria-hidden="true">
                {theme === 'dark' ? '☀️' : '🌙'}
              </span>
              {theme === 'dark' ? 'Light mode' : 'Dark mode'}
            </button>
          </div>
        </section>

        <section className="hero-panel animate-fade-in-delay">
          <div className="hero-panel-top">
            <span className="panel-tag">Resume AI</span>
            <span className="panel-status">Live preview</span>
          </div>
          <div className="hero-panel-copy">
            <h2>Elevate your resume with design and data.</h2>
            <p>Fast, elegant, and intelligent analysis for modern professionals.</p>
          </div>
          <div className="hero-stats">
            <div>
              <strong>3+</strong>
              <p>Supported formats</p>
            </div>
            <div>
              <strong>Instant</strong>
              <p>AI feedback</p>
            </div>
            <div>
              <strong>80%</strong>
              <p>Better keyword coverage</p>
            </div>
          </div>
        </section>
      </div>

      <section className="panel animate-fade-in-delay" id="resume-form">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Resume Analyzer</span>
            <h2>Upload or paste your resume</h2>
          </div>
          <span className="status-pill">Optimized flow</span>
        </div>

        <label className="field">
          <span className="field-label">Resume text</span>
          <textarea
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            placeholder="Paste your resume text here..."
          />
        </label>

        <label className="field">
          <div className="field-header">
            <span className="field-label">Job description (optional)</span>
            <div className="field-actions">
              {jobDescription.trim() && (
                <>
                  <button type="button" className="text-btn small" onClick={() => setJobDescription('')}>Clear</button>
                  <span className="active-pill">Target active</span>
                </>
              )}
              <button 
                type="button" 
                className="text-btn small"
                onClick={setExampleJD}
              >
                {jobDescription.trim() ? 'Cycle example' : 'Try an example'}
              </button>
            </div>
          </div>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Paste the target job description to see how well you match..."
          />
        </label>

        <label className="field file-field">
          <span className="field-label">Upload resume file</span>
          <input type="file" accept=".txt,.pdf,.docx" onChange={handleFile} />
          {fileName ? <p className="fileInfo">Selected file: {fileName}</p> : null}
        </label>

        <button className="primary-cta" onClick={analyze} disabled={loading}>
          {loading ? (
            <div className="button-progress">
              <div className="button-progress-bar" style={{ width: `${progress}%` }}></div>
              <span className="button-progress-text">{progress}%</span>
            </div>
          ) : (
            'Analyze Resume'
          )}
        </button>

        {error && <p className="error">{error}</p>}
      </section>

      {result ? (
        <section className="result">
          <div className="result-header">
            <div>
              <span className="eyebrow">Analysis</span>
              <h2>Performance scores</h2>
            </div>
            <div className="score-badges">
              <div className="score-group">
                <span className="score-label">Resume score</span>
                <div className="score-badge">{result.score}</div>
              </div>
              {result.matchScore !== undefined && (
                <div className="score-group">
                  <span className="score-label">Match score</span>
                  <div className="score-badge score-badge-match">{result.matchScore}</div>
                </div>
              )}
            </div>
          </div>

          <p className="result-copy">
            {result.strength}. This detailed breakdown shows how well you match the role.
          </p>

          <div className="result-column">
            {result.requirementsChecklist && result.requirementsChecklist.length > 0 && (
              <div className="card card-premium full-width mb-6">
                <h3>Requirement match breakdown</h3>
                <p className="muted small mb-4">A point-by-point comparison of your resume against the job requirements.</p>
                <div className="requirements-grid">
                  {result.requirementsChecklist.map((item, index) => (
                    <div key={index} className="requirement-item">
                      <div className="requirement-top">
                        <span className={`status-icon ${item.status.toLowerCase().replace(' ', '-')}`}>
                          {item.status === 'Meets' ? '✅' : item.status === 'Partially Meets' ? '⚠️' : '❌'}
                        </span>
                        <strong>{item.requirement}</strong>
                      </div>
                      <p className="small muted">{item.reason}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="result-grid">
              <div className="card card-soft">
                <h3>Top keywords</h3>
                <div className="badge-list">
                  {result.keywordHighlights.length ? (
                    result.keywordHighlights.map((keyword) => (
                      <span key={keyword} className="badge">
                        {keyword}
                      </span>
                    ))
                  ) : (
                    <p className="muted">No top keywords detected yet.</p>
                  )}
                </div>
              </div>

              <div className="card card-soft">
                <h3>Action items</h3>
                <ul>
                  {result.suggestions.map((suggestion) => (
                    <li key={suggestion}>{suggestion}</li>
                  ))}
                </ul>
              </div>

              {result.matchScore !== undefined && result.missingKeywords && result.missingKeywords.length > 0 && (
                <div className="card card-alert full-width">
                  <h3>Missing skills/keywords</h3>
                  <p className="muted small">These are required by the job description but were not found in your resume.</p>
                  <div className="badge-list">
                    {result.missingKeywords.map((keyword) => (
                      <span key={keyword} className="badge badge-error">
                        {keyword}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : null}

      <section className="panel enhancer-panel animate-fade-in-delay">
        <div className="panel-header">
          <div>
            <span className="eyebrow">Expert Tool</span>
            <h2>AI Bullet Point Enhancer</h2>
          </div>
          <span className="status-pill">STAR Method</span>
        </div>
        
        <p className="panel-copy mb-4">
          Transform weak bullet points into high-impact, results-driven statements using professional action verbs and metrics.
        </p>

        <div className="field">
          <span className="field-label">Current bullet point</span>
          <textarea
            value={bulletInput}
            onChange={(e) => setBulletInput(e.target.value)}
            placeholder="e.g., Improved the website performance and fixed bugs."
            rows={3}
            className="enhancer-input"
          />
        </div>

        {enhancerError && <p className="error mb-4">{enhancerError}</p>}

        <button 
          className="primary-cta mb-6" 
          onClick={enhanceBullet} 
          disabled={enhancingBullet}
        >
          {enhancingBullet ? 'Polishing...' : 'Enhance with AI'}
        </button>

        {enhancedResult && (
          <div className="enhancer-result animate-fade-in">
            <div className="result-comparison">
              <div className="card card-soft">
                <span className="small muted uppercase font-bold mb-2 block">Original</span>
                <p>{bulletInput}</p>
              </div>
              <div className="card card-premium">
                <div className="flex justify-between items-start mb-2">
                  <span className="small muted uppercase font-bold block">Enhanced (STAR Method)</span>
                  <button className="text-btn" onClick={() => copyToClipboard(enhancedResult)}>Copy</button>
                </div>
                <p className="font-medium">{enhancedResult}</p>
                {enhancerNote && <p className="small muted mt-3 italic">{enhancerNote}</p>}
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}
