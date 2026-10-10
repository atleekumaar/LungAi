"""
LungAI FastAPI Application Entrypoint.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import logging

from services.api.app.core.config import settings
from services.api.app.api.routes import router as imaging_router
from services.api.app.schemas.imaging import HealthResponse
from services.api.app.services.volume_service import volume_service

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("lungai")

app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description=settings.api_description,
    docs_url="/docs",
    redoc_url="/redoc"
)

# Setup CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(imaging_router, prefix="/api")

@app.get("/health", response_model=HealthResponse, tags=["System"])
def health_check():
    """System health check and runtime verification."""
    scans = volume_service.get_scan_list()
    return HealthResponse(
        status="ok",
        version=settings.api_version,
        environment=settings.environment,
        imaging_backend="SimpleITK",
        available_scans_count=len(scans),
        message="LungAI Medical Imaging API running"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("services.api.app.main:app", host=settings.host, port=settings.port, reload=True)
