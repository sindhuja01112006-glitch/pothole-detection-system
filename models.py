from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from database import Base

class Report(Base):
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    severity_level = Column(String, default="Unknown")
    image_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
