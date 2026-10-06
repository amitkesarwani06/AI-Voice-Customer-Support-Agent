import json
import os

def load_orders():
    base_dir = os.path.dirname(__file__)
    orders_path = os.path.join(base_dir, 'orders.json')
    try:
        with open(orders_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        return []

def get_order_details(order_id: str) -> dict:
    """
    Look up order information from the mock database by order ID.
    Returns order details or a "not found" response.
    """
    orders = load_orders()
    
    # Normalize order_id: remove spaces, uppercase, ensure hyphen
    # Speech-to-text often drops hyphens: "ord 101" -> "ORD-101"
    clean_id = order_id.upper().replace(" ", "").replace("-", "")
    if clean_id.startswith("ORD") and len(clean_id) > 3:
        clean_id = "ORD-" + clean_id[3:]
        
    for order in orders:
        if order.get("order_id") == clean_id:
            return {"found": True, "order": order}
            
    return {
        "found": False,
        "message": f"Order {order_id} not found. Please ask the customer to verify the order ID."
    }

# Map function names to actual python callables
available_functions = {
    "get_order_details": get_order_details
}
