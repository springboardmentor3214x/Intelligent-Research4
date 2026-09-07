import io
import logging
import re
from typing import NamedTuple

import httpx

logger = logging.getLogger(__name__)

# Maximum allowable PDF file size to stream (25 MB)
MAX_PDF_DOWNLOAD_BYTES = 25 * 1024 * 1024
DEFAULT_HTTP_TIMEOUT = 15.0

# Standard academic section patterns
SECTION_PATTERNS = [
    (r"\b(abstract)\b", "Abstract"),
    (r"\b(introduction|background|motivation)\b", "Introduction"),
    (r"\b(related work|literature review|prior work|background & context)\b", "Related Work"),
    (r"\b(methodology|method|proposed method|system architecture|model architecture|approach)\b", "Methodology"),
    (r"\b(dataset|datasets|data collection|data preprocessing|benchmark)\b", "Dataset"),
    (r"\b(experiments|experimental setup|implementation details|training setup)\b", "Experiments"),
    (r"\b(results|evaluation|empirical results|performance comparison)\b", "Results"),
    (r"\b(discussion|ablation study|analysis)\b", "Discussion"),
    (r"\b(limitations|threats to validity)\b", "Limitations"),
    (r"\b(future work|future directions)\b", "Future Work"),
    (r"\b(conclusion|concluding remarks)\b", "Conclusion"),
]


class ExtractedPaperContent(NamedTuple):
    content_scope: str  # "full_text" | "abstract_and_metadata" | "metadata_only"
    coverage_level: str  # "high" | "medium" | "low"
    cleaned_text: str
    section_map: dict[str, str]
    source_url: str | None
    pdf_extracted: bool
    notes: str


def find_open_access_pdf_url(paper_source: str, source_id: str, doi: str | None, publication_link: str | None) -> str | None:
    """
    Safely discover open-access PDF or full-text URLs using legal open endpoints:
    1. ArXiv (e.g., https://arxiv.org/pdf/{arxiv_id}.pdf)
    2. OpenAlex Work API open_access object
    3. Semantic Scholar openAccessPdf object
    """
    clean_doi = (doi or "").strip()
    if clean_doi.startswith("https://doi.org/"):
        clean_doi = clean_doi.replace("https://doi.org/", "")

    # Check for direct arXiv ID in source_id, DOI, or publication link
    arxiv_match = re.search(r"(\d{4}\.\d{4,5}(?:v\d+)?|abs/(\d{4}\.\d{4,5}))", f"{source_id} {clean_doi} {publication_link or ''}")
    if arxiv_match:
        arxiv_id = arxiv_match.group(1).replace("abs/", "")
        return f"https://arxiv.org/pdf/{arxiv_id}.pdf"

    # Query OpenAlex legal open_access location if OpenAlex source
    if paper_source.lower() == "openalex" and source_id:
        try:
            res = httpx.get(f"https://api.openalex.org/works/{source_id}", timeout=DEFAULT_HTTP_TIMEOUT)
            if res.status_code == 200:
                data = res.json()
                oa_info = data.get("open_access") or {}
                oa_url = oa_info.get("oa_url")
                if oa_url and ("pdf" in oa_url.lower() or "arxiv" in oa_url.lower()):
                    return oa_url
                best_loc = data.get("best_oa_location") or {}
                pdf_url = best_loc.get("pdf_url")
                if pdf_url:
                    return pdf_url
        except Exception as exc:
            logger.debug(f"OpenAlex OA lookup exception: {exc}")

    # Query Semantic Scholar openAccessPdf if DOI is present
    if clean_doi:
        try:
            res = httpx.get(
                f"https://api.semanticscholar.org/graph/v1/paper/{clean_doi}?fields=openAccessPdf,isOpenAccess",
                timeout=DEFAULT_HTTP_TIMEOUT
            )
            if res.status_code == 200:
                data = res.json()
                oa_pdf = data.get("openAccessPdf") or {}
                pdf_url = oa_pdf.get("url")
                if pdf_url:
                    return pdf_url
        except Exception as exc:
            logger.debug(f"Semantic Scholar OA lookup exception: {exc}")

    # Check if publication_link already points to open pdf
    if publication_link and publication_link.lower().endswith(".pdf"):
        return publication_link

    return None


