"""Freeze Home Credit cut-off evidence pack from PowerBI gold CSVs."""
from __future__ import annotations

import csv
import json
import os
from datetime import date
from pathlib import Path

DEFAULT_GOLD = Path(
    os.environ.get(
        "HOME_CREDIT_GOLD",
        r"C:\Users\kater\.cursor\projects\PowerBI\11-credit-risk\data\gold",
    )
)
ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "figures" / "where-should-the-cutoff-sit.v1.json"


def read_csv(gold: Path, name: str) -> list[dict[str, str]]:
    with open(gold / name, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def fnum(x: object) -> float | object:
    try:
        return float(str(x))
    except Exception:
        return x


def thin(rows: list[dict], max_n: int = 25) -> list[dict]:
    if len(rows) <= max_n:
        return rows
    step = max(1, len(rows) // (max_n - 1))
    kept = rows[::step]
    if rows[-1] not in kept:
        kept.append(rows[-1])
    return kept[:max_n]


def coerce_rows(rows: list[dict]) -> list[dict]:
    out: list[dict] = []
    for row in rows:
        coerced: dict = {}
        for k, v in row.items():
            if v is None or v == "":
                coerced[k] = v
                continue
            s = str(v)
            try:
                if s.replace(".", "", 1).replace("-", "", 1).isdigit() or "e" in s.lower():
                    coerced[k] = float(s)
                else:
                    coerced[k] = v
            except Exception:
                coerced[k] = v
        out.append(coerced)
    return out


def main() -> None:
    gold = DEFAULT_GOLD
    if not (gold / "ModelMetrics.csv").exists():
        raise SystemExit(f"Gold not found: {gold}")

    metrics = read_csv(gold, "ModelMetrics.csv")[0]
    policies = read_csv(gold, "FactCutoffPolicy.csv")
    curve = read_csv(gold, "FactCutoffCurve.csv")
    curve_long = read_csv(gold, "FactCutoffLong.csv")
    psi = read_csv(gold, "FactPsi.csv")
    calib = read_csv(gold, "FactCalibration.csv")
    gini = read_csv(gold, "FactGiniCompare.csv")
    grades = read_csv(gold, "FactGradeBridge.csv")

    operating = next(
        (
            p
            for p in policies
            if p.get("IsOperating") in ("1", "True", "true") or p.get("Role") == "Operating"
        ),
        policies[0],
    )
    youden = next((p for p in policies if "Youden" in p.get("Method", "")), policies[-1])

    def pct(x: object, digits: int = 1) -> str:
        return f"{100 * float(x):.{digits}f}%"

    pack = {
        "id": "where-should-the-cutoff-sit-evidence-v1",
        "frozenAt": str(date.today()),
        "slug": "where-should-the-cutoff-sit",
        "decisionSpec": "docs/decision-specs/home-credit-cutoff.md",
        "source": {
            "dataset": "Home Credit Default Risk",
            "attribution": "https://www.kaggle.com/c/home-credit-default-risk",
            "goldRoot": "PowerBI/11-credit-risk/data/gold",
            "champion": metrics.get("Champion"),
            "notes": [
                "Sample scorecard for portfolio storytelling — not production IRB / IFRS 9.",
                "Desktop working grain is stratified 80k; FullN is the competition application_train size.",
                "LGD fixed at 0.45 for EL illustrations only.",
                "Operating policy maximises OOT approval subject to bad rate among approved <= budgeted appetite.",
            ],
        },
        "sample": {
            "kind": "observed",
            "sampleN": int(float(metrics["SampleN"])),
            "fullN": int(float(metrics["FullN"])),
            "defaultRate": fnum(metrics["DefaultRate"]),
            "display": {
                "sampleN": "80,000",
                "fullN": "307,511",
                "defaultRate": pct(metrics["DefaultRate"], 2),
            },
        },
        "model": {
            "kind": "calculated",
            "champion": metrics.get("Champion"),
            "train": {
                "n": int(float(metrics["TrainN"])),
                "gini": fnum(metrics["TrainGini"]),
                "auc": fnum(metrics["TrainAUC"]),
                "ks": fnum(metrics["TrainKS"]),
            },
            "test": {
                "n": int(float(metrics["TestN"])),
                "gini": fnum(metrics["TestGini"]),
                "auc": fnum(metrics["TestAUC"]),
                "ks": fnum(metrics["TestKS"]),
                "brier": fnum(metrics["TestBrier"]),
            },
            "oot": {
                "n": int(float(metrics["OotN"])),
                "gini": fnum(metrics["OotGini"]),
                "auc": fnum(metrics["OotAUC"]),
                "ks": fnum(metrics["OotKS"]),
                "brier": fnum(metrics["OotBrier"]),
                "calibMeanPredicted": fnum(metrics["CalibMeanPredictedOOT"]),
                "calibMeanRealized": fnum(metrics["CalibMeanRealizedOOT"]),
            },
            "display": {
                "ootGini": pct(metrics["OotGini"]),
                "ootKs": f"{float(metrics['OotKS']):.3f}",
                "calib": f"{pct(metrics['CalibMeanPredictedOOT'], 2)} vs {pct(metrics['CalibMeanRealizedOOT'], 2)}",
            },
        },
        "policy": {
            "kind": "calculated",
            "appetite": {
                "budgetedBadRate": fnum(metrics["BudgetedBadRate"]),
                "kind": "illustrative",
                "display": "4.0%",
            },
            "lgd": {
                "value": fnum(metrics["LGD"]),
                "kind": "illustrative",
                "display": "0.45",
            },
            "operating": {
                "method": operating.get("Method"),
                "cutoffPd": fnum(operating.get("OperatingCutoffPD") or metrics["CutoffPD"]),
                "ootApprovalRate": fnum(
                    operating.get("OotApprovalRate") or metrics["OotApprovalRate"]
                ),
                "ootBadRateApproved": fnum(
                    operating.get("OotBadRateApproved") or metrics["OotBadRateApproved"]
                ),
                "note": operating.get("PolicyNote"),
                "display": {
                    "cutoffPd": "7.5%",
                    "approval": pct(
                        operating.get("OotApprovalRate") or metrics["OotApprovalRate"]
                    ),
                    "badAmongApproved": pct(
                        operating.get("OotBadRateApproved") or metrics["OotBadRateApproved"]
                    ),
                },
            },
            "youdenReference": {
                "method": youden.get("Method"),
                "cutoffPd": fnum(
                    youden.get("OperatingCutoffPD") or metrics["YoudenCutoffPD"]
                ),
                "ootApprovalRate": fnum(youden.get("OotApprovalRate")),
                "ootBadRateApproved": fnum(youden.get("OotBadRateApproved")),
                "note": youden.get("PolicyNote"),
                "display": {
                    "cutoffPd": pct(
                        youden.get("OperatingCutoffPD") or metrics["YoudenCutoffPD"]
                    ),
                    "approval": pct(youden.get("OotApprovalRate")),
                    "badAmongApproved": pct(youden.get("OotBadRateApproved")),
                },
            },
        },
        "frontier": {
            "kind": "calculated",
            "description": "Thinned acceptance-frontier rows from gold FactCutoffCurve / FactCutoffLong.",
            "curveColumns": list(curve[0].keys()) if curve else [],
            "points": coerce_rows(thin(curve, 20)),
            "longPoints": coerce_rows(thin(curve_long, 40)),
        },
        "calibrationDeciles": {"kind": "calculated", "rows": coerce_rows(calib)},
        "giniCompare": {"kind": "calculated", "rows": coerce_rows(gini)},
        "gradeBridge": {"kind": "calculated", "rows": coerce_rows(grades)},
        "psi": {
            "kind": "calculated",
            "breachCount": int(float(metrics["PsiBreachCount"])),
            "watchCount": int(float(metrics["PsiWatchCount"])),
            "features": coerce_rows(psi),
        },
        "limitations": [
            "Competition sample history is not a live euro-area retail book.",
            "Time-OOT Gini mid-50s is honest for this public feature set; not a leaderboard flex.",
            "LGD is fixed for storytelling EL; not a loss model.",
            "Stage / IFRS 9 labels in gold are heuristics if present.",
            "Budgeted 4% bad-rate appetite is an illustrative policy input.",
        ],
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(pack, indent=2), encoding="utf-8")
    print(f"wrote {OUT} ({OUT.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
