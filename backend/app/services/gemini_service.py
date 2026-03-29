import google.generativeai as genai
import json
import re
import logging
from typing import Optional
from app.config import settings

logger = logging.getLogger(__name__)


def _configure():
    genai.configure(api_key=settings.GEMINI_API_KEY)


def _parse_json(text: str) -> dict:
    text = text.strip()
    text = re.sub(r'^```json\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'^```\s*', '', text, flags=re.MULTILINE)
    text = re.sub(r'```$', '', text, flags=re.MULTILINE)
    return json.loads(text.strip())


def ocr_receipt(image_path: str) -> dict:
    """Run Gemini Vision OCR on a receipt image."""
    try:
        _configure()
        from PIL import Image
        model = genai.GenerativeModel("gemini-2.5-flash")
        image = Image.open(image_path)
        prompt = """You are an expert OCR engine for expense receipts and invoices.
Carefully analyze the receipt image and extract ALL visible information.

Read the image thoroughly and extract:
- Vendor/merchant name
- Total amount (the final amount paid)
- Currency (look for currency symbols like ₹, $, €, £)
- Date of transaction
- Item descriptions or what was purchased
- Individual line items if visible

Return ONLY valid JSON in this exact format (no markdown, no explanation):
{
  "vendor_name": "exact vendor name from receipt or null",
  "total_amount": 1234.56,
  "currency_code": "INR",
  "date": "YYYY-MM-DD",
  "description": "brief description of what was purchased",
  "line_items": [{"name": "item name", "amount": 123.45}],
  "ocr_confidence": 95
}

Set ocr_confidence based on image quality and text clarity:
- 90-100: Crystal clear text, all fields extracted
- 70-89: Good quality, most fields extracted
- 50-69: Moderate quality, some fields extracted
- Below 50: Poor quality or minimal data extracted

Be precise. Extract actual values from the image."""
        response = model.generate_content([prompt, image])
        result = _parse_json(response.text)
        # Ensure ocr_confidence is set properly
        if 'ocr_confidence' not in result or result['ocr_confidence'] is None:
            result['ocr_confidence'] = 75  # Default confidence if image was successfully processed
        return result
    except Exception as e:
        logger.error(f"OCR error: {e}")
        return {
            "vendor_name": None, "total_amount": None, "currency_code": None,
            "date": None, "description": None, "line_items": [], "ocr_confidence": 0
        }


def categorize_expense(title: str, description: str, vendor: Optional[str],
                        line_items: list, policy_text: Optional[str] = None) -> dict:
    """Categorize expense and compute risk score via Gemini."""
    try:
        _configure()
        model = genai.GenerativeModel("gemini-2.5-flash")
        policy_section = f"\nCompany Policy:\n{policy_text}" if policy_text else ""
        prompt = f"""You are an expense categorization AI. Return ONLY valid JSON.
Expense Title: {title}
Description: {description}
Vendor: {vendor}
Line Items: {json.dumps(line_items)}
{policy_section}

Return JSON:
{{
  "suggested_category": "one of Travel/Meals/Accommodation/Office Supplies/Entertainment/Training/Medical/Miscellaneous",
  "confidence": 85,
  "policy_flags": [],
  "risk_score": 10,
  "risk_reason": "brief explanation"
}}"""
        response = model.generate_content(prompt)
        return _parse_json(response.text)
    except Exception as e:
        logger.error(f"Categorize error: {e}")
        return {
            "suggested_category": "Miscellaneous",
            "confidence": 0,
            "policy_flags": [],
            "risk_score": 0,
            "risk_reason": "AI analysis unavailable"
        }


def generate_manager_assist_summary(expense_title: str, expense_amount: float,
                                     category: str, company_currency: str,
                                     avg_amount: float, pct_diff: float,
                                     ocr_confidence: int, policy_flags: list,
                                     risk_score: int, recent_expenses: list) -> str:
    """Generate a 2-3 sentence AI summary for the manager approval screen."""
    try:
        _configure()
        model = genai.GenerativeModel("gemini-2.5-flash")
        prompt = f"""You are an AI assistant helping a manager review an expense claim.
Write a 2-3 sentence neutral, factual summary to help the manager decide.
Mention: average spending comparison, anomalies if any, OCR confidence.
Be concise. No fluff.

Expense: {expense_title}, {expense_amount} {company_currency}
Category: {category}
Employee's average for {category} (last 6 months): {avg_amount} {company_currency}
Difference from average: {pct_diff:+.1f}%
OCR confidence: {ocr_confidence}%
Policy flags: {policy_flags}
Risk score: {risk_score}/100
Recent expenses (last 5): {json.dumps(recent_expenses)}"""
        response = model.generate_content(prompt)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Manager assist error: {e}")
        avg_str = f"{avg_amount:.2f}" if avg_amount else "N/A"
        return (f"This {category} expense of {expense_amount} {company_currency} is "
                f"{abs(pct_diff):.1f}% {'above' if pct_diff > 0 else 'below'} the employee's "
                f"6-month average of {avg_str} {company_currency}. "
                f"Risk score: {risk_score}/100. OCR confidence: {ocr_confidence}%.")


def chat_with_ai(user_message: str, user_context: dict) -> str:
    """Chatbot endpoint — answer expense queries based on user's data."""
    try:
        _configure()
        system = f"""You are ReimburseBot, an AI assistant for the ReimburseAI expense management platform.
User: {user_context.get('name')}, Role: {user_context.get('role')}, Company Currency: {user_context.get('company_currency')}

User's expense data:
{json.dumps(user_context.get('expenses_summary', {}), indent=2)}

Answer the user's question based only on this data. Be concise. Use the company currency symbol.
If you don't have enough data, say so. Do NOT make up numbers."""
        model = genai.GenerativeModel("gemini-1.5-flash", system_instruction=system)
        response = model.generate_content(user_message)
        return response.text.strip()
    except Exception as e:
        logger.error(f"Chat error: {e}")
        return "I'm having trouble connecting to the AI service. Please try again shortly."
