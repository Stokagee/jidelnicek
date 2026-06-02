import os
from dotenv import dotenv_values

def get_variables():
    # 1. Zjistí absolutní cestu ke složce, kde leží tento env_loader.py
    current_dir = os.path.dirname(os.path.abspath(__file__))
    
    # 2. Spojí ji s názvem souboru .env (předpokládá, že .env je ve stejné složce)
    env_path = os.path.join(current_dir, ".env")
    
    # 3. Načte hodnoty ze správné absolutní cesty
    return dotenv_values(env_path)