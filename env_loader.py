from dotenv import dotenv_values

def get_variables():
    # Načte .env soubor ze stejné složky a vrátí ho jako slovník pro Robot Framework
    return dotenv_values(".env")