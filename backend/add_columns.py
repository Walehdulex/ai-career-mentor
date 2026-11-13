import sqlite3

DB_FILE = "career_mentor.db"  # change this to your actual filename

con = sqlite3.connect(DB_FILE)
cur = con.cursor()

existing = [row[1] for row in cur.execute("PRAGMA table_info(user_profiles)")]
print("Existing columns:", existing)

for name, col_type in [("years_of_experience", "INTEGER"), ("career_goals", "TEXT")]:
    if name not in existing:
        cur.execute(f"ALTER TABLE user_profiles ADD COLUMN {name} {col_type}")
        print("Added", name)
    else:
        print(name, "already exists, skipping")

con.commit()
con.close()