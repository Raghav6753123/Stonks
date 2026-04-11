import json
import sys
from typing import Any

import torch
from transformers import AutoModelForSequenceClassification, AutoTokenizer

MODEL_NAME = "ProsusAI/finbert"


def _safe_text(value: Any) -> str:
    if value is None:
        return ""
    return str(value).strip()


def _build_input(item: dict) -> str:
    headline = _safe_text(item.get("headline"))
    description = _safe_text(item.get("description"))
    if description:
        return f"{headline}. {description}"
    return headline


def _make_review(label: str, confidence: float) -> str:
    label_text = label.lower()
    conf_pct = max(0.0, min(100.0, confidence * 100.0))
    return f"FinBERT review: {label_text} sentiment ({conf_pct:.1f}% confidence)."


def main() -> int:
    raw_payload = sys.argv[1] if len(sys.argv) > 1 else "[]"
    try:
        items = json.loads(raw_payload)
        if not isinstance(items, list):
            items = []
    except Exception:
        items = []

    if not items:
        print("[]")
        return 0

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(device)
    model.eval()

    texts = [_build_input(item if isinstance(item, dict) else {}) for item in items]

    with torch.no_grad():
        encoded = tokenizer(
            texts,
            return_tensors="pt",
            truncation=True,
            padding=True,
            max_length=256,
        )
        encoded = {k: v.to(device) for k, v in encoded.items()}
        logits = model(**encoded).logits
        probs = torch.softmax(logits, dim=-1)

    id2label = model.config.id2label
    output = []
    for row in probs:
        pred_idx = int(torch.argmax(row).item())
        label = str(id2label.get(pred_idx, "neutral")).lower()
        confidence = float(row[pred_idx].item())
        output.append(
            {
                "label": label,
                "confidence": confidence,
                "review": _make_review(label, confidence),
            }
        )

    print(json.dumps(output, ensure_ascii=True))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
