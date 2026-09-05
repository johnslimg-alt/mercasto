from .autofill import prewarm_autofill_model
from .autofill import router as autofill_router
from .autofill_boundary import AutofillRequestBoundaryMiddleware
from .main import app
from .risk_api import router as risk_router
from .risk_boundary import RiskRequestBoundaryMiddleware

app.add_middleware(RiskRequestBoundaryMiddleware)
app.add_middleware(AutofillRequestBoundaryMiddleware)
app.include_router(risk_router)
app.include_router(autofill_router)


async def prewarm_listing_autofill() -> None:
    await prewarm_autofill_model()


app.router.add_event_handler("startup", prewarm_listing_autofill)
