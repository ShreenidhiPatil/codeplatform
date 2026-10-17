import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../api/axios';
import CodeEditor from '../components/CodeEditor';

const STARTER = {
  python: '# Write your Python solution here\n# Read input with input() and print() your answer\n\n',
  c: '#include <stdio.h>\n\nint main() {\n    // Write your solution here\n    return 0;\n}\n',
  java: 'public class Main {\n    public static void main(String[] args) {\n        // Write your solution here\n    }\n}\n',
};

const LANGUAGE_LABELS = { python: 'Python 3', c: 'C', java: 'Java' };

/**
 * Faculty-only test bench for a published question. None of the student
 * rules apply here: no fullscreen, no tab-switch detection, no timer, no
 * locking, clipboard allowed - and nothing is ever saved.
 */
export default function FacultyTestQuestion() {
  const { id } = useParams();
  const [question, setQuestion] = useState(null);
  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState(STARTER.python);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get(`/questions/faculty/${id}/`).then((res) => {
      setQuestion(res.data);
      const tpls = res.data.code_templates || [];
      if (tpls.length) {
        const langs = tpls.map((t) => t.language);
        const initial = langs.includes('python') ? 'python' : langs[0];
        setLanguage(initial);
        setCode(tpls.find((t) => t.language === initial)?.starter_code || '');
      }
    });
  }, [id]);

  if (!question) return <div className="dashboard"><p>Loading question...</p></div>;

  const templates = {};
  (question.code_templates || []).forEach((t) => { templates[t.language] = t; });
  const templateMode = Object.keys(templates).length > 0;
  const availableLanguages = templateMode ? Object.keys(templates) : Object.keys(STARTER);

  const handleLanguageChange = (lang) => {
    setLanguage(lang);
    setCode(templates[lang]?.starter_code ?? STARTER[lang] ?? '');
  };

  const runTest = async () => {
    setLoading(true);
    setResult(null);
    try {
      const res = await api.post('/submissions/faculty-test/', {
        code,
        language,
        test_cases: question.test_cases || [],
        time_limit_seconds: question.time_limit_seconds,
        driver_code: templates[language]?.driver_code || '',
      });
      setResult(res.data);
    } catch (err) {
      setResult({
        status: 'Error',
        result_detail: err.response?.data?.detail || JSON.stringify(err.response?.data || {}),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard solve-page">
      <Link to="/faculty" className="back-link">← Back to dashboard</Link>

      <div className="solve-grid">
        <div className="question-panel">
          <div className="q-title-row">
            <h2>{question.title}</h2>
            <span className={`badge badge-${question.difficulty.toLowerCase()}`}>{question.difficulty}</span>
          </div>
          <p className="q-description">{question.description}</p>

          <div className="limits-row">
            <span className="limit-pill">⏱ Execution limit: {question.time_limit_seconds}s / test case</span>
            <span className="limit-pill">🧪 Faculty test mode — nothing is saved</span>
          </div>

          {question.sample_input && (
            <>
              <h4>Sample Input</h4>
              <pre className="sample-block">{question.sample_input}</pre>
            </>
          )}
          {question.sample_output && (
            <>
              <h4>Sample Output</h4>
              <pre className="sample-block">{question.sample_output}</pre>
            </>
          )}

          <h4>Test Cases ({(question.test_cases || []).length})</h4>
          <p className="muted small">
            Your solution runs against every test case, including hidden ones.
          </p>
        </div>

        <div className="editor-panel">
          <div className="editor-toolbar">
            <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
              {availableLanguages.map((l) => (
                <option key={l} value={l}>{LANGUAGE_LABELS[l] || l}</option>
              ))}
            </select>
            {templateMode && (
              <span className="muted small">
                Complete the function — input &amp; output are handled by your driver code.
              </span>
            )}
          </div>

          <CodeEditor value={code} onChange={setCode} language={language} allowClipboard />

          <div className="editor-actions">
            <button className="btn btn-primary" onClick={runTest} disabled={loading}>
              {loading ? 'Running...' : '▶ Run against all test cases'}
            </button>
          </div>

          {result && (
            <div className={`result-box result-${result.status?.replace(' ', '-').toLowerCase()}`}>
              <h4>Test Result <span className="muted small">(not saved)</span></h4>
              {result.passed_count !== undefined && (
                <p>{result.passed_count} / {result.total_count} test cases passed</p>
              )}
              <pre>{result.result_detail}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
