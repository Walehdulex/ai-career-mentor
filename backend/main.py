from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import openai
import os
from dotenv import load_dotenv

load_dotenv()


app = FastAPI()

#Enabling CORS for frontend connection
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"], # Next.js defaul port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"]
)

openai.api_key = os.getenv("OPENAI_API_KEY")



class ChatMessage(BaseModel):
    message: str

@app.get("/")
async def root():
    return {"message": "AI Career Mentor API is running"}

@app.post("/api/chat")
async def chat_with_ai(chat_message: ChatMessage):
    try:
        # Tech Career focused prompt
        system_prompt = """You are an AI career mentor specializing in tech careers.
        Help with resume advice, career transitions, skill devopment, interview prep,
        and job search strategies in the tech industry. Be practical and actionable"""

        response = openai.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": chat_message.message}
            ],
            max_tokens=500,
            temperature=0.7
        )
        return {
            "response": response.choices[0].message.content,
            "status": "success"
        }
    except Exception as e:
        return {
            "response": f"Sorry, there was an error: {str(e)}",
            "status": "error"
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
