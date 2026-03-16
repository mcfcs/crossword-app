import requests
import pandas as pd
import re
from bs4 import BeautifulSoup
from pathlib import Path

url = "https://noypi.com.ph/bugtong/"
html = requests.get(url, headers={"User-Agent": "Mozilla/5.0"}).text
soup = BeautifulSoup(html, "html.parser")

rows = []

for p in soup.select("p"):
    strong = p.find("strong")
    if not strong:
        continue

    if "sagot" not in strong.get_text(strip=True).casefold():
        continue

    # --------------------
    # Extract Bugtong (Clue)
    # --------------------
    full_text = p.get_text("\n", strip=True)

    if "Sagot:" not in full_text:
        continue

    bugtong, sagot = full_text.split("Sagot:", 1)

    # Clean numbering like "1. "
    bugtong = re.sub(r"^\d+\.\s*", "", bugtong.strip())

    # Clean sagot
    sagot = sagot.strip()

    # Only keep valid pairs
    if bugtong and sagot:
        rows.append({
            "Word": sagot,
            "Clue": bugtong
        })

# --------------------
# Create DataFrame
# --------------------
df = pd.DataFrame(rows)

df["Word"] = df["Word"].astype(str).str.strip().str.upper()


print(df.head())
print("Total rows:", len(df))

out_path = Path(__file__).parent / "tagalog_bugtong.csv"
df.to_csv(out_path, index=False)

