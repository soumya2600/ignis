import os
import requests

class NLPService:
    """
    Dedicated NLP engine using Hugging Face models for report generation,
    multilingual support, and the Forest AI Assistant.
    """
    def __init__(self):
        self.hf_token = os.getenv("HF_TOKEN", "")
        self.model_endpoint = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2"
        self.headers = {"Authorization": f"Bearer {self.hf_token}"} if self.hf_token else {}

    def generate_incident_report(self, risk_data: dict, language: str = "English"):
        """
        Generates a structured, natural language incident report based on AI predictions.
        Supports English, Hindi, and Odia.
        """
        prompt = f"""
        Generate a professional forest fire incident report in {language} based on this data:
        Location: {risk_data.get('location', 'Unknown')}
        Risk Score: {risk_data.get('risk_score', 'N/A')}%
        Risk Level: {risk_data.get('risk_level', 'N/A')}
        Key Factors: {', '.join(risk_data.get('reasons', []))}
        
        The report must include:
        1. Current Fire Risk Summary
        2. Weather & Satellite Analysis
        3. Predicted Spread
        4. Emergency Recommendations
        """
        return self._query_hf(prompt)

    def chat_assistant(self, user_query: str, context: str, history: list):
        """
        Conversational assistant maintaining context of the forest environment.
        """
        system_prompt = "You are a professional Forest Fire AI Assistant. Use the context to answer the user."
        full_prompt = f"{system_prompt}\nContext: {context}\nUser: {user_query}\nAnswer:"
        
        # In a full deployment, we would pass `history` to build the chat context string here.
        return self._query_hf(full_prompt)

    def _query_hf(self, prompt: str):
        # Fallback to Pollinations API if HF token is missing for smooth development
        if not self.hf_token:
            try:
                res = requests.post("https://text.pollinations.ai/", json={
                    "messages": [{"role": "user", "content": prompt}]
                }, timeout=10)
                if res.status_code == 200:
                    return res.text.strip()
            except:
                pass
            return "[AI Error] Unable to generate NLP response."
            
        try:
            response = requests.post(
                self.model_endpoint, 
                headers=self.headers, 
                json={"inputs": prompt, "parameters": {"max_new_tokens": 500, "return_full_text": False}}, 
                timeout=15
            )
            if response.status_code == 200:
                return response.json()[0]['generated_text'].strip()
            return f"[API Error]: Status {response.status_code}"
        except Exception as e:
            return f"[Error]: {str(e)}"

nlp_engine = NLPService()
