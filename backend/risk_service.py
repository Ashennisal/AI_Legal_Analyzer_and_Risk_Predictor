import nltk
from nltk.tokenize import sent_tokenize
from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
from docx import Document
from docx.enum.text import WD_COLOR_INDEX
import io

# Ensure NLTK data is downloaded (runs once)
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

analyzer = SentimentIntensityAnalyzer()

RISK_PHRASES = [
    "breach of contract", "financial loss", "penalty", "non compliance",
    "data breach", "lawsuit", "legal action", "violation", "terminated",
    "risk", "liability", "damages", "fraud", "unauthorized", "confidential"
]

def analyze_document_risk(text: str):
    """Analyzes text for risky sentences and phrases."""
    risky_sentences = []
    risky_phrases_found = []

    sentences = sent_tokenize(text.lower())

    for sent in sentences:
        # 1. Keyword Matching
        for phrase in RISK_PHRASES:
            if phrase in sent:
                risky_phrases_found.append(phrase)
                risky_sentences.append(sent)

        # 2. Sentiment Analysis (Highly Negative = Risky)
        score = analyzer.polarity_scores(sent)
        if score["compound"] < -0.5:
            risky_sentences.append(sent)

    unique_sentences = list(set(risky_sentences))
    unique_phrases = list(set(risky_phrases_found))
    
    # Calculate a simple risk score (0-100) based on findings
    risk_score = min(100, (len(unique_sentences) * 10) + (len(unique_phrases) * 5))
    
    risk_level = "Low"
    if risk_score > 30: risk_level = "Medium"
    if risk_score > 70: risk_level = "High"

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

    # Save to a memory buffer instead of disk so we can send it to the user
    file_stream = io.BytesIO()
    doc.save(file_stream)
    file_stream.seek(0)
    return file_stream