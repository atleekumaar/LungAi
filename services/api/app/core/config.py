"""
LungAI Core Configuration and Settings
"""
from typing import List, Tuple
from pydantic_settings import BaseSettings
from pydantic import Field
import os

class Settings(BaseSettings):
    api_title: str = "LungAI Medical Imaging & CT Research API"
    api_version: str = "0.1.0"
    api_description: str = (
        "Research-oriented pulmonary CT imaging workstation and candidate analysis API."
    )
    environment: str = Field(default="development", alias="LUNGAI_ENVIRONMENT")
    host: str = Field(default="0.0.0.0", alias="LUNGAI_API_HOST")
    port: int = Field(default=8000, alias="LUNGAI_API_PORT")
    cors_origins: List[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"],
        alias="LUNGAI_CORS_ORIGINS",
    )

    # Dataset Directories (configurable, defaults relative to repository root)
    data_dir: str = Field(default="./data", alias="LUNGAI_DATA_DIR")
    raw_dir: str = Field(default="./data/raw", alias="LUNGAI_RAW_DIR")
    processed_dir: str = Field(default="./data/processed", alias="LUNGAI_PROCESSED_DIR")
    annotations_csv: str = Field(
        default="./data/raw/annotations.csv", alias="LUNGAI_ANNOTATIONS_CSV"
    )
    candidates_csv: str = Field(
        default="./data/raw/candidates.csv", alias="LUNGAI_CANDIDATES_CSV"
    )

    # Imaging Window Defaults (Lung Window: standard Center -600, Width 1500)
    window_center: float = Field(default=-600.0, alias="LUNGAI_WINDOW_CENTER")
    window_width: float = Field(default=1500.0, alias="LUNGAI_WINDOW_WIDTH")

    # Candidate Patch Extraction Defaults (in voxels, e.g. 32x32x32 or 48x48x48)
    patch_size: Tuple[int, int, int] = Field(
        default=(32, 32, 32), alias="LUNGAI_PATCH_SIZE"
    )
    target_spacing: Tuple[float, float, float] = Field(
        default=(1.0, 1.0, 1.0), alias="LUNGAI_TARGET_SPACING"
    )

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