def download_pdf_safely(pdf_url: str) -> bytes | None:
    """
    Download PDF with streaming size limit and timeout to avoid huge downloads.
    Never bypasses authentication/paywalls.
    """
    try:
        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36 ResearchIntelligencePlatform/1.0"
        }
        with httpx.stream("GET", pdf_url, headers=headers, timeout=DEFAULT_HTTP_TIMEOUT, follow_redirects=True) as response:
            if response.status_code != 200:
                logger.info(f"Open-access PDF request returned status {response.status_code} for {pdf_url}")
                return None

            content_type = response.headers.get("content-type", "").lower()
            if "html" in content_type and "pdf" not in content_type:
                logger.info(f"URL returned HTML instead of PDF: {pdf_url}")
                return None

            downloaded = bytearray()
            for chunk in response.iter_bytes(chunk_size=65536):
                downloaded.extend(chunk)
                if len(downloaded) > MAX_PDF_DOWNLOAD_BYTES:
                    logger.warning(f"PDF exceeded size limit ({MAX_PDF_DOWNLOAD_BYTES} bytes): {pdf_url}")
                    return None

            return bytes(downloaded)
    except Exception as exc:
        logger.warning(f"Failed to download open access PDF from {pdf_url}: {exc}")
        return None


def extract_text_from_pdf(pdf_bytes: bytes) -> str:
    """
    Extract clean textual content from PDF bytes using pypdf.
    """
    try:
        from pypdf import PdfReader
        reader = PdfReader(io.BytesIO(pdf_bytes))
        pages_text = []

        for i, page in enumerate(reader.pages):
            # Limit to first 25 pages to avoid token overflow
            if i >= 25:
                break
            text = page.extract_text() or ""
            if text.strip():
                pages_text.append(text)

        raw_text = "\n\n".join(pages_text)
        return clean_extracted_text(raw_text)
    except Exception as exc:
        logger.error(f"Error extracting text with pypdf: {exc}")
        return ""


def clean_extracted_text(text: str) -> str:
    """
    Normalize whitespaces, strip repeated headers/footers and line breaks.
    """
    # Fix hyphenated words at line breaks (e.g. Trans-\nformer or Trans- \nformer)
    text = re.sub(r"(\w+)-\s*\n\s*(\w+)", r"\1\2", text)
    # Normalize multiple newlines
    text = re.sub(r"\n{3,}", "\n\n", text)
    # Strip non-printable / control characters while keeping standard punctuation
    text = re.sub(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f]", "", text)
    return text.strip()


def detect_sections(full_text: str) -> dict[str, str]:
    """
    Segment text into major standard sections based on detected headings.
    """
    sections: dict[str, str] = {}
    lines = full_text.split("\n")
    current_section = "General"
    current_lines: list[str] = []

    for line in lines:
        stripped = line.strip()
        matched = False

        if 2 <= len(stripped) <= 60 and not stripped.endswith("."):
            lower_line = stripped.lower()
            for pattern, sec_name in SECTION_PATTERNS:
                if re.search(pattern, lower_line):
                    if current_lines:
                        sections[current_section] = sections.get(current_section, "") + "\n" + "\n".join(current_lines)
                        current_lines = []
                    current_section = sec_name
                    matched = True
                    break

        if not matched:
            current_lines.append(line)

    if current_lines:
        sections[current_section] = sections.get(current_section, "") + "\n" + "\n".join(current_lines)

    return {k: v.strip() for k, v in sections.items() if v.strip()}


def extract_best_paper_content(
    paper_title: str,
    paper_abstract: str | None,
    paper_source: str,
    source_id: str,
    doi: str | None,
    publication_link: str | None,
) -> ExtractedPaperContent:
    """
    Execute full pipeline:
    1. Check for legal Open-Access PDF / HTML
    2. Extract & clean text + section map if available
    3. Fallback to complete abstract + metadata if full-text is not accessible
    """
    abstract_clean = (paper_abstract or "").strip()
    pdf_url = find_open_access_pdf_url(paper_source, source_id, doi, publication_link)

    if pdf_url:
        logger.info(f"Discovered legal open-access PDF candidate: {pdf_url}")
        pdf_bytes = download_pdf_safely(pdf_url)
        if pdf_bytes:
            extracted_text = extract_text_from_pdf(pdf_bytes)
            if len(extracted_text) >= 1200:
                section_map = detect_sections(extracted_text)
                return ExtractedPaperContent(
                    content_scope="full_text",
                    coverage_level="high",
                    cleaned_text=extracted_text,
                    section_map=section_map,
                    source_url=pdf_url,
                    pdf_extracted=True,
                    notes="Full open-access paper text extracted and segmented into sections.",
                )

    # Fallback to abstract & metadata
    if abstract_clean and len(abstract_clean) >= 40:
        return ExtractedPaperContent(
            content_scope="abstract_and_metadata",
            coverage_level="medium",
            cleaned_text=abstract_clean,
            section_map={"Abstract": abstract_clean},
            source_url=publication_link,
            pdf_extracted=False,
            notes="Full text was not available from accessible open sources. The analysis is based on the available abstract and metadata.",
        )

    # Metadata only
    return ExtractedPaperContent(
        content_scope="metadata_only",
        coverage_level="low",
        cleaned_text=paper_title,
        section_map={},
        source_url=publication_link,
        pdf_extracted=False,
        notes="Only minimal paper title and repository metadata were available.",
    )
