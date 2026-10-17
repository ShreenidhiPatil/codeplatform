import React, { useEffect, useState, useCallback } from 'react';
import api from '../api/axios';
import CodeEditor from '../components/CodeEditor';

const TEMPLATE_LANGUAGES = ['python', 'c', 'java'];
const LANGUAGE_LABELS = { python: 'Python 3', c: 'C', java: 'Java' };

const emptyQuestion = {
  title: '', description: '', difficulty: 'Easy', sample_input: '', sample_output: '',
  time_limit_seconds: 5, duration_minutes: 0, is_active: true,
  test_cases: [{ input_data: '', expected_output: '', is_hidden: false }],
  code_templates: [],
};

export default function FacultyDashboard() {
  const [questions, setQuestions] = useState([]);
  const [form, setForm] = useState(emptyQuestion);
  const [editingId, setEditingId] = useState(null);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [view, setView] = useState('questions'); // 'questions' | 'leaderboard' | 'violations'
  const [lbQuestionId, setLbQuestionId] = useState(''); // '' = overall
  const [leaderboard, setLeaderboard] = useState({ scope: 'overall', rows: [] });
  const [violations, setViolations] = useState([]);

  const loadQuestions = useCallback(async () => {
    const res = await api.get('/questions/faculty/');
    setQuestions(res.data);
  }, []);

  const loadLeaderboard = useCallback(async (questionId) => {
    const qs = questionId ? `?question=${questionId}` : '';
    const res = await api.get(`/submissions/leaderboard/${qs}`);
    setLeaderboard(res.data);
  }, []);

  const downloadLeaderboard = async () => {
    if (!lbQuestionId) {
      alert("Please select a question first.");
      return;
    }

    try {
      const response = await api.get(
        `/submissions/leaderboard/download/?question=${lbQuestionId}`,
        {
          responseType: "blob",
        }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.download = "leaderboard.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert("Unable to download leaderboard.");
    }
  };

  const loadViolations = useCallback(async () => {
    const res = await api.get('/submissions/violations/');
    setViolations(res.data);
  }, []);

  useEffect(() => { loadQuestions(); }, [loadQuestions]);
  useEffect(() => { if (view === 'leaderboard') loadLeaderboard(lbQuestionId); }, [view, lbQuestionId, loadLeaderboard]);
  useEffect(() => { if (view === 'violations') loadViolations(); }, [view, loadViolations]);

  const VIOLATION_LABELS = {
    tab_switch: 'Switched Tabs',
    window_blur: 'Left Window',
    fullscreen_exit: 'Exited Fullscreen',
    copy_paste_attempts: 'Copy/Paste Attempt(s)',
  };

  const allowReattempt = async (studentId, questionId) => {
    await api.post('/submissions/violations/unlock/', { student: studentId, question: questionId });
    loadViolations();
  };

  const toggleActive = async (q) => {
    await api.patch(`/questions/faculty/${q.id}/`, { is_active: !q.is_active });
    loadQuestions();
  };

  const handleField = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleTestCaseChange = (idx, field, value) => {
    const updated = [...form.test_cases];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, test_cases: updated });
  };

  const addTestCase = () => setForm({
    ...form, test_cases: [...form.test_cases, { input_data: '', expected_output: '', is_hidden: false }],
  });

  const removeTestCase = (idx) => setForm({
    ...form, test_cases: form.test_cases.filter((_, i) => i !== idx),
  });

  const handleTemplateChange = (idx, field, value) => {
    const updated = [...form.code_templates];
    updated[idx] = { ...updated[idx], [field]: value };
    setForm({ ...form, code_templates: updated });
  };

  const addTemplate = () => {
    const used = form.code_templates.map((t) => t.language);
    const next = TEMPLATE_LANGUAGES.find((l) => !used.includes(l));
    if (!next) return;
    setForm({
      ...form,
      code_templates: [...form.code_templates, { language: next, starter_code: '', driver_code: '' }],
    });
  };

  const removeTemplate = (idx) => setForm({
    ...form, code_templates: form.code_templates.filter((_, i) => i !== idx),
  });

  // --- "Test this question" panel: faculty write a solution and run it
  // against the form's test cases before publishing. Uses the faculty-only
  // endpoint - no attempt rows, no locking, no proctoring rules.
  const [testLang, setTestLang] = useState('python');
  const [testCode, setTestCode] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [testLoading, setTestLoading] = useState(false);

  const handleTestLangChange = (lang) => {
    setTestLang(lang);
    const tpl = form.code_templates.find((t) => t.language === lang);
    setTestCode(tpl?.starter_code || '');
  };

  const runQuestionTest = async () => {
    setTestLoading(true);
    setTestResult(null);
    try {
      const tpl = form.code_templates.find((t) => t.language === testLang);
      const res = await api.post('/submissions/faculty-test/', {
        code: testCode,
        language: testLang,
        test_cases: form.test_cases,
        time_limit_seconds: form.time_limit_seconds,
        driver_code: tpl?.driver_code || '',
      });
      setTestResult(res.data);
    } catch (err) {
      setTestResult({
        status: 'Error',
        result_detail: err.response?.data?.detail || JSON.stringify(err.response?.data || {}),
      });
    } finally {
      setTestLoading(false);
    }
  };

  const resetForm = () => { setForm(emptyQuestion); setEditingId(null); setShowForm(false); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg('');
    try {
      if (editingId) {
        await api.put(`/questions/faculty/${editingId}/`, form);
        setMsg('Question updated.');
      } else {
        await api.post('/questions/faculty/', form);
        setMsg('Question published to students.');
      }
      resetForm();
      loadQuestions();
    } catch (err) {
      setMsg('Error: ' + JSON.stringify(err.response?.data || {}));
    }
  };

  const editQuestion = (q) => {
    setForm({
      title: q.title,
      description: q.description,
      difficulty: q.difficulty,
      sample_input: q.sample_input,
      sample_output: q.sample_output,
      time_limit_seconds: q.time_limit_seconds ?? 5,
      duration_minutes: q.duration_minutes ?? 0,
      is_active: q.is_active ?? true,
      test_cases: q.test_cases?.length ? q.test_cases : [{ input_data: '', expected_output: '', is_hidden: false }],
      code_templates: q.code_templates ?? [],
    });
    setEditingId(q.id);
    setShowForm(true);
  };

  const deleteQuestion = async (id) => {
    if (!window.confirm('Delete this question?')) return;
    await api.delete(`/questions/faculty/${id}/`);
    loadQuestions();
  };

  return (
    <div className="dashboard">
      <div className="dashboard-header-row">
        <div>
          <h1>Faculty Dashboard</h1>
          <p className="dashboard-sub">Create coding questions for students to solve.</p>
        </div>
        <button className="btn btn-primary" onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}>
          {showForm ? 'Close' : '+ New Question'}
        </button>
      </div>

      <div className="tabs" style={{ maxWidth: 480, marginTop: '1.2rem' }}>
        <button className={`tab ${view === 'questions' ? 'active' : ''}`} onClick={() => setView('questions')}>
          Questions
        </button>
        <button
          className={`tab ${view === 'leaderboard' ? 'active' : ''}`}
          onClick={() => setView('leaderboard')}
        >
          Leaderboard
        </button>
        <button
          className={`tab ${view === 'violations' ? 'active' : ''}`}
          onClick={() => setView('violations')}
        >
          Violations
        </button>
      </div>

      {msg && <p className="form-success">{msg}</p>}

      {view === 'questions' && showForm && (
        <form className="question-form" onSubmit={handleSubmit}>
          <label>Title</label>
          <input name="title" value={form.title} onChange={handleField} required />

          <label>Description</label>
          <textarea name="description" rows="4" value={form.description} onChange={handleField} required />

          <div className="two-col">
            <div>
              <label>Difficulty</label>
              <select name="difficulty" value={form.difficulty} onChange={handleField}>
                <option>Easy</option>
                <option>Medium</option>
                <option>Hard</option>
              </select>
            </div>
          </div>

          <div className="two-col">
            <div>
              <label>Sample Input</label>
              <textarea name="sample_input" rows="2" value={form.sample_input} onChange={handleField} />
            </div>
            <div>
              <label>Sample Output</label>
              <textarea name="sample_output" rows="2" value={form.sample_output} onChange={handleField} />
            </div>
          </div>

          <div className="two-col">
            <div>
              <label>Execution time limit (seconds per test case)</label>
              <input
                type="number" min="1" max="30" name="time_limit_seconds"
                value={form.time_limit_seconds} onChange={handleField}
              />
            </div>
            <div>
              <label>Time limit to submit (minutes, 0 = no limit)</label>
              <input
                type="number" min="0" name="duration_minutes"
                value={form.duration_minutes} onChange={handleField}
              />
            </div>
          </div>

          <h4>Test Cases (used for evaluating student submissions)</h4>
          {form.test_cases.map((tc, idx) => (
            <div className="test-case-row" key={idx}>
              <textarea
                placeholder="Input"
                rows="2"
                value={tc.input_data}
                onChange={(e) => handleTestCaseChange(idx, 'input_data', e.target.value)}
              />
              <textarea
                placeholder="Expected Output"
                rows="2"
                value={tc.expected_output}
                onChange={(e) => handleTestCaseChange(idx, 'expected_output', e.target.value)}
                required
              />
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={tc.is_hidden}
                  onChange={(e) => handleTestCaseChange(idx, 'is_hidden', e.target.checked)}
                /> Hidden
              </label>
              {form.test_cases.length > 1 && (
                <button type="button" className="btn-icon" onClick={() => removeTestCase(idx)}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn-outline small" onClick={addTestCase}>+ Add test case</button>

          <h4>Code Templates (optional — LeetCode style)</h4>
          <p className="muted small">
            Add a template per language and students only write the logic: they see and complete the
            Starter code (a function stub), while your hidden Driver code reads the input, calls their
            function, and prints the answer. Put <code>{'{{USER_CODE}}'}</code> in the driver where the
            student's code should be inserted. Students can only pick languages you add here; leave
            this empty to let students write the whole program themselves.
          </p>
          {form.code_templates.map((tpl, idx) => (
            <div className="template-row" key={idx}>
              <div className="template-row-head">
                <select
                  value={tpl.language}
                  onChange={(e) => handleTemplateChange(idx, 'language', e.target.value)}
                >
                  {TEMPLATE_LANGUAGES.map((l) => (
                    <option
                      key={l}
                      value={l}
                      disabled={l !== tpl.language && form.code_templates.some((t) => t.language === l)}
                    >
                      {l === 'python' ? 'Python 3' : l === 'c' ? 'C' : 'Java'}
                    </option>
                  ))}
                </select>
                <button type="button" className="btn-icon" onClick={() => removeTemplate(idx)}>✕</button>
              </div>
              <textarea
                placeholder={'Starter code shown to the student, e.g.\ndef solve(a, b):\n    # write your logic here\n    return 0'}
                rows="4"
                value={tpl.starter_code}
                onChange={(e) => handleTemplateChange(idx, 'starter_code', e.target.value)}
                required
              />
              <textarea
                placeholder={'Hidden driver code, e.g.\n{{USER_CODE}}\n\na, b = map(int, input().split())\nprint(solve(a, b))'}
                rows="4"
                value={tpl.driver_code}
                onChange={(e) => handleTemplateChange(idx, 'driver_code', e.target.value)}
                required
              />
            </div>
          ))}
          {form.code_templates.length < TEMPLATE_LANGUAGES.length && (
            <button type="button" className="btn btn-outline small" onClick={addTemplate}>
              + Add language template
            </button>
          )}

          <h4>Test this question (optional)</h4>
          <p className="muted small">
            Write a solution and run it against the test cases above to make sure the question is
            solvable before publishing. If you added a code template for the selected language, write
            only the logic — your hidden driver is applied automatically. Nothing here is saved.
          </p>
          <div className="editor-toolbar">
            <select value={testLang} onChange={(e) => handleTestLangChange(e.target.value)}>
              {TEMPLATE_LANGUAGES.map((l) => (
                <option key={l} value={l}>{LANGUAGE_LABELS[l]}</option>
              ))}
            </select>
          </div>
          <CodeEditor value={testCode} onChange={setTestCode} language={testLang} allowClipboard />
          <button
            type="button"
            className="btn btn-outline small"
            style={{ marginTop: '0.6rem' }}
            onClick={runQuestionTest}
            disabled={testLoading}
          >
            {testLoading ? 'Running...' : '▶ Run against test cases'}
          </button>
          {testResult && (
            <div className={`result-box result-${testResult.status?.replace(' ', '-').toLowerCase()}`}>
              <h4>Test Result</h4>
              {testResult.passed_count !== undefined && (
                <p>{testResult.passed_count} / {testResult.total_count} test cases passed</p>
              )}
              <pre>{testResult.result_detail}</pre>
            </div>
          )}

          <button className="btn btn-primary full-width" style={{ marginTop: '1.2rem' }}>
            {editingId ? 'Update Question' : 'Publish Question'}
          </button>
        </form>
      )}

      {view === 'questions' && (
        <>
          <h3 className="section-title">Your Questions</h3>
          <div className="card-grid">
            {questions.length === 0 && <p className="empty-state">You haven't published any questions yet.</p>}
            {questions.map((q) => (
              <div className="list-card question-card" key={q.id}>
                <div>
                  <div className="q-title-row">
                    <h4>{q.title}</h4>
                    <span className={`badge badge-${q.difficulty.toLowerCase()}`}>{q.difficulty}</span>
                  </div>
                  {!q.is_active && <span className="badge badge-inactive">Disabled</span>}
                  <p className="muted">{q.description.slice(0, 100)}{q.description.length > 100 ? '...' : ''}</p>
                  <p className="muted small">{q.test_cases?.length || 0} test case(s)</p>
                  <p className="muted small">
                    {q.time_limit_seconds}s exec limit
                    {q.duration_minutes > 0 ? ` · ${q.duration_minutes} min to submit` : ''}
                  </p>
                </div>
                <div className="list-card-actions">
                  <button className="btn btn-outline small" onClick={() => editQuestion(q)}>Edit</button>
                  <button className="btn btn-outline small" onClick={() => toggleActive(q)}>
                    {q.is_active ? 'Disable' : 'Enable'}
                  </button>
                  <button className="btn btn-outline small danger" onClick={() => deleteQuestion(q.id)}>Delete</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
{view === 'leaderboard' && (
  <>
    <div
      className="dashboard-header-row"
      style={{
        alignItems: 'center',
        marginTop: '1rem',
        gap: '10px',
      }}
    >
      <h3 className="section-title" style={{ margin: 0 }}>
        Leaderboard
      </h3>

      <select
        className="select-control"
        value={lbQuestionId}
        onChange={(e) => setLbQuestionId(e.target.value)}
        style={{ maxWidth: 320 }}
      >
        <option value="">Overall (all questions)</option>
        {questions.map((q) => (
          <option key={q.id} value={q.id}>
            {q.title}
          </option>
        ))}
      </select>

      <button
        className="btn btn-primary"
        onClick={downloadLeaderboard}
      >
        Download Excel
      </button>
    </div>
          {leaderboard.rows.length === 0 ? (
            <p className="empty-state">No accepted submissions yet.</p>
          ) : leaderboard.scope === 'question' ? (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>SRN</th>
                    <th>Solved At</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.rows.map((row) => (
                    <tr key={row.student}>
                      <td>#{row.rank}</td>
                      <td>{row.student}</td>
                      <td>{row.roll_number || '—'}</td>
                      <td>{new Date(row.solved_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Rank</th>
                    <th>Student</th>
                    <th>SRN</th>
                    <th>Solved</th>
                    <th>Last Solve</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.rows.map((row) => (
                    <tr key={row.student}>
                      <td>#{row.rank}</td>
                      <td>{row.student}</td>
                      <td>{row.roll_number || '—'}</td>
                      <td>{row.solved_count}</td>
                      <td>{new Date(row.last_solved_at).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}

      {view === 'violations' && (
        <>
          <h3 className="section-title">Violations</h3>
          {violations.length === 0 ? (
            <p className="empty-state">No suspicious activity detected yet.</p>
          ) : (
            <div className="leaderboard-table-wrap">
              <table className="leaderboard-table">
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>SRN</th>
                    <th>Question</th>
                    <th>Violation</th>
                    <th>When</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {violations.map((v) => (
                    <tr key={v.submission_id}>
                      <td>{v.student}</td>
                      <td>{v.roll_number || '—'}</td>
                      <td>{v.question}</td>
                      <td>
                        {VIOLATION_LABELS[v.violation_type] || v.violation_type}
                        {v.tab_switch_count > 0 && ` (${v.tab_switch_count})`}
                      </td>
                      <td>{new Date(v.submitted_at).toLocaleString()}</td>
                      <td>
                        {v.locked && (
                          <button
                            className="btn btn-outline small"
                            onClick={() => allowReattempt(v.student_id, v.question_id)}
                          >
                            Allow Reattempt
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
