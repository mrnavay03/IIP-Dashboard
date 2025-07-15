import pandas as pd
from prophet import Prophet
import json
from tqdm import tqdm
import requests
import os
import re
import sys
import time # This import is necessary for the fix

# --- CONFIGURATION ---
# Make sure your new, valid API key is pasted here.
TOGETHER_API_KEY = "tgp_v1_B122tIqF6FxvILe_yKaK0royFcoKMF8LUTczzjrox7w" 

INPUT_CSV_FILE = 'IIP monthly data.csv'
OUTPUT_JSON_FILE = 'iip_data.json'
FORECAST_PERIODS = 4
HISTORICAL_CUTOFF_DATE = '2024-12-31'

def get_sector_data(df, sector_name):
    """Robustly filters data for a specific sector."""
    if sector_name == 'General':
        return df[df['Type'] == 'General'].copy()
    else:
        return df[(df['Category'] == sector_name) & (df['SubCategory'] == '*')].copy()

def query_llama3_summary(prompt):
    """Queries the Llama 3 model via Together.ai for a summary."""
    if not TOGETHER_API_KEY or "PASTE_YOUR_NEW" in TOGETHER_API_KEY:
        print("\n❌ API Key is missing! Please paste your new key into the run_analysis.py script.")
        return None

    url = "https://api.together.ai/v1/chat/completions"
    headers = {
        "Authorization": f"Bearer {TOGETHER_API_KEY}",
        "Content-Type": "application/json"
    }
    payload = {
        "model": "meta-llama/Llama-3-8b-chat-hf",
        "messages": [
            {"role": "system", "content": "You are an expert economic analyst. Summarize the provided data concisely and professionally in 2-3 sentences."},
            {"role": "user", "content": prompt}
        ],
        "max_tokens": 150,
        "temperature": 0.7,
        "top_p": 0.7,
    }
    try:
        response = requests.post(url, headers=headers, json=payload, timeout=45)
        response.raise_for_status()
        return response.json()["choices"][0]["message"]["content"].strip()
    except requests.exceptions.HTTPError as e:
        print(f"\n❌ API HTTP Error: {e}")
        print(f"   Response Body: {e.response.text}")
        print("   This might be due to an invalid API key or a problem with the service.")
        return None
    except requests.exceptions.RequestException as e:
        print(f"\n❌ API Request Error: {e}")
        return None

def build_summary_prompt(category, latest_data, predicted_data, accuracy_info):
    """Builds a detailed prompt for the Llama 3 model."""
    pred_text = "\\n".join([f"- {pd.to_datetime(p['date']).strftime('%B %Y')}: Predicted Index {p['index']:.2f}" for p in predicted_data])
    acc_text = "\\n".join([f"- {a['month']}: {a['accuracy']:.1f}%" for a in accuracy_info['details']])

    return f"""
    Analyze the Industrial Production Index for the "{category}" sector.

    Latest known data point:
    - Date: {latest_data['Month']} {latest_data['Year']}
    - Index: {latest_data['Index']:.2f}
    - Growth Rate: {latest_data.get('Growth Rate (%)', 0):.2f}%

    AI Forecast for Jan-Apr 2025:
    {pred_text}

    Forecast Accuracy vs Actual Data (for Jan-Apr 2025):
    {acc_text}
    - Average Accuracy: {accuracy_info['average']:.1f}%

    Based on all the information above, provide a concise, 2-3 sentence professional summary of the sector's recent performance and its predicted short-term outlook.
    """

def main():
    print("--- Starting Backend Data Processing & AI Analysis ---")
    try:
        df = pd.read_csv(INPUT_CSV_FILE)
    except FileNotFoundError:
        print(f"❌ FATAL ERROR: '{INPUT_CSV_FILE}' not found. Please ensure it's in the same folder.")
        return

    df['Date'] = pd.to_datetime(df['Month'] + ' ' + df['Year'].astype(str), format='%B %Y', errors='coerce')
    df.dropna(subset=['Date', 'Category', 'SubCategory', 'Index'], inplace=True)
    df['Growth Rate (%)'] = pd.to_numeric(df['Growth Rate (%)'], errors='coerce').fillna(0)
    print("✅ Data loaded and cleaned.")

    all_output_data = {}
    all_sectors = sorted(df['Category'].unique())

    for category in tqdm(all_sectors, desc="📈 Processing Sectors"):
        sector_df = get_sector_data(df, category)
        if sector_df.empty: continue

        historical_data = sector_df[sector_df['Date'] <= HISTORICAL_CUTOFF_DATE]
        if len(historical_data) < 12: continue
        
        prophet_df = historical_data[['Date', 'Index']].rename(columns={'Date': 'ds', 'Index': 'y'})
        model = Prophet(weekly_seasonality=False, daily_seasonality=False, yearly_seasonality=True).fit(prophet_df)
        future = model.make_future_dataframe(periods=FORECAST_PERIODS, freq='MS')
        forecast = model.predict(future)
        
        predicted_data_raw = forecast[forecast['ds'] > prophet_df['ds'].max()].copy()
        actual_future_data = sector_df[sector_df['Date'] > HISTORICAL_CUTOFF_DATE]
        
        accuracy_details = []
        predicted_data = []
        for _, pred_row in predicted_data_raw.iterrows():
            pred_date = pred_row['ds'].to_pydatetime()
            prediction_entry = {"date": pred_date, "index": pred_row["yhat"]}
            predicted_data.append(prediction_entry)
            
            actual_row = actual_future_data[actual_future_data['Date'] == pred_date]
            if not actual_row.empty:
                actual_index = actual_row.iloc[0]['Index']
                accuracy = (1 - abs(actual_index - pred_row['yhat']) / actual_index) * 100
                accuracy_details.append({"month": pred_date.strftime('%B %Y'), "accuracy": accuracy})
        
        avg_accuracy = sum(item['accuracy'] for item in accuracy_details) / len(accuracy_details) if accuracy_details else 0
        accuracy_info = {"average": avg_accuracy, "details": accuracy_details}

        latest_historical_point = historical_data.iloc[-1]
        summary_prompt = build_summary_prompt(category, latest_historical_point, predicted_data, accuracy_info)
        ai_summary = query_llama3_summary(summary_prompt)

        # THE FIX IS HERE: PAUSE AFTER EACH API CALL TO AVOID RATE LIMITS
        time.sleep(1) 

        if ai_summary is None:
            print(f"❌ FATAL ERROR: Could not generate summary for {category}. Stopping script.")
            sys.exit(1)

        all_output_data[category] = {
            "historical": json.loads(historical_data.to_json(orient='records', date_format='iso')),
            "predictions": [{"date": p['date'].isoformat(), "index": p['index']} for p in predicted_data],
            "summary": ai_summary
        }

    with open(OUTPUT_JSON_FILE, "w") as f:
        json.dump(all_output_data, f, indent=4)
        
    print(f"\n✅✅✅ Success! All data processed. Output saved to '{OUTPUT_JSON_FILE}'. ✅✅✅")
    print("You can now open the index.html file with Live Server.")

if __name__ == '__main__':
    main()