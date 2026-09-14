from pathlib import Path

from pypdf import PdfReader


pdf_path = Path(r"C:\Users\ASUS\Downloads\srs_template-ieee.pdf")
reader = PdfReader(pdf_path)

print(f"Pages: {len(reader.pages)}")
for page_number, page in enumerate(reader.pages, start=1):
    text = page.extract_text() or ""
    print(f"\n===== PAGE {page_number} =====\n")
    print(text)
