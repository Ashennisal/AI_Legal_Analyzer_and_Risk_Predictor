import io
from docx import Document
from docx.enum.text import WD_COLOR_INDEX

# Lazy NLTK/VADER so importing this module (and starting FastAPI) does not block on NLTK downloads.
_sent_tokenize = None
_analyzer = None


def _ensure_nlp():
    global _sent_tokenize, _analyzer
    if _analyzer is not None:
        return
    import nltk
    from nltk.tokenize import sent_tokenize
    from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer

    for _pkg in ("punkt", "punkt_tab"):
        try:
            nltk.data.find(f"tokenizers/{_pkg}")
        except LookupError:
            try:
                nltk.download(_pkg, quiet=True)
            except Exception:
                pass

    _sent_tokenize = sent_tokenize
    _analyzer = SentimentIntensityAnalyzer()


RISK_PHRASES = [
    "breach of contract", "financial loss", "penalty", "non compliance",
    "data breach", "lawsuit", "legal action", "violation", "terminated",
    "risk", "liability", "damages", "fraud", "unauthorized", "confidential"
]


def analyze_document_risk(text: str):
    """Analyzes text for risky sentences and phrases."""
    _ensure_nlp()
    risky_sentences = []
    risky_phrases_found = []

    sentences = _sent_tokenize(text.lower())

    for sent in sentences:
        for phrase in RISK_PHRASES:
            if phrase in sent:
                risky_phrases_found.append(phrase)
                risky_sentences.append(sent)

        score = _analyzer.polarity_scores(sent)
        if score["compound"] < -0.5:
            risky_sentences.append(sent)

    unique_sentences = list(set(risky_sentences))
    unique_phrases = list(set(risky_phrases_found))

    risk_score = min(100, (len(unique_sentences) * 10) + (len(unique_phrases) * 5))

    risk_level = "Low"
    if risk_score > 30:
        risk_level = "Medium"
    if risk_score > 70:
        risk_level = "High"

    return {
        "risk_level": risk_level,
        "risk_score": risk_score,
        "clauses_detected": len(unique_sentences),
        "risky_phrases": unique_phrases,
        "risky_sentences": unique_sentences
    }


def create_highlighted_docx(original_text: str, risky_sentences: list) -> io.BytesIO:
    """Creates a Word document with risky sentences highlighted in yellow."""
    doc = Document()
    para = doc.add_paragraph()

    sentences = original_text.split(".")
    risky_set = set([s.strip().lower() for s in risky_sentences])

    for s in sentences:
        clean_s = s.strip().lower()
        run = para.add_run(s + ". ")
        if clean_s in risky_set and clean_s != "":
            run.font.highlight_color = WD_COLOR_INDEX.YELLOW

    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream


def detect_risks(text: str):
    """Returns (risky_sentences, risky_phrases) for main.analyze_uploaded_document."""
    result = analyze_document_risk(text)
    return result["risky_sentences"], result["risky_phrases"]


def extract_text_from_pdf(file_obj) -> str:
    """Read text from a PDF file-like object (binary mode)."""
    import PyPDF2

    pdf_reader = PyPDF2.PdfReader(file_obj)
    parts = []
    for page in pdf_reader.pages:
        t = page.extract_text()
        parts.append(t or "")
    return "\n".join(parts)
