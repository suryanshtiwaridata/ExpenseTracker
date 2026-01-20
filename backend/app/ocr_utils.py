import pytesseract
from PIL import Image
import io
import re
import base64

def extract_receipt_data(image_base64: str):
    """
    Extracts total amount and date from a base64 encoded receipt image.
    """
    try:
        # Decode base64 image
        image_data = base64.b64decode(image_base64)
        image = Image.open(io.BytesIO(image_data))
        
        # Perform OCR
        text = pytesseract.image_to_string(image)
        
        # Regex patterns for total amount
        # Looks for "Total", "Grand Total", "Amount", etc. followed by numbers
        amount_patterns = [
            r"(?:TOTAL|TOTAL AMOUNT|GRAND TOTAL|NET AMOUNT)\s*(?:INR|RS|\$|₹)?\s*([\d,]+\.\d{2})",
            r"(?:TOTAL|TOTAL AMOUNT|GRAND TOTAL|NET AMOUNT)\s*(?:INR|RS|\$|₹)?\s*([\d,]+)",
            r"([\d,]+\.\d{2})", # Fallback to any decimal number
        ]
        
        amount = None
        for pattern in amount_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                amount_str = match.group(1).replace(",", "")
                try:
                    amount = float(amount_str)
                    break
                except ValueError:
                    continue
        
        # Simple description extraction (first line or first few words)
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        description = lines[0] if lines else "Receipt Expense"
        
        return {
            "amount": amount,
            "description": description,
            "raw_text": text[:500] # For debugging
        }
    except Exception as e:
        print(f"OCR Error: {e}")
        return {"amount": None, "description": "Error parsing receipt", "error": str(e)}
