import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getQuestionFull, saveQuestion, type QuestionInput } from "@/services/questions";
import { supabase } from "@/lib/supabaseClient";
import type { AnswerStatus, ContentStatus, QuestionType } from "@/types/database";
import { FullPageSpinner } from "@/components/FullPageSpinner";
import { questionLikelyReferencesImage } from "@/data/imageHeuristic";

const LETTERS = ["A", "B", "C", "D", "E", "F"];

interface EditableImage {
  url: string;
  caption: string;
}

export function AdminQuestionEditor() {
  const { paperId, questionId } = useParams<{ paperId: string; questionId: string }>();
  const isNew = !questionId || questionId === "new";
  const navigate = useNavigate();

  const [loading, setLoading] = useState(!isNew);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [questionNumber, setQuestionNumber] = useState("1");
  const [questionType, setQuestionType] = useState<QuestionType>("objective");
  const [questionText, setQuestionText] = useState("");
  const [images, setImages] = useState<EditableImage[]>([]);
  const [options, setOptions] = useState<{ letter: string; text: string }[]>([
    { letter: "A", text: "" },
    { letter: "B", text: "" },
    { letter: "C", text: "" },
    { letter: "D", text: "" }
  ]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [explanation, setExplanation] = useState("");
  const [modelAnswer, setModelAnswer] = useState("");
  const [markingPoints, setMarkingPoints] = useState<{ point: string; marks: number }[]>([
    { point: "", marks: 1 }
  ]);
  const [answerStatus, setAnswerStatus] = useState<AnswerStatus>("missing");
  const [contentStatus, setContentStatus] = useState<ContentStatus>("draft");
  const [difficulty, setDifficulty] = useState<"" | "easy" | "medium" | "hard">("");

  useEffect(() => {
    if (isNew || !questionId) return;
    getQuestionFull(questionId)
      .then((full) => {
        if (!full) return setError("Question not found.");
        const { question, options: opts, markingPoints: mps, images: imgs } = full;
        setQuestionNumber(String(question.question_number));
        setQuestionType(question.question_type);
        setQuestionText(question.question_text);
        setImages(imgs.map((img) => ({ url: img.image_url, caption: img.caption ?? "" })));
        setCorrectAnswer(question.correct_answer ?? "");
        setExplanation(question.explanation ?? "");
        setModelAnswer(question.model_answer ?? "");
        setAnswerStatus(question.answer_status);
        setContentStatus(question.content_status);
        setDifficulty((question.difficulty as "" | "easy" | "medium" | "hard") ?? "");
        if (opts.length) setOptions(opts.map((o) => ({ letter: o.option_letter, text: o.option_text })));
        if (mps.length) setMarkingPoints(mps.map((m) => ({ point: m.point, marks: m.marks })));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [isNew, questionId]);

  function updateOption(letter: string, text: string) {
    setOptions((opts) => opts.map((o) => (o.letter === letter ? { ...o, text } : o)));
  }
  function addOption() {
    setOptions((opts) => {
      const next = LETTERS.find((l) => !opts.some((o) => o.letter === l));
      return next ? [...opts, { letter: next, text: "" }] : opts;
    });
  }
  function removeOption(letter: string) {
    setOptions((opts) => opts.filter((o) => o.letter !== letter));
    if (correctAnswer === letter) setCorrectAnswer("");
  }

  function updateMarkingPoint(i: number, field: "point" | "marks", value: string) {
    setMarkingPoints((mps) =>
      mps.map((m, idx) => (idx === i ? { ...m, [field]: field === "marks" ? Number(value) || 0 : value } : m))
    );
  }
  function addMarkingPoint() {
    setMarkingPoints((mps) => [...mps, { point: "", marks: 1 }]);
  }
  function removeMarkingPoint(i: number) {
    setMarkingPoints((mps) => mps.filter((_, idx) => idx !== i));
  }

  async function handleImageUpload(file: File) {
    setUploadingImage(true);
    setError(null);
    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${paperId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("question-images").upload(path, file);
      if (upErr) throw upErr;
      const { data } = supabase.storage.from("question-images").getPublicUrl(path);
      setImages((imgs) => [...imgs, { url: data.publicUrl, caption: "" }]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setUploadingImage(false);
    }
  }
  function updateImageCaption(index: number, caption: string) {
    setImages((imgs) => imgs.map((img, i) => (i === index ? { ...img, caption } : img)));
  }
  function removeImage(index: number) {
    setImages((imgs) => imgs.filter((_, i) => i !== index));
  }
  function moveImage(index: number, direction: -1 | 1) {
    setImages((imgs) => {
      const target = index + direction;
      if (target < 0 || target >= imgs.length) return imgs;
      const next = [...imgs];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const num = parseInt(questionNumber, 10);
    if (!num || num < 1) return setError("Question number must be a positive number.");
    if (!questionText.trim()) return setError("Question text is required.");

    const cleanOptions = options.filter((o) => o.text.trim());
    if (questionType === "objective" && cleanOptions.length < 2) {
      return setError("Objective questions need at least 2 options with text.");
    }
    if (questionType === "objective" && correctAnswer && !cleanOptions.some((o) => o.letter === correctAnswer)) {
      return setError("Correct answer must match one of the filled-in options.");
    }
    if (contentStatus === "published" && questionType === "objective" && !correctAnswer) {
      return setError("Can't publish an objective question with no correct answer selected.");
    }

    const input: QuestionInput = {
      paper_id: paperId!,
      question_number: num,
      question_type: questionType,
      question_text: questionText.trim(),
      correct_answer: correctAnswer || null,
      answer_status: answerStatus,
      explanation: explanation.trim() || null,
      model_answer: modelAnswer.trim() || null,
      difficulty: difficulty || null,
      content_status: contentStatus,
      options: cleanOptions,
      markingPoints: markingPoints.filter((m) => m.point.trim()),
      images: images.map((img) => ({ url: img.url, caption: img.caption.trim() || null }))
    };

    setSaving(true);
    try {
      await saveQuestion(input, isNew ? undefined : questionId);
      navigate(`/admin/papers/${paperId}`);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <FullPageSpinner label="Loading question…" />;

  return (
    <div>
      <Link className="backlink" to={`/admin/papers/${paperId}`}>
        ‹ Back to paper
      </Link>
      <h1>{isNew ? "Add question" : `Edit question ${questionNumber}`}</h1>

      <form onSubmit={handleSubmit}>
        <div className="card">
          <label className="field">
            <span>Question number</span>
            <input type="number" value={questionNumber} onChange={(e) => setQuestionNumber(e.target.value)} />
          </label>

          <label className="field">
            <span>Type</span>
            <div className="chip-row">
              <button
                type="button"
                className={`chip ${questionType === "objective" ? "active" : ""}`}
                onClick={() => setQuestionType("objective")}
              >
                Objective (MCQ)
              </button>
              <button
                type="button"
                className={`chip ${questionType === "subjective" ? "active" : ""}`}
                onClick={() => setQuestionType("subjective")}
              >
                Subjective (essay)
              </button>
            </div>
          </label>

          <label className="field">
            <span>Question text</span>
            <textarea rows={4} value={questionText} onChange={(e) => setQuestionText(e.target.value)} />
          </label>

          {images.length === 0 && questionLikelyReferencesImage(questionText) && (
            <div className="offline-note">
              🖼️ This wording suggests a diagram/graph/table — consider attaching an image below before
              publishing.
            </div>
          )}

          <div className="field">
            <span>Images (optional — a question can have more than one, e.g. one per sub-part)</span>
            {images.map((img, i) => (
              <div className="image-manager-row" key={img.url + i}>
                <img src={img.url} alt={img.caption || "Question"} className="question-image-thumb" />
                <div className="image-manager-controls">
                  <input
                    type="text"
                    placeholder="Caption (optional, e.g. Fig. 1(a))"
                    value={img.caption}
                    onChange={(e) => updateImageCaption(i, e.target.value)}
                  />
                  <div style={{ display: "flex", gap: 6 }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => moveImage(i, -1)} disabled={i === 0}>
                      ↑
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm"
                      onClick={() => moveImage(i, 1)}
                      disabled={i === images.length - 1}
                    >
                      ↓
                    </button>
                    <button type="button" className="btn-icon-delete" onClick={() => removeImage(i)}>
                      ✕ Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
            <input
              type="file"
              accept="image/*"
              onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0])}
              disabled={uploadingImage}
            />
            {uploadingImage && <span className="hint-text">Uploading…</span>}
          </div>
        </div>

        {questionType === "objective" ? (
          <div className="card">
            <h3>Options</h3>
            {options.map((o) => (
              <div className="option-edit-row" key={o.letter}>
                <span className="opt-letter">{o.letter}</span>
                <input type="text" value={o.text} onChange={(e) => updateOption(o.letter, e.target.value)} placeholder={`Option ${o.letter}`} />
                <button type="button" className="btn-icon-delete" onClick={() => removeOption(o.letter)}>✕</button>
              </div>
            ))}
            {options.length < 6 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={addOption}>
                + Add option
              </button>
            )}

            <label className="field" style={{ marginTop: 14 }}>
              <span>Correct answer</span>
              <select value={correctAnswer} onChange={(e) => setCorrectAnswer(e.target.value)}>
                <option value="">Not set / unknown</option>
                {options.filter((o) => o.text.trim()).map((o) => (
                  <option key={o.letter} value={o.letter}>
                    {o.letter}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>Explanation (optional)</span>
              <textarea rows={3} value={explanation} onChange={(e) => setExplanation(e.target.value)} />
            </label>
          </div>
        ) : (
          <div className="card">
            <label className="field">
              <span>Model answer</span>
              <textarea rows={4} value={modelAnswer} onChange={(e) => setModelAnswer(e.target.value)} />
            </label>

            <h3>Marking points</h3>
            {markingPoints.map((m, i) => (
              <div className="option-edit-row" key={i}>
                <input
                  type="text"
                  value={m.point}
                  onChange={(e) => updateMarkingPoint(i, "point", e.target.value)}
                  placeholder="e.g. Mentions deforestation as a cause"
                />
                <input
                  type="number"
                  value={m.marks}
                  onChange={(e) => updateMarkingPoint(i, "marks", e.target.value)}
                  style={{ maxWidth: 60 }}
                  min={0}
                />
                <button type="button" className="btn-icon-delete" onClick={() => removeMarkingPoint(i)}>✕</button>
              </div>
            ))}
            <button type="button" className="btn btn-ghost btn-sm" onClick={addMarkingPoint}>
              + Add marking point
            </button>
          </div>
        )}

        <div className="card">
          <label className="field">
            <span>Answer status</span>
            <select value={answerStatus} onChange={(e) => setAnswerStatus(e.target.value as AnswerStatus)}>
              <option value="missing">Missing — no reliable answer available</option>
              <option value="needs_review">Needs review — answer present but unverified</option>
              <option value="verified">Verified — checked and confirmed correct</option>
            </select>
          </label>
          <label className="field">
            <span>Difficulty (optional)</span>
            <select value={difficulty} onChange={(e) => setDifficulty(e.target.value as typeof difficulty)}>
              <option value="">Not set</option>
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </label>
          <label className="field">
            <span>Publishing status</span>
            <select value={contentStatus} onChange={(e) => setContentStatus(e.target.value as ContentStatus)}>
              <option value="draft">Draft</option>
              <option value="needs_review">Needs review</option>
              <option value="verified">Verified</option>
              <option value="published">Published (visible to students)</option>
              <option value="archived">Archived</option>
            </select>
          </label>
        </div>

        {error && <p className="form-error">{error}</p>}
        <button className="btn btn-primary btn-block" type="submit" disabled={saving}>
          {saving ? "Saving…" : "Save question"}
        </button>
      </form>
    </div>
  );
}
