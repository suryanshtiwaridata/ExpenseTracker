import re

def parse_transaction_sms(text: str):
    """
    Parses common bank transaction SMS formats (India) to extract amount and description.
    """
    # Patterns for Amount (e.g., Rs 500.00, INR 500, ₹500)
    amount_patterns = [
        r"(?:Rs|INR|₹)\.?\s*([\d,]+\.?\d*)",
        r"spent\s*(?:Rs|INR|₹)\.?\s*([\d,]+\.?\d*)",
        r"debited\s*by\s*(?:Rs|INR|₹)\.?\s*([\d,]+\.?\d*)",
        r"credited\s*with\s*(?:Rs|INR|₹)\.?\s*([\d,]+\.?\d*)",
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
                
    # Determine if Debit or Credit
    is_credit = bool(re.search(r"credited", text, re.IGNORECASE))
    
    # Extract Bank/Platform/Merchant name
    # Usually at the end or after 'at'
    merchant_match = re.search(r"at\s+([A-Z0-9\s*]+)(?:\s+on|\.)", text, re.IGNORECASE)
    merchant = merchant_match.group(1).strip() if merchant_match else "SMS Transaction"
    
    # Simple bank name extraction
    bank_match = re.search(r"Bank\s+(\w+)", text, re.IGNORECASE)
    bank_name = bank_match.group(1) if bank_match else "Bank"
    
    description = f"{merchant} ({bank_name})"
    
    return {
        "amount": amount,
        "description": description,
        "is_credit": is_credit,
        "type": "credit" if is_credit else "debit"
    }
