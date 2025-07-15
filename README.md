# IIP-Dashboard
Project done during my internship at IndiaAI, a MeitY initiative.

# 📊 IIP Dashboard – Trend Forecasting & Multilingual Summarization

The **IIP Dashboard** is a modular pipeline built to process and analyze India's *Index of Industrial Production (IIP)* data. It integrates time-series forecasting and LLM-based summarization to generate interpretable, multilingual insights across industrial sectors — empowering economic planning, policy analysis, and automated reporting.

---

## 🔍 What This Project Does

- 📈 **Forecasts upcoming IIP values** using robust time-series modeling.
- 🧠 **Generates natural language summaries** explaining sector-wise trends (YoY, MoM, etc.).
- 🌐 **Supports multilingual summaries**, tailored for diverse Indian audiences.
- 💻 **Frontend dashboard** renders interactive graphs and structured summaries dynamically.

---

## 🛠️ Tech Stack

| Component         | Tool / Model Used                                              | Purpose                                        |
|------------------|-----------------------------------------------------------------|------------------------------------------------|
| 📅 Forecasting    | **[Facebook Prophet](https://facebook.github.io/prophet/)**     | Time-series forecasting of IIP indices         |
| 📝 Summarization  | **LLaMA 3.2 (fine-tuned)**                                      | Category-wise trend explanation generation     |
| 📊 Visualization  | **Frontend JavaScript (custom plotting logic)**                | Interactive graph rendering                    |
| 📦 Data Handling  | **Pandas**, **NumPy**, **JSON**                                 | Data cleaning, structuring, and transformation |
| 🔁 Pipeline Logic | Modular Python scripts for chunking, prompting, and inference  | Enables scalable forecasting & summarization   |

---

## 💡 Planned Additions

| Status | Feature                                                                 |
|--------|-------------------------------------------------------------------------|
| ✅     | Expand multilingual summaries (12+ Indian languages)                    |
| 🧪     | Add benchmarking across forecasting models                              |
| 🌐     | Optional Streamlit/Dash backend variant for offline use                 |
| ⏱️     | CRON-based automation for monthly IIP updates                           |
| 📚     | Add interpretability tools for summaries and forecast confidence        |

---

## ⚡ Sample Use Cases

- 📉 **Analysts & Economists**: Extract clean insights from noisy industrial data.
- 🗞️ **Media Outlets**: Auto-generate narrative summaries for industry stories.
- 🏛️ **Government Planners**: Use forecasts for supply-demand assessments.

---
