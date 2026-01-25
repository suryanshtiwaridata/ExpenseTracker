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
        # Looks for "Total", "Grand Total", POS "Sale", etc.
        amount_patterns = [
            r"(?:TOTAL|TOTAL AMOUNT|GRAND TOTAL|NET AMOUNT|SALE|FINAL TOTAL)\s*(?:INR|RS|\$|₹)?\s*([\d,]+\.\d{2})",
            r"(?:TOTAL|TOTAL AMOUNT|GRAND TOTAL|NET AMOUNT|SALE|FINAL TOTAL)\s*(?:INR|RS|\$|₹)?\s*([\d,]+)",
            r"(?:BASE|AUTH)\s*(?:INR|RS|\$|₹)?\s*([\d,]+\.\d{2})", # POS Base amount
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
        
        # 2. Check for "MERCHANT", "NAME", or common business suffixes in top lines
        if not vendor:
            for line in lines[:5]:
                # POS machines often have "MERCHANT NAME: ..." or "STORE: ..."
                merchant_match = re.search(r"(?:MERCHANT|STORE|NAME)\s*[:\-\s]*\s*(.*)", line, re.IGNORECASE)
                if merchant_match:
                    vendor = merchant_match.group(1).strip()
                    break
                if any(suffix in line.upper() for suffix in [" INC", " LTD", " CORP", " PRIVATE", " STORE", " SHOP", " CAFE", " RESTAURANT", " PVT"]):
                    vendor = line
                    break
        
        # 3. Fallback to first line
        if not vendor and lines:
            vendor = lines[0]
        
        # Item extraction (heuristic: look for lines with prices)
        items = []
        line_items = []
        for line in lines:
            # Look for lines like "Item Description 10.00"
            price_match = re.search(r"([\d,]+\.\d{2})$", line)
            if price_match:
                price_str = price_match.group(1).replace(",", "")
                try:
                    price = float(price_str)
                    # Clean up the line to get the item description
                    item_desc = re.sub(r"\s*[\d,]+\.\d{2}.*$", "", line).strip()
                    # Skip common labels
                    if item_desc and len(item_desc) > 2 and not any(kw in item_desc.upper() for kw in ["TOTAL", "SUBTOTAL", "TAX", "GST", "VAT", "CHANGE", "CASH", "CARD", "SALE", "BASE", "AUTH", "TIP"]):
                        items.append(item_desc)
                        line_items.append({"name": item_desc, "price": price})
                except ValueError:
                    continue
        
        description = vendor if vendor else (lines[0] if lines else "Receipt Expense")
        
        # Payment Mode extraction
        payment_mode = "manual"
        full_text_upper = text.upper()
        
        # Identify specific card types for POS receipts
        card_types = ["VISA", "MASTERCARD", "MAESTRO", "RUPAY", "AMEX", "DINERS", "DISCOVER"]
        found_card = next((ct for ct in card_types if ct in full_text_upper), None)
        
        # POS Machine specific signatures
        pos_keywords = ["SALE", "AUTH CODE", "TID:", "MID:", "BATCH NO", "EXPIRY:", "CHIP READ", "SWIPE", "ENTRY:"]
        is_pos_slip = any(kw in full_text_upper for kw in pos_keywords)
        
        if is_pos_slip or found_card or any(kw in full_text_upper for kw in ["CARD", "DEBIT", "CREDIT"]):
            payment_mode = "card"
            if found_card:
                description = f"{description} ({found_card})"
        elif any(kw in full_text_upper for kw in ["UPI", "GPAY", "PHONEPE", "PAYTM"]):
            payment_mode = "upi"
        elif "CASH" in full_text_upper:
            payment_mode = "cash"
        elif "PAID BY HDFC" in full_text_upper:
            payment_mode = "card"
            
        # Advanced GST extraction
        gst_details = {"cgst": 0.0, "sgst": 0.0, "igst": 0.0, "total_gst": 0.0}
        
        gst_patterns = {
            "cgst": r"CGST\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{2})",
            "sgst": r"SGST\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{2})",
            "igst": r"IGST\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{2})",
            "total_gst": r"(?:TOTAL\s+)?GST\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{2})"
        }

        for key, pattern in gst_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    gst_details[key] = float(match.group(1).replace(",", ""))
                except ValueError:
                    continue
        
        # Fallback for total_gst if only components found
        if gst_details["total_gst"] == 0 and (gst_details["cgst"] > 0 or gst_details["sgst"] > 0):
            gst_details["total_gst"] = gst_details["cgst"] + gst_details["sgst"]
            
        tax_amount = gst_details["total_gst"]
        tax_type = "GST" if tax_amount > 0 else None
            
        return {
            "amount": amount,
            "description": description,
            "vendor": vendor,
            "items": items[:5],
            "line_items": line_items,
            "payment_mode": payment_mode,
            "tax_amount": tax_amount,
            "tax_type": tax_type,
            "gst_details": gst_details,
            "raw_text": text[:1500]
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
