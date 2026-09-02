from .main import app
from .risk import router as risk_router
from .risk_boundary import RiskRequestBoundaryMiddleware

app.add_middleware(RiskRequestBoundaryMiddleware)
app.include_router(risk_router)
