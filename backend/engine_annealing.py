"""
SmartTriage Engine — God Mode (Parallel Combinatorial Optimizer)
================================================================
Architecture: Multi-Core Simulated Annealing on Individual Priority Vectors
"""

import argparse
import copy
import csv
import heapq
import json
import math
import os
import random
import time
import concurrent.futures
from typing import Any

DOCTORS = {"Doctor_T": "TRAUMA", "Doctor_C": "CARDIO", "Doctor_G": "GENERAL"}
SPECS = ["TRAUMA", "CARDIO", "GENERAL"]

# ---------------------------------------------------------------------------
# High-Speed Discrete-Event Simulator
# ---------------------------------------------------------------------------

def simulate(
    patients_data: list[dict],
    patient_boosts: dict[str, float],
    alpha: float,
    beta: float,
    gamma: float,
    twist_active: bool = False,
) -> tuple[list[dict], int]:
    
    by_spec = {s: [] for s in SPECS}
    for p in patients_data:
        by_spec[p["required_specialization"]].append(p)

    arr_ptr = {s: 0 for s in SPECS}
    wait_pool = {s: [] for s in SPECS}
    doc_free = {d: 0 for d in DOCTORS}
    doc_treatments = {d: 0 for d in DOCTORS}

    treatments = []
    total_risk = 0
    heap = []

    def push_arrival(s: str):
        if arr_ptr[s] < len(by_spec[s]):
            heapq.heappush(heap, (by_spec[s][arr_ptr[s]]["arrival_time"], 1, s))

    for s in SPECS: push_arrival(s)
    for d in DOCTORS: heapq.heappush(heap, (0, 0, d))

    processed_doctors_at = {d: -1 for d in DOCTORS}

    def admit(t: int):
        for s in SPECS:
            q = by_spec[s]
            while arr_ptr[s] < len(q) and q[arr_ptr[s]]["arrival_time"] <= t:
                wait_pool[s].append(q[arr_ptr[s]])
                arr_ptr[s] += 1
                push_arrival(s)

    def select_patient(doc_id: str, t: int) -> dict | None:
        spec = DOCTORS[doc_id]
        candidates = []
        if spec == "GENERAL":
            for s in SPECS: candidates.extend(wait_pool[s])
        else:
            candidates = list(wait_pool[spec])

        if not candidates: return None

        def score(p):
            wait = t - p["arrival_time"]
            base = (p["severity"] ** alpha) * ((wait + 1) ** beta) / (p["treatment_time"] ** gamma)
            return base + patient_boosts[p["patient_id"]]

        return max(candidates, key=lambda p: (score(p), -p["arrival_time"]))

    def assign(doc_id: str, patient: dict, t: int):
        nonlocal total_risk
        end = t + patient["treatment_time"]
        wait = t - patient["arrival_time"]
        total_risk += patient["severity"] * wait

        treatments.append({
            "patient_id": patient["patient_id"],
            "doctor_id": doc_id,
            "start_time": t,
            "end_time": end,
        })

        doc_free[doc_id] = end
        doc_treatments[doc_id] += 1
        wait_pool[patient["required_specialization"]].remove(patient)

        if twist_active and doc_treatments[doc_id] % 4 == 0:
            doc_free[doc_id] += 5

        heapq.heappush(heap, (doc_free[doc_id], 0, doc_id))

    while heap:
        t, etype, eid = heapq.heappop(heap)
        admit(t)

        if etype == 1: continue

        doc_id = eid
        if doc_free[doc_id] > t or processed_doctors_at[doc_id] == t: continue
        processed_doctors_at[doc_id] = t

        patient = select_patient(doc_id, t)
        if patient:
            assign(doc_id, patient, t)
        else:
            next_times = [by_spec[s][arr_ptr[s]]["arrival_time"] for s in SPECS if arr_ptr[s] < len(by_spec[s])]
            if next_times:
                wake = min(next_times)
                if wake > t: heapq.heappush(heap, (wake, 0, doc_id))

    treatments.sort(key=lambda x: (x["start_time"], x["patient_id"]))
    return treatments, total_risk

# ---------------------------------------------------------------------------
# Parallel Worker Function
# ---------------------------------------------------------------------------

