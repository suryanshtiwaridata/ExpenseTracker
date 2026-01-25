import pytesseract
from PIL import Image, ImageOps, ImageEnhance
import io
import re
import base64
import os

LOG_FILE = "/Users/suryansh/ExpenseTracker/ExpenseTracker/backend/ocr_debug.log"

def log_debug(msg):
    with open(LOG_FILE, "a") as f:
        f.write(f"{msg}\n")

def preprocess_image(image: Image.Image) -> Image.Image:
    """
    Simulates a document scanner effect by converting to grayscale,
    increasing contrast, and sharpening.
    """
    # Resize if too large (improves OCR speed and prevents timeouts)
    max_size = 1280
    if max(image.size) > max_size:
        ratio = max_size / max(image.size)
        new_size = (int(image.size[0] * ratio), int(image.size[1] * ratio))
        image = image.resize(new_size, Image.Resampling.LANCZOS)
    
    # Convert to grayscale
    image = ImageOps.grayscale(image)
    
    # Increase contrast significantly to make it look like a scan
    enhancer = ImageEnhance.Contrast(image)
    image = enhancer.enhance(2.5) # High contrast
    
    # Sharpen to make text stand out
    enhancer = ImageEnhance.Sharpness(image)
    image = enhancer.enhance(2.0)
    
    return image

async def extract_receipt_data(image_base64: str, db=None):
    log_debug("extract_receipt_data started")
    try:
        # Decode base64 image
        log_debug("Decoding base64...")
        image_data = base64.decodebytes(image_base64.encode('utf-8'))
        image = Image.open(io.BytesIO(image_data))
        
        # Preprocess to look like a "Scan"
        scanned_image = preprocess_image(image)
        
        # Convert scanned image back to base64
        buffered = io.BytesIO()
        scanned_image.save(buffered, format="JPEG", quality=85)
        scanned_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        # Perform OCR on the preprocessed image
        log_debug("Starting Tesseract...")
        text = pytesseract.image_to_string(scanned_image)
        log_debug(f"Tesseract complete. Text length: {len(text)}")
        
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
                    # Skip common labels but INCLUDE specific tax rows if found
                    if item_desc and len(item_desc) > 2 and not any(kw in item_desc.upper() for kw in ["TOTAL", "SUBTOTAL", "VAT", "CHANGE", "CASH", "CARD", "SALE", "BASE", "AUTH", "TIP"]):
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
            "cgst": r"(?:C\.?G\.?S\.?T\.?|CSGT)\s*(?:@\s*[\d.]+\s*%)?\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{1,2})",
            "sgst": r"(?:S\.?G\.?S\.?T\.?|UTGST)\s*(?:@\s*[\d.]+\s*%)?\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{1,2})",
            "igst": r"I\.?G\.?S\.?T\.?\s*(?:@\s*[\d.]+\s*%)?\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{1,2})",
            "total_gst": r"(?:TOTAL\s+)?(?:GST|TAX)\s*(?:@\s*[\d.]+\s*%)?\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{1,2})"
        }

        for key, pattern in gst_patterns.items():
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    gst_details[key] = float(match.group(1).replace(",", ""))
                except ValueError:
                    continue
        
        # Fallback for total_gst if only components found
        if gst_details["total_gst"] == 0:
            gst_details["total_gst"] = gst_details["cgst"] + gst_details["sgst"] + gst_details["igst"]
            
        tax_amount = gst_details["total_gst"]
        # If no specific GST categories found, but "TAX" or "GST" amount exists
        if tax_amount == 0:
            tax_match = re.search(r"(?:TAX|GST)\s*[:\-\s]*\s*(?:INR|RS|₹)?\s*([\d,]+\.\d{1,2})", text, re.IGNORECASE)
            if tax_match:
                tax_amount = float(tax_match.group(1).replace(",", ""))
                gst_details["total_gst"] = tax_amount
        
        tax_type = "GST" if tax_amount > 0 else None
            
        # ML Learning: Apply Previous Corrections
        if db is not None and vendor:
            log_debug(f"Checking learning DB for vendor: {vendor}")
            try:
                # Look for most recent corrections for this vendor
                prev_corrections = await db.ocr_learning.find({"vendor": vendor.upper()}).sort("created_at", -1).to_list(length=5)
                log_debug(f"Found {len(prev_corrections)} previous corrections")
                if prev_corrections:
                    # If we found corrections, we could use them for smarter regex or direct replacement
                    # For now, let's just flag higher accuracy if we see consistent manual overrides
                    for entry in prev_corrections:
                        disc = entry.get("discrepancies", {})
                        if "amount" in disc and amount == disc["amount"]["original"]:
                            # The OCR misread the amount in a predictable way before!
                            # amount = disc["amount"]["corrected"] # High risk to auto-apply, better to flag
                            pass
            except Exception as e:
                print(f"Learning Lookup Error: {e}")
            
        # Date extraction
        date_patterns = [
            r"(\d{1,2})[/\-\.](\d{1,2})[/\-\.](\d{2,4})", # DD/MM/YYYY or MM/DD/YYYY
            r"(\d{4})[/\-\.](\d{1,2})[/\-\.](\d{1,2})", # YYYY-MM-DD
            r"(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\s+(\d{2,4})", # DD MMM YYYY
        ]
        
        extracted_date = None
        for pattern in date_patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    groups = match.groups()
                    if len(groups) == 3:
                        # Heuristic for DD/MM/YYYY vs MM/DD/YYYY
                        # If first group > 12, it's definitely DD/MM
                        # Otherwise, assume DD/MM (most common outside US)
                        if len(groups[0]) == 4: # YYYY-MM-DD
                            year, month, day = int(groups[0]), int(groups[1]), int(groups[2])
                        elif groups[1].isalpha(): # DD MMM YYYY
                            day = int(groups[0])
                            month_str = groups[1].capitalize()[:3]
                            months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                            month = months.index(month_str) + 1
                            year = int(groups[2])
                            if year < 100: year += 2000
                        else: # DD/MM/YYYY
                            d1, d2, year = int(groups[0]), int(groups[1]), int(groups[2])
                            if d1 > 12:
                                day, month = d1, d2
                            else:
                                day, month = d1, d2 # Default to DD/MM
                            if year < 100: year += 2000
                        
                        # Validate date
                        import datetime
                        extracted_date = datetime.datetime(year, month, day).isoformat()
                        break
                except Exception:
                    continue

        return {
            "amount": amount,
            "date": extracted_date,
            "description": description,
            "vendor": vendor,
            "items": items[:5],
            "line_items": line_items,
            "payment_mode": payment_mode,
            "tax_amount": tax_amount,
            "tax_type": tax_type,
            "gst_details": gst_details,
            "scanned_image": scanned_base64,
            "raw_text": text[:1500],
            "confidence_scores": {
                "amount": 0.9 if amount else 0.3,
                "vendor": 0.8 if vendor else 0.2,
                "gst": 0.9 if gst_details["total_gst"] > 0 else 0.5
            }
        }
    except Exception as e:
        log_debug(f"CRITICAL OCR ERROR: {str(e)}")
        import traceback
        log_debug(traceback.format_exc())
        return {
            "amount": None, 
            "description": "Error parsing receipt", 
            "vendor": None,
            "items": [],
            "error": str(e)
        }
