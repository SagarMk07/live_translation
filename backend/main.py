from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from websocket import router as websocket_router
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Multilingual Translator")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(websocket_router)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
