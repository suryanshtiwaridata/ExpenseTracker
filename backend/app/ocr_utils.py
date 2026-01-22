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
        
        # Simple description extraction
        lines = [line.strip() for line in text.split("\n") if line.strip()]
        
        # Vendor extraction
        vendor = None
        
        # 1. Search for domain names/websites (e.g., uniqlo.com)
        domain_pattern = r"([a-z0-9-]+)\.(?:com|in|co|net|org|biz|shopping|store)"
        for line in lines[:10]: # Look a bit further for websites
            match = re.search(domain_pattern, line, re.IGNORECASE)
            if match:
                vendor = match.group(1).upper()
                break
        
        # 2. If no domain found, check for common business suffixes in top lines
        if not vendor:
            for line in lines[:5]:
                if any(suffix in line.upper() for suffix in [" INC", " LTD", " CORP", " PRIVATE", " STORE", " SHOP", " CAFE", " RESTAURANT", " PVT"]):
                    vendor = line
                    break
        
        # 3. Fallback to first line
        if not vendor and lines:
            vendor = lines[0]
        
        # Item extraction (heuristic: look for lines with prices)
        items = []
        for line in lines:
            # Look for lines like "Item Description 10.00"
            if re.search(r"(\d+\.\d{2})$", line):
                # Clean up the line to get the item description
                item_desc = re.sub(r"\s*[\d,]+\.\d{2}.*$", "", line).strip()
                if item_desc and len(item_desc) > 2:
                    items.append(item_desc)
        
        description = vendor if vendor else (lines[0] if lines else "Receipt Expense")
        
        # Payment Mode extraction
        payment_mode = "manual"
        full_text_upper = text.upper()
        if any(kw in full_text_upper for kw in ["UPI", "GPAY", "PHONEPE", "PAYTM"]):
            payment_mode = "upi"
        elif any(kw in full_text_upper for kw in ["CARD", "VISA", "MASTERCARD", "DEBIT", "CREDIT"]):
            payment_mode = "card"
        elif "CASH" in full_text_upper:
            payment_mode = "cash"
        elif "PAID BY HDFC" in full_text_upper or "RUPAY" in full_text_upper:
            payment_mode = "card" # Specific common patterns
            
        # Tax extraction
        tax_amount = 0.0
        tax_type = None
        
        # Look for tax keywords and amounts
        # Patterns like "GST 10.00", "CGST: 5.00", "Tax 12.50"
        tax_patterns = [
            r"(?:GST|CGST|SGST|VAT|TAX|SERVICE TAX)\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{2})",
            r"(?:GST|CGST|SGST|VAT|TAX|SERVICE TAX)\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+)",
        ]
        
        found_taxes = []
        for line in lines:
            for pattern in tax_patterns:
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    try:
                        amt = float(match.group(1).replace(",", ""))
                        found_taxes.append(amt)
                        # Identify tax type from the keyword
                        if not tax_type:
                            if "GST" in line.upper(): tax_type = "GST"
                            elif "VAT" in line.upper(): tax_type = "VAT"
                            else: tax_type = "Tax"
                    except ValueError:
                        continue
        
        if found_taxes:
            # Sum up taxes (e.g. CGST + SGST)
            tax_amount = sum(found_taxes)
            
        return {
            "amount": amount,
            "description": description,
            "vendor": vendor,
            "items": items[:5], # Limit to first 5 items
            "payment_mode": payment_mode,
            "tax_amount": tax_amount,
            "tax_type": tax_type,
            "raw_text": text[:1000] # Increased for better debugging
        }
    except Exception as e:
        print(f"OCR Error: {e}")
        return {
            "amount": None, 
            "description": "Error parsing receipt", 
            "vendor": None,
            "items": [],
            "error": str(e)
        }
