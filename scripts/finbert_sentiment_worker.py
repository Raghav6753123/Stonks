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
    return f"{headline}. {description}".strip(". ")


def _make_review(label: str, confidence: float) -> str:
    conf_pct = max(0.0, min(100.0, confidence * 100.0))
    return f"FinBERT review: {label.lower()} sentiment ({conf_pct:.1f}% confidence)."


def _predict_batch(tokenizer, model, device, items: list) -> list:
    texts = [_build_input(item if isinstance(item, dict) else {}) for item in items]
    if not texts:
        return []

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
    out = []
    for row in probs:
        pred_idx = int(torch.argmax(row).item())
        label = str(id2label.get(pred_idx, "neutral")).lower()
        confidence = float(row[pred_idx].item())
        out.append(
            {
                "label": label,
                "confidence": confidence,
                "review": _make_review(label, confidence),
            }
        )
    return out


def main() -> int:
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    tokenizer = AutoTokenizer.from_pretrained(MODEL_NAME)
    model = AutoModelForSequenceClassification.from_pretrained(MODEL_NAME).to(device)
    model.eval()

    for line in sys.stdin:
        raw = line.strip()
        if not raw:
            continue

        req_id = None
        try:
            payload = json.loads(raw)
            req_id = payload.get("id")
            items = payload.get("items")
            if not isinstance(items, list):
                items = []

            result = _predict_batch(tokenizer, model, device, items)
            response = {"id": req_id, "result": result}
        except Exception as exc:
            response = {"id": req_id, "error": str(exc)}

        sys.stdout.write(json.dumps(response, ensure_ascii=True) + "\n")
        sys.stdout.flush()

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
