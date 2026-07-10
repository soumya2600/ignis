import torch
import torch.nn as nn
import torch.nn.functional as F

class FireRiskPredictor(nn.Module):
    """
    Feed-forward neural network for predicting forest fire risk
    based on 11 input environmental and historical features.
    
    Inputs: Temperature, Humidity, Wind Speed, Rainfall, Pressure,
    Cloud Cover, NDVI, Elevation, Forest Density, Historical Fire Frequency, Satellite Features
    """
    def __init__(self, input_size=11):
        super(FireRiskPredictor, self).__init__()
        self.fc1 = nn.Linear(input_size, 64)
        self.bn1 = nn.BatchNorm1d(64)
        self.fc2 = nn.Linear(64, 32)
        self.bn2 = nn.BatchNorm1d(32)
        self.fc3 = nn.Linear(32, 16)
        
        # Output branches for Multi-Task Learning
        self.risk_score = nn.Linear(16, 1) # 0-100 score
        self.confidence = nn.Linear(16, 1) # 0-100 confidence
        self.probability = nn.Linear(16, 1) # 0-1 probability
        self.spread_rate = nn.Linear(16, 1) # expected fire spread

    def forward(self, x):
        x = F.relu(self.bn1(self.fc1(x)))
        x = F.dropout(x, p=0.2, training=self.training)
        x = F.relu(self.bn2(self.fc2(x)))
        x = F.dropout(x, p=0.2, training=self.training)
        x = F.relu(self.fc3(x))
        
        # Apply sigmoid to clamp outputs between 0 and 1, then scale
        risk = torch.sigmoid(self.risk_score(x)) * 100.0
        conf = torch.sigmoid(self.confidence(x)) * 100.0
        prob = torch.sigmoid(self.probability(x))
        spread = F.relu(self.spread_rate(x))
        
        return risk, conf, prob, spread

def run_dl_inference(features_list: list):
    """
    Helper function to run inference.
    """
    # In production, we'd load: model.load_state_dict(torch.load('weights.pth'))
    model = FireRiskPredictor(input_size=11)
    model.eval()
    
    with torch.no_grad():
        tensor = torch.tensor([features_list], dtype=torch.float32)
        risk, conf, prob, spread = model(tensor)
        
        risk_val = risk.item()
        
        # Realistic noise for the un-trained placeholder weights
        # to ensure the app functions realistically before actual training
        risk_val = min(99.0, max(5.0, risk_val))
        
        return {
            "risk_score": risk_val,
            "confidence": conf.item(),
            "probability": prob.item(),
            "expected_spread": spread.item(),
            "risk_level": "CRITICAL" if risk_val > 80 else ("HIGH" if risk_val > 60 else "LOW")
        }