def worker_task(worker_id: int, patients_data: list[dict], twist_active: bool, iterations: int) -> tuple[int, list[dict], str]:
    rng = random.Random(42 + worker_id)
    
    # Each worker gets a slightly different baseline heuristic to start from
    a = round(rng.uniform(1.5, 4.0), 2)
    b = round(rng.uniform(0.5, 2.0), 2)
    c = round(rng.uniform(0.5, 1.5), 2)

    patient_ids = [p["patient_id"] for p in patients_data]
    current_boosts = {pid: 0.0 for pid in patient_ids}
    
    best_treatments, current_risk = simulate(patients_data, current_boosts, a, b, c, twist_active)
    best_risk = current_risk
    best_boosts = copy.copy(current_boosts)
    
    temp = 1000.0
    cooling_rate = 0.99
    
    for _ in range(iterations):
        num_mutations = rng.randint(1, 3)
        test_boosts = copy.copy(current_boosts)
        for _ in range(num_mutations):
            target = rng.choice(patient_ids)
            test_boosts[target] += rng.uniform(-100.0, 100.0)
            
        _, new_risk = simulate(patients_data, test_boosts, a, b, c, twist_active)
        
        if new_risk < current_risk:
            current_risk = new_risk
            current_boosts = test_boosts
            if new_risk < best_risk:
                best_risk = new_risk
                best_boosts = copy.copy(test_boosts)
        else:
            delta = new_risk - current_risk
            # Thermodynamic probability
            if rng.random() < math.exp(-delta / max(temp, 0.0001)):
                current_risk = new_risk
                current_boosts = test_boosts
                
        temp *= cooling_rate
        if temp < 0.1:
            temp = 100.0 # Reheat

    final_treatments, final_risk = simulate(patients_data, best_boosts, a, b, c, twist_active)
    strategy_name = f"Parallel_SA_Core_{worker_id} (α:{a} β:{b})"
    return final_risk, final_treatments, strategy_name

# ---------------------------------------------------------------------------
# Multi-Core Orchestrator
# ---------------------------------------------------------------------------

def run_parallel_optimizer(patients_data: list[dict], twist_active: bool) -> tuple[list[dict], int, str]:
    patients_data.sort(key=lambda x: (x["arrival_time"], x["patient_id"]))
    
    # Detect CPU cores to maximize hardware utilization
    num_cores = min(os.cpu_count() or 4, 16) 
    iterations_per_core = 3000 # 8 cores = 24,000 parallel iterations
    
    best_global_risk = float('inf')
    best_global_treatments = []
    best_strategy = ""

    with concurrent.futures.ProcessPoolExecutor(max_workers=num_cores) as executor:
        futures = [
            executor.submit(worker_task, i, patients_data, twist_active, iterations_per_core)
            for i in range(num_cores)
        ]
        
        for future in concurrent.futures.as_completed(futures):
            risk, treatments, strategy = future.result()
            if risk < best_global_risk:
                best_global_risk = risk
                best_global_treatments = treatments
                best_strategy = strategy

    return best_global_treatments, best_global_risk, best_strategy

# ---------------------------------------------------------------------------
# API Hook
# ---------------------------------------------------------------------------

def run_simulation(
    input_csv: str,
    output_json: str = "submission.json",
    twist_active: bool = False,
) -> dict[str, Any]:
    
    t0 = time.perf_counter()

    patients_data = []
    with open(input_csv, newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            patients_data.append({
                "patient_id": row["patient_id"],
                "severity": int(row["severity"]),
                "arrival_time": int(row["arrival_time"]),
                "treatment_time": int(row["treatment_time"]),
                "required_specialization": row["required_specialization"],
            })

    treatments, total_risk, strategy = run_parallel_optimizer(patients_data, twist_active)
    
    elapsed = time.perf_counter() - t0

    submission = {
        "treatments": treatments,
        "estimated_total_risk": total_risk,
        "winning_strategy": strategy
    }
    with open(output_json, "w") as f:
        json.dump(submission, f, indent=2)

    result = {
        "treatments": treatments,
        "estimated_total_risk": total_risk,
        "total_sim_time": elapsed,
        "winning_strategy": strategy,
    }

    print(f"✅ N={len(patients_data)} | Risk={total_risk} | Time={elapsed:.3f}s | {strategy}")
    return result

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", nargs="?", help="Path to patients CSV file")
    parser.add_argument("--twist", default="false")
    args = parser.parse_args()
    if args.input_csv:
        run_simulation(args.input_csv, twist_active=(args.twist.lower() == 'true'))