from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate

import os

# ---------------------------
# Groq model (static)
# ---------------------------
# Ensure GROQ_API_KEY is set in your environment
api_key = os.environ.get("GROQ_API_KEY")
if not api_key:
    # Fallback/Warning (or raise error if strict)
    print("WARNING: GROQ_API_KEY not found in environment variables.")

ollama_model = ChatGroq(
    model="llama-3.1-8b-instant",
    temperature=0.2,
    api_key=api_key
)

# ---------------------------
# Optional: local static context (NO web search)
# Keep it short + generic (not prescribing exact antibiotics/doses).
# ---------------------------
STATIC_MEDICAL_CONTEXT = """
This app is an AI screening tool for pneumonia on chest X-ray images.
General patient guidance (non-prescriptive):
- Pneumonia can be caused by bacteria/viruses; symptoms include cough, fever, breathlessness, chest pain, fatigue.
- Home care often includes rest, fluids, fever control medicines as advised, and monitoring breathing.
- Seek urgent care if breathing difficulty, low oxygen, chest pain, confusion, bluish lips, dehydration, or worsening symptoms.
- Antibiotics are only used when a clinician suspects/diagnoses bacterial pneumonia. Do not self-start antibiotics.
- Follow-up is important if symptoms don’t improve within 24–48 hours or worsen.
"""

def generate_care_report(diagnosis_output: str, patient_info: dict | None = None) -> str:
    """
    Generates a patient guidance report using Groq (ChatGroq) only.
    No Google search / no external retrieval.
    """
    patient_info = patient_info or {}
    location = patient_info.get("location", "") or "Not provided"
    age = patient_info.get("age", "") or "Not provided"
    severity = patient_info.get("severity", "") or "Not provided"
    symptoms = patient_info.get("symptoms", "") or "Not provided"

    prompt = ChatPromptTemplate.from_messages([
        ("system",
         "You are a careful healthcare assistant. "
         "You must not provide exact prescription antibiotics/doses. "
         "Give safe, general guidance and clear red-flag escalation steps. "
         "Write in English only. Use headings + bullet points."),
        ("human", """
Context (local, no web search):
{static_context}

Diagnosis output: {diagnosis_output}

Patient info:
- Location: {location}
- Age: {age}
- Symptoms: {symptoms}
- Severity (if available): {severity}

Instructions:
- If diagnosis is "pneumonia":
  - Explain what it means in patient-friendly language.
  - Provide immediate next steps and when to go to hospital.
  - Provide supportive home care guidance (non-prescriptive).
  - Provide a daily symptom tracker checklist for 5–7 days.
  - Add follow-up plan (when to re-check, what to monitor).
- If diagnosis is "normal":
  - Reassure the user.
  - List possible reasons symptoms may still exist (general).
  - Provide prevention tips and when to seek care anyway.
  - Provide a simple symptom tracker for a few days.

Output must be a complete patient report ready to display in the app UI.
""")
    ])

    messages = prompt.format_messages(
        static_context=STATIC_MEDICAL_CONTEXT.strip(),
        diagnosis_output=diagnosis_output.strip(),
        location=location,
        age=age,
        symptoms=symptoms,
        severity=severity,
    )

    # ChatGroq supports invoke(messages) style in LangChain. [web:39][web:40]
    response = ollama_model.invoke(messages)
    return response.content


# Example quick test
if __name__ == "__main__":
    print(generate_care_report(
        "pneumonia",
        {"location": "Vatluru, Andhra Pradesh", "age": "22", "symptoms": "cough and fever", "severity": "moderate"}
    ))
