"""
SmartTriage Engine — Dynamic Hybrid Router
================================================================
Intelligently routes datasets to the optimal metaheuristic engine based on N-size.
"""

import csv
import time
from typing import Any

# Import your two specialized engines
from engine_montecarlo import run_simulation as run_monte_carlo
from engine_annealing import run_simulation as run_simulated_annealing

def run_simulation(
    input_csv: str,
    output_json: str = "submission.json",
    twist_active: bool = False,
) -> dict[str, Any]:
    
    t0 = time.perf_counter()

    # 1. Peek at the dataset to count patients and detect topology
    n_patients = 0
    with open(input_csv, newline="") as f:
        reader = csv.DictReader(f)
        n_patients = sum(1 for row in reader)

    # 2. Dynamic Algorithmic Routing
    # Based on the Hackathon Rubric:
    # N <= 100 (Basic/Congested) -> Route to Monte Carlo
    # N > 100 (Stress) -> Route to Parallel Simulated Annealing
    
    if n_patients <= 100:
        print(f"Dataset Topology: BASIC/CONGESTED (N={n_patients})")
        print("Routing to Monte Carlo Heuristic Engine...")
        result = run_monte_carlo(input_csv, output_json, twist_active)
        
    else:
        print(f"Dataset Topology: STRESS (N={n_patients})")
        print("Routing to Multi-Core Simulated Annealing Optimizer...")
        result = run_simulated_annealing(input_csv, output_json, twist_active)

    # Calculate total time including the routing overhead
    elapsed = time.perf_counter() - t0
    result["total_sim_time"] = elapsed
    
    print(f"✅ Route Complete | Total Engine Time: {elapsed:.3f}s")
    
    return result

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("input_csv", nargs="?", help="Path to patients CSV file")
    parser.add_argument("--twist", default="false")
    args = parser.parse_args()
    
    if args.input_csv:
        run_simulation(args.input_csv, twist_active=(args.twist.lower() == 'true'))