"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api/client";
import { Product } from "@/types";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ProductsPage() {
  const router = useRouter();
  const [isOrdering, setIsOrdering] = useState<string | null>(null);

  const { data: products, isLoading } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true" || true) {
        return [
          { id: "p1", name: "Laptop Pro X", description: "High performance laptop", price: 1200, stock: 10 },
          { id: "p2", name: "Wireless Mouse", description: "Ergonomic wireless mouse", price: 45, stock: 50 },
          { id: "p3", name: "Mechanical Keyboard", description: "RGB mechanical keyboard", price: 150, stock: 20 },
        ];
      }
      const res = await api.get("/products");
      return res.data;
    },
  });

  const handleOrder = async (product: Product) => {
    setIsOrdering(product.id);
    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true" || true) {
        // Mock order creation
        setTimeout(() => {
          router.push(`/orders/mock-order-${product.id}`);
        }, 500);
        return;
      }
      
      const res = await api.post("/orders", {
        items: [{ productId: product.id, quantity: 1, price: product.price }]
      });
      router.push(`/orders/${res.data.id}`);
    } catch (error) {
      console.error("Order failed", error);
      setIsOrdering(null);
    }
  };

  if (isLoading) return <div className="text-text-muted">Loading products...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="heading text-2xl font-bold">Catalog</h1>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {products?.map((product) => (
          <div key={product.id} className="bg-panel border border-border rounded-md p-5 flex flex-col">
            <h3 className="heading text-lg font-bold">{product.name}</h3>
            <p className="text-text-muted text-sm mt-1 flex-1">{product.description}</p>
            
            <div className="mt-4 flex items-center justify-between">
              <span className="tech-data text-success font-bold">${product.price}</span>
              <span className="text-xs text-text-muted">Stock: {product.stock}</span>
            </div>
            
            <button
              onClick={() => handleOrder(product)}
              disabled={isOrdering === product.id || product.stock === 0}
              className="mt-4 w-full bg-interactive text-white py-2 rounded-md font-medium hover:bg-interactive/90 disabled:opacity-50 transition-colors"
            >
              {isOrdering === product.id ? "Ordering..." : "Order Now"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
