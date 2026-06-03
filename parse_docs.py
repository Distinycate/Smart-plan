import os
import zipfile
import xml.etree.ElementTree as ET

def extract_text_from_docx(docx_path):
    try:
        doc = zipfile.ZipFile(docx_path)
        xml_content = doc.read('word/document.xml')
        doc.close()
        tree = ET.XML(xml_content)
        
        # Word namespaces
        WORD_NAMESPACE = '{http://schemas.openxmlformats.org/wordprocessingml/2006/main}'
        PARA = WORD_NAMESPACE + 'p'
        TEXT = WORD_NAMESPACE + 't'
        
        paragraphs = []
        for paragraph in tree.iter(PARA):
            texts = [node.text for node in paragraph.iter(TEXT) if node.text]
            if texts:
                paragraphs.append(''.join(texts))
        return '\n'.join(paragraphs)
    except Exception as e:
        return f"Error extracting {docx_path}: {e}"

docs = [
    '../lesson-plan-generator/แนวทางการประเมิน.docx',
    '../lesson-plan-generator/แบบฟอร์มการเขียนแผนการจัดการเรียนรู้.docx'
]

for doc_path in docs:
    print(f"\n--- {doc_path} ---")
    text = extract_text_from_docx(doc_path)
    print(text[:1500]) # Print first 1500 chars

