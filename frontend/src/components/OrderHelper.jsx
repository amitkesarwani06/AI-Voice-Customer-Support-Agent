const sampleOrders = [
  {
    id: 'ORD-101',
    status: 'Out for Delivery',
    detail: 'Expected by 6 PM today',
    color: '#f59e0b',
  },
  {
    id: 'ORD-102',
    status: 'Delivered',
    detail: 'Delivered 14 days ago',
    color: '#22c55e',
  },
  {
    id: 'ORD-103',
    status: 'Processing',
    detail: 'Cancellation eligible',
    color: '#6366f1',
  },
];

export default function OrderHelper() {
  return (
    <div className="order-helper">
      <h3 className="section-title">📦 Test Orders</h3>
      <p className="helper-hint">Try asking Aria about these orders:</p>
      <div className="order-cards">
        {sampleOrders.map((order) => (
          <div key={order.id} className="order-card">
            <div className="order-id">{order.id}</div>
            <div className="order-status" style={{ color: order.color }}>
              {order.status}
            </div>
            <div className="order-detail">{order.detail}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
