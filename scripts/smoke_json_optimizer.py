import json
import os
import sys
# Ensure project root (parent of scripts/) is on sys.path for 'modules' imports
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))

from modules.json_optimizer import JsonOptimizer

def print_case(title, ai_data, mtb_data):
    opt = JsonOptimizer(input_file="MasterTrackingBoard.csv")
    out = opt.optimize_job(ai_data, mtb_data, job_id=mtb_data.get("JobID", "TEST"))
    subset = {
        "job_id": out.get("job_id"),
        "company": out.get("company"),
        "job_title": out.get("job_title"),
        "work_eligibility_location": out.get("work_eligibility_location"),
        "salary": out.get("salary"),
        "bonus_percent_min": out.get("bonus_percent_min"),
        "bonus_percent_max": out.get("bonus_percent_max"),
        "conditional_fee_min": out.get("conditional_fee_min"),
        "conditional_fee_max": out.get("conditional_fee_max"),
        "received_date": out.get("received_date"),
        "validation": out.get("validation"),
        "source_file": out.get("source_file"),
    }
    print(f"\n=== {title} ===")
    print(json.dumps(subset, indent=2, ensure_ascii=False))

def main():
    # Base AI data stub
    ai_stub = {
        "job_title": "Process Engineer",
        "company": "ACME Cement",
        "work_eligibility_location": {}
    }

    # 1) Annual range with DOE and K suffix
    mtb_1 = {
        "JobID": "8300",
        "Company": "ACME Cement",
        "Position": "Reliability Engineer",
        "Industry/Segment": "Cement",
        "City": "Tulsa",
        "State": "OK",
        "Country": "USA",
        "Salary": "65-110K DOE",
        "Bonus": "",
        "Conditional Fee": "",
        "Received (m/d/y)": "8/29/25 0:00"
    }
    print_case("Annual range with DOE and K", ai_stub, mtb_1)

    # 2) Hourly range with /hr
    mtb_2 = {
        "JobID": "8405",
        "Company": "ACME Cement",
        "Position": "Maintenance Tech",
        "Industry/Segment": "Aggregates",
        "City": "Denver",
        "State": "CO",
        "Country": "USA",
        "Salary": "$41-42/hr",
        "Bonus": "",
        "Conditional Fee": "25%%",
        "Received (m/d/y)": "8/29/2025 0:00"
    }
    print_case("Hourly range with /hr and conditional fee 25%%", ai_stub, mtb_2)

    # 3) Annual single with plus and DOE
    mtb_3 = {
        "JobID": "7430",
        "Company": "ACME Cement",
        "Position": "Production Supervisor",
        "Industry/Segment": "Cement",
        "City": "Austin",
        "State": "TX",
        "Country": "USA",
        "Salary": "100K+ DOE",
        "Bonus": "12–20%",
        "Conditional Fee": "",
        "Received (m/d/y)": "8/28/25 0:00"
    }
    print_case("Annual single 100K+ DOE with bonus 12–20%", ai_stub, mtb_3)

    # 4) Hourly range with p/hr variant
    mtb_4 = {
        "JobID": "7785",
        "Company": "ACME Cement",
        "Position": "Electrician",
        "Industry/Segment": "RMX",
        "City": "Phoenix",
        "State": "AZ",
        "Country": "USA",
        "Salary": "$33-35 p/hr",
        "Bonus": "0.25",
        "Conditional Fee": "",
        "Received (m/d/y)": "8/27/25 0:00"
    }
    print_case("Hourly range with p/hr and bonus 0.25", ai_stub, mtb_4)

    # 5) International currency (Euros)
    mtb_5 = {
        "JobID": "8360",
        "Company": "ACME Cement",
        "Position": "Plant Manager",
        "Industry/Segment": "Cement",
        "City": "Roanoke",
        "State": "VA",
        "Country": "USA",
        "Salary": "100K Euros",
        "Bonus": "",
        "Conditional Fee": "1–4%",
        "Received (m/d/y)": "8/26/25 0:00"
    }
    print_case("Annual salary specified in Euros in US location", ai_stub, mtb_5)

    # 6) USD annual range with plus
    mtb_6 = {
        "JobID": "9001",
        "Company": "ACME Cement",
        "Position": "Project Engineer",
        "Industry/Segment": "Cement",
        "City": "Nashville",
        "State": "TN",
        "Country": "USA",
        "Salary": "$160-190k +",
        "Bonus": "",
        "Conditional Fee": "",
        "Received (m/d/y)": "8/25/25 0:00"
    }
    print_case("USD annual range with trailing plus", ai_stub, mtb_6)

    # 7) Euro range with Unicode en-dash and K
    mtb_7 = {
        "JobID": "9002",
        "Company": "Global Cement",
        "Position": "Process Engineer",
        "Industry/Segment": "Cement",
        "City": "Dublin",
        "State": "",
        "Country": "Ireland",
        "Salary": "€90–110k",
        "Bonus": "",
        "Conditional Fee": "",
        "Received (m/d/y)": "8/20/2025 0:00"
    }
    print_case("EUR range with en-dash and K", ai_stub, mtb_7)

    # 8) Location placeholder with region hint
    mtb_8 = {
        "JobID": "9100",
        "Company": "ACME Aggregates",
        "Position": "Regional Manager",
        "Industry/Segment": "Aggregates",
        "City": "Open (NE)",
        "State": "",
        "Country": "USA",
        "Salary": "DOE",
        "Bonus": "",
        "Conditional Fee": "",
        "Received (m/d/y)": "8/19/25 0:00"
    }
    print_case("Location placeholder 'Open (NE)'", ai_stub, mtb_8)

if __name__ == "__main__":
    main()