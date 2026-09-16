from fastapi import APIRouter, Depends, HTTPException
from auth.dependencies import get_current_user, get_token
from database import get_authenticated_client
from .schemas import OrderStatusUpdate, CancelOrderRequest, DirectOrderCreate
from datetime import datetime
from notifications.service import create_notification
import random
import string

router = APIRouter(prefix="/orders", tags=["orders"])

def generate_display_id(prefix: str = "AX-ORD"):
    rand_str = ''.join(random.choices(string.digits, k=5))
    return f"{prefix}-{rand_str}"

VALID_TRANSITIONS = {
    "confirmed": ["in_production", "cancellation_requested", "cancelled"],
    "in_production": ["ready_for_dispatch", "cancellation_requested", "cancelled"],
    "ready_for_dispatch": ["dispatched", "cancelled"],
    "dispatched": ["delivered", "return_requested"],
    "delivered": ["completed", "return_requested"],
    "return_requested": ["returned", "disputed"],
    "cancellation_requested": ["cancelled", "in_production"] # Can reject cancellation
}

@router.post("/direct")
def create_direct_order(req: DirectOrderCreate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    if current_user.get("role") != "buyer":
        raise HTTPException(status_code=403, detail="Only buyers can purchase directly")
        
    product_res = client.table("products").select("*, artisan_id").eq("id", str(req.product_id)).execute()
    if not product_res.data:
        raise HTTPException(status_code=404, detail="Product not found")
        
    product = product_res.data[0]
    
    if product.get("stock_quantity") is not None and product.get("stock_quantity") < req.quantity:
        raise HTTPException(status_code=400, detail="Insufficient stock")
        
    display_id = generate_display_id("AX-ORD")
    
    img_res = client.table("product_images").select("image_url").eq("product_id", str(req.product_id)).order("is_main", desc=True).limit(1).execute()
    img_url = img_res.data[0]["image_url"] if img_res.data else ""
    
    product_snapshot = {
        "product_id": str(req.product_id),
        "title": product.get("title", ""),
        "category": product.get("category", ""),
        "image_url": img_url,
        "variant": None,
        "agreed_unit_price": product["price"],
        "quantity": req.quantity
    }
    
    order_data = {
        "display_id": display_id,
        "quotation_id": None,
        "enquiry_id": None,
        "product_id": str(req.product_id),
        "buyer_id": current_user["id"],
        "artisan_id": product["artisan_id"],
        "status": "confirmed",
        "quantity": req.quantity,
        "unit_price": product["price"],
        "total_order_value": float(product["price"] * req.quantity),
        "customization_details": req.notes,
        "product_snapshot": product_snapshot,
        "expected_dispatch_date": None
    }
    
    ord_res = client.table("orders").insert(order_data).execute()
    if not ord_res.data:
        raise HTTPException(status_code=500, detail="Failed to create order")
        
    order_id = ord_res.data[0]["id"]
    
    hist_data = {
        "order_id": order_id,
        "from_status": None,
        "to_status": "confirmed",
        "changed_by": current_user["id"],
        "note": "Direct purchase"
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    create_notification(
        user_id=product["artisan_id"],
        type="order_confirmed",
        title="New Order!",
        message=f"Buyer placed a direct order for {product.get('title')}. Order {display_id}.",
        metadata={"order_id": order_id}
    )
    
    if product.get("stock_quantity") is not None:
        new_stock = product["stock_quantity"] - req.quantity
        client.table("products").update({"stock_quantity": new_stock}).eq("id", str(req.product_id)).execute()
        
    return {"status": "success", "order_id": order_id}

@router.get("/artisan")
def list_artisan_orders(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    if current_user.get("role") != "artisan":
        raise HTTPException(status_code=403, detail="Forbidden")
    res = client.table("orders").select("*, buyer:users!buyer_id(display_name)").eq("artisan_id", current_user["id"]).order("created_at", desc=True).execute()
    return {"orders": res.data}

@router.get("/buyer")
def list_buyer_orders(current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*, artisan:users!artisan_id(display_name)").eq("buyer_id", current_user["id"]).order("created_at", desc=True).execute()
    return {"orders": res.data}

@router.get("/{id}")
def get_order(id: str, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*, buyer:users!buyer_id(display_name), artisan:users!artisan_id(display_name)").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    if order["buyer_id"] != current_user["id"] and order["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    hist_res = client.table("order_status_history").select("*, changed_by_user:users!changed_by(display_name)").eq("order_id", id).order("created_at", desc=False).execute()
    return {"order": order, "history": hist_res.data}

@router.patch("/{id}/status")
def update_order_status(id: str, req: OrderStatusUpdate, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    is_artisan = (order["artisan_id"] == current_user["id"])
    is_buyer = (order["buyer_id"] == current_user["id"])
    
    if not is_artisan and not is_buyer:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    current_status = order["status"]
    new_status = req.status
    
    if current_status not in VALID_TRANSITIONS or new_status not in VALID_TRANSITIONS[current_status]:
        raise HTTPException(status_code=400, detail=f"Invalid transition from {current_status} to {new_status}")
        
    # Artisan specific transitions
    artisan_only = ["in_production", "ready_for_dispatch", "dispatched"]
    if new_status in artisan_only and not is_artisan:
        raise HTTPException(status_code=403, detail="Only artisan can set this status")
        
    buyer_only = ["completed", "cancellation_requested", "return_requested"]
    if new_status in buyer_only and not is_buyer:
        raise HTTPException(status_code=403, detail="Only buyer can set this status")
        
    # Update order
    update_data = {"status": new_status}
    if new_status == "dispatched":
        update_data["actual_dispatch_date"] = datetime.utcnow().isoformat()
        
    client.table("orders").update(update_data).eq("id", id).execute()
    
    # Insert history
    hist_data = {
        "order_id": id,
        "from_status": current_status,
        "to_status": new_status,
        "changed_by": current_user["id"],
        "note": req.note
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    return {"status": "success", "new_status": new_status}

@router.post("/{id}/cancel")
def request_cancel_order(id: str, req: CancelOrderRequest, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    client = get_authenticated_client(token)
    res = client.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    is_artisan = (order["artisan_id"] == current_user["id"])
    is_buyer = (order["buyer_id"] == current_user["id"])
    
    if not is_artisan and not is_buyer:
        raise HTTPException(status_code=403, detail="Forbidden")
        
    current_status = order["status"]
    
    if current_status in ["cancelled", "completed", "delivered", "dispatched", "return_requested", "returned", "disputed"]:
        raise HTTPException(status_code=400, detail="Order cannot be cancelled at this stage")
        
    # Artisan cancellation is immediate. Buyer cancellation requires review.
    new_status = "cancelled" if is_artisan else "cancellation_requested"
    role = "artisan" if is_artisan else "buyer"
    
    # Insert cancellation record
    cancel_data = {
        "order_id": id,
        "cancelled_by_role": role,
        "cancelled_by_user": current_user["id"],
        "reason": req.reason,
        "notes": req.notes,
        "previous_status": current_status
    }
    client.table("order_cancellations").insert(cancel_data).execute()
    
    # Update order
    client.table("orders").update({"status": new_status}).eq("id", id).execute()
    
    # Insert history
    hist_data = {
        "order_id": id,
        "from_status": current_status,
        "to_status": new_status,
        "changed_by": current_user["id"],
        "note": f"Cancellation reason: {req.reason}"
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    # Notify
    if is_artisan:
        create_notification(
            user_id=order["buyer_id"],
            type="cancellation",
            title="Order Cancelled",
            message=f"Order {order['display_id']} was cancelled by the artisan.",
            metadata={"order_id": id, "reason": req.reason}
        )
    else:
        create_notification(
            user_id=order["artisan_id"],
            type="cancellation_request",
            title="Cancellation Requested",
            message=f"Buyer requested to cancel Order {order['display_id']}.",
            metadata={"order_id": id, "reason": req.reason}
        )
        
    return {"status": "success", "new_status": new_status}

@router.post("/{id}/cancel_decision")
def decision_cancel_order(id: str, decision: dict, current_user: dict = Depends(get_current_user), token: str = Depends(get_token)):
    # decision = {"approved": bool, "note": str}
    client = get_authenticated_client(token)
    res = client.table("orders").select("*").eq("id", id).execute()
    if not res.data:
        raise HTTPException(status_code=404, detail="Order not found")
        
    order = res.data[0]
    if order["artisan_id"] != current_user["id"]:
        raise HTTPException(status_code=403, detail="Only artisan can approve/reject cancellations")
        
    if order["status"] != "cancellation_requested":
        raise HTTPException(status_code=400, detail="Order is not pending cancellation")
        
    # Find previous status from cancellations table
    cancel_res = client.table("order_cancellations").select("*").eq("order_id", id).order("created_at", desc=True).limit(1).execute()
    previous_status = "confirmed"
    if cancel_res.data:
        previous_status = cancel_res.data[0]["previous_status"]
        
    new_status = "cancelled" if decision.get("approved") else previous_status
    
    client.table("orders").update({"status": new_status}).eq("id", id).execute()
    
    hist_data = {
        "order_id": id,
        "from_status": "cancellation_requested",
        "to_status": new_status,
        "changed_by": current_user["id"],
        "note": decision.get("note", "Cancellation approved" if decision.get("approved") else "Cancellation rejected")
    }
    client.table("order_status_history").insert(hist_data).execute()
    
    create_notification(
        user_id=order["buyer_id"],
        type="cancellation" if decision.get("approved") else "cancellation_rejected",
        title="Cancellation Approved" if decision.get("approved") else "Cancellation Rejected",
        message=f"Your cancellation request for Order {order['display_id']} was {'approved' if decision.get('approved') else 'rejected'}.",
        metadata={"order_id": id, "note": decision.get("note", "")}
    )
    
    return {"status": "success", "new_status": new_status}
