const getServiceUrl = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';
const getServiceToken = () => process.env.AI_SERVICE_TOKEN || 'djsknsk';
const MAX_RETRIES = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function post(path, body, attempt = 1) {
  let response;
  try {
    response = await fetch(`${getServiceUrl()}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Internal-Token': getServiceToken() },
      body: JSON.stringify(body)
    });
  } catch (err) {
    // Network-level failure (service down, DNS, connection reset) - retry.
    // Node/undici wraps the real reason in err.cause; err.message alone is
    // often just the unhelpful literal string "fetch failed".
    const detail = err.cause ? `${err.message} (${err.cause.code || err.cause.message || err.cause})` : err.message;
    if (attempt < MAX_RETRIES) {
      await sleep(2 ** attempt * 500);
      return post(path, body, attempt + 1);
    }
    throw Object.assign(new Error(`AI service unreachable at ${path}: ${detail}`), { status: 502 });
  }

  if (response.status >= 500 && attempt < MAX_RETRIES) {
    await sleep(2 ** attempt * 500);
    return post(path, body, attempt + 1);
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw Object.assign(new Error(payload.error || `AI service error at ${path}: ${response.status}`), {
      status: response.status >= 500 ? 502 : response.status
    });
  }

  return response.json();
}

export const analyzeJobDescription = ({ jobTitle, company, description }) =>
  post('/analyze-jd', { job_title: jobTitle, company, description });

export const tailorResume = ({ resumeText, jobAnalysis }) =>
  post('/tailor-resume', { resume_text: resumeText, job_analysis: jobAnalysis });

export const generateCoverLetter = ({ resumeText, jobAnalysis }) =>
  post('/cover-letter', { resume_text: resumeText, job_analysis: jobAnalysis });

export const generateInterviewPrep = ({ resumeText, jobAnalysis }) =>
  post('/interview-prep', { resume_text: resumeText, job_analysis: jobAnalysis });

export const evaluateAnswer = ({ question, answer, jobAnalysis }) =>
  post('/evaluate-answer', { question, answer, job_analysis: jobAnalysis });

export const generateProbeQuestion = ({ question, answer, score, jobAnalysis }) =>
  post('/probe-question', { question, answer, score, job_analysis: jobAnalysis });

// Runs one step of the LangGraph interview: evaluates the latest answer and
// returns the next dynamic question (or the final report card).
export const interviewStep = ({ jobAnalysis, resumeText, history, currentQuestion, currentAnswer, questionCount, maxQuestions }) =>
  post('/interview/step', {
    job_analysis: jobAnalysis,
    resume_text: resumeText,
    history,
    current_question: currentQuestion,
    current_answer: currentAnswer,
    question_count: questionCount,
    max_questions: maxQuestions
  });

// Generates a report card from any accumulated interview history — used when
// the session ends early or at any point so the score card always appears.
export const generateInterviewReport = ({ jobAnalysis, resumeText, history }) =>
  post('/interview/report', {
    job_analysis: jobAnalysis,
    resume_text: resumeText,
    history
  });

export const embedText = (text) => post('/embed', { text }).then((data) => data.embedding);

export const extractJobFromPage = ({ pageText, sourceUrl }) =>
  post('/extract-job', { page_text: pageText, source_url: sourceUrl });

export const generateStarStories = ({ resumeText, jobAnalysis }) =>
  post('/star-stories', { resume_text: resumeText, job_analysis: jobAnalysis });

