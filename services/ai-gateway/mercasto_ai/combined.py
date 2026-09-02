from .main import app
from .risk import router as risk_router

app.include_router(risk_router)
