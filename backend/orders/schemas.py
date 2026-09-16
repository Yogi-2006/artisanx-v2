from pydantic import BaseModel
from typing import Optional
from uuid import UUID
from datetime import datetime

class OrderStatusUpdate(BaseModel):
    status: str
    note: Optional[str] = None

class CancelOrderRequest(BaseModel):
    reason: str
    notes: Optional[str] = None

class DirectOrderCreate(BaseModel):
    product_id: UUID
    quantity: int
    notes: Optional[str] = None

