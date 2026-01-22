import pdfplumber
import re
import io
import base64
from datetime import datetime

def parse_bank_statement_pdf(pdf_base64: str):
    """
    Parses a bank statement PDF and extracts transaction data.
    Heuristics:
    - Look for rows that contain a date, a description, and an amount.
    - Specifically look for debit amounts.
    """
    expenses = []
    
    try:
        pdf_bytes = base64.b64decode(pdf_base64)
        with pdfplumber.open(io.BytesIO(pdf_bytes)) as pdf:
            for page in pdf.pages:
                text = page.extract_text()
                if not text:
                    continue
                
                # Normalize text: convert all whitespace to single spaces and standardize line endings
                normalized_text = re.sub(r'\s+', ' ', text)
                
                # Very flexible pattern to find transaction blocks
                # 1. Date like "27 Dec, 2025"
                # 2. Text in between
                # 3. Rupee symbol (literal or unicode) followed by amount
                # Pattern: Date (e.g. 27 Dec, 2025) ... (vendor/info) ... (₹/Amount)
                # We use a non-greedy catch-all in between.
                
                pattern = r'(\d{1,2}\s[A-Za-z]{3,},?\s\d{4})\s+(.*?)\s*[₹\u20b9]\s?([\d,]+(?:\.\d{0,2})?)'
                matches = re.finditer(pattern, normalized_text)
                
                found_in_page = False
                for match in matches:
                    found_in_page = True
                    date_str = match.group(1).strip()
                    block_text = match.group(2).strip()
                    amount_str = match.group(3).replace(',', '')
                    
                    # Extract vendor from block_text
                    vendor = "Unknown Vendor"
                    # Look for common prefixes in modern statements
                    vendor_patterns = [
                        r'Paid to\s+(.*?)(?:\s+UPI|$)',
                        r'To\s+(.*?)(?:\s+UPI|$)',
                        r'M/S\.\s+(.*?)(?:\s+UPI|$)',
                        r'Transaction details\s+(.*?)(?:\s+UPI|$)'
                    ]
                    
                    for vp in vendor_patterns:
                        vm = re.search(vp, block_text, re.IGNORECASE)
                        if vm:
                            vendor = vm.group(1).strip()
                            break
                    
                    if vendor == "Unknown Vendor" and block_text:
                        # Fallback: Just take the first few words of the block if no pattern matches
                        # but skip things that look like times (08:43 PM)
                        v_part = re.sub(r'\d{1,2}:\d{2}\s?(?:AM|PM)', '', block_text, flags=re.IGNORECASE).strip()
                        vendor = v_part[:50] if v_part else "Statement Item"

                    description = vendor
                    
                    # Try to parse the date
                    parsed_date = datetime.now()
                    try:
                        # Format like "27 Dec, 2025" or "27 Dec 2025"
                        clean_date_str = date_str.replace(',', '').strip()
                        parsed_date = datetime.strptime(clean_date_str, "%d %b %Y")
                    except Exception as de:
                        print(f"Date parsing error: {de}")

                    category = "Other"
                    desc_lower = description.lower()
                    
                    # Enhanced category guessing
                    if any(kw in desc_lower for kw in ['swiggy', 'zomato', 'restaurant', 'food', 'hotel', 'pharmacy', 'homoeo', 'store', 'mart', 'kirana']):
                        category = "Health" if any(kw in desc_lower for kw in ['pharmacy', 'homoeo', 'clinic', 'hospital']) else "Food"
                    elif any(kw in desc_lower for kw in ['amazon', 'flipkart', 'myntra', 'shopping', 'lifestyle', 'mall']):
                        category = "Shopping"
                    elif any(kw in desc_lower for kw in ['uber', 'ola', 'taxi', 'fuel', 'petrol', 'transport', 'metro']):
                        category = "Transport"
                    elif any(kw in desc_lower for kw in ['starbucks', 'cafe', 'coffee', 'chai', 'tea']):
                        category = "Coffee"
                    elif any(kw in desc_lower for kw in ['jio', 'recharge', 'bill', 'electricity', 'water', 'gas', 'airtel']):
                        category = "Bills"

                    # Guess Payment Mode
                    payment_mode = "upi" # Default for bank statements/UPI extracts
                    block_upper = block_text.upper()
                    if any(kw in block_upper for kw in ["CARD", "RUPAY", "VISA", "MASTERCARD", "DEBIT", "CREDIT"]):
                        payment_mode = "card"
                    elif "CASH" in block_upper:
                        payment_mode = "cash"

                    expenses.append({
                        "amount": float(amount_str),
                        "description": description,
                        "vendor": vendor,
                        "category": category,
                        "date": parsed_date.isoformat(),
                        "source": "pdf",
                        "payment_mode": payment_mode
                    })
                
                # Fallback: if block parsing failed, try a line-by-line amount search
                if not found_in_page:
                    lines = text.split('\n')
                    for line in lines:
                        if '₹' in line or '\u20b9' in line or 'INR' in line:
                            amt_match = re.search(r'[₹\u20b9INR]\s?([\d,]+(?:\.\d{0,2})?)', line)
                            if amt_match:
                                val = float(amt_match.group(1).replace(',', ''))
                                if val > 0:
                                    # Guess Payment Mode for fallback
                                    fallback_mode = "upi"
                                    lu = line.upper()
                                    if any(kw in lu for kw in ["CARD", "RUPAY", "VISA", "MASTERCARD"]):
                                        fallback_mode = "card"
                                    elif "CASH" in lu:
                                        fallback_mode = "cash"
                                        
                                    expenses.append({
                                        "amount": val,
                                        "description": "Statement Transaction",
                                        "vendor": "Unknown Vendor",
                                        "category": "Other",
                                        "date": datetime.now().isoformat(),
                                        "source": "pdf",
                                        "payment_mode": fallback_mode
                                    })
                    
        return expenses
    except Exception as e:
        print(f"Error parsing PDF: {e}")
        return []
