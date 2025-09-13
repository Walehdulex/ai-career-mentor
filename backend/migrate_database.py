from sqlalchemy import create_engine, text
import os

DATABASE_URL = "sqlite:///./career_mentor.db"
engine = create_engine(DATABASE_URL)

def migrate_database():
    """Add missing columns to existing tables"""
    
    with engine.connect() as conn:
        try:
            # Check if columns exist before adding them
            
            # Add user_id to chat_sessions if it doesn't exist
            try:
                conn.execute(text("ALTER TABLE chat_sessions ADD COLUMN user_id INTEGER"))
                print("✅ Added user_id column to chat_sessions")
            except Exception as e:
                if "duplicate column name" in str(e) or "already exists" in str(e):
                    print("ℹ️  user_id column already exists in chat_sessions")
                else:
                    print(f"❌ Error adding user_id to chat_sessions: {e}")
            
            # Add user_id to resume_analyses if it doesn't exist
            try:
                conn.execute(text("ALTER TABLE resume_analyses ADD COLUMN user_id INTEGER"))
                print("✅ Added user_id column to resume_analyses")
            except Exception as e:
                if "duplicate column name" in str(e) or "already exists" in str(e):
                    print("ℹ️  user_id column already exists in resume_analyses")
                else:
                    print(f"❌ Error adding user_id to resume_analyses: {e}")
            
            # Add missing columns to resume_analyses
            missing_columns = [
                ("linkedin", "TEXT"),
                ("github", "TEXT"), 
                ("portfolio", "TEXT"),
                ("education_data", "TEXT"),
                ("experience_data", "TEXT"),
                ("certifications_data", "TEXT"),
                ("resume_score", "REAL"),
                ("optimization_suggestions", "TEXT")
            ]
            
            for column, data_type in missing_columns:
                try:
                    conn.execute(text(f"ALTER TABLE resume_analyses ADD COLUMN {column} {data_type}"))
                    print(f"✅ Added {column} column to resume_analyses")
                except Exception as e:
                    if "duplicate column name" in str(e) or "already exists" in str(e):
                        print(f"ℹ️  {column} column already exists in resume_analyses")
                    else:
                        print(f"❌ Error adding {column} to resume_analyses: {e}")
            
            conn.commit()
            print("\n🎉 Database migration completed!")
            
        except Exception as e:
            print(f"❌ Migration failed: {e}")
            conn.rollback()

if __name__ == "__main__":
    migrate_database()