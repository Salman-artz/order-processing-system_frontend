"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import api from "@/lib/api/client";
import { Product } from "@/types";
import { toast } from "sonner";

/* -------------------------------------------------------------------------- */
/*  Mock products (matching actual inventory-service seed data)                */
/* -------------------------------------------------------------------------- */
const MOCK_PRODUCTS: Product[] = [
  { id: "4120ce5d-ac77-45f1-bd50-c5bc5d2725ad", name: "GPU NVIDIA RTX 4090 24GB",                  price: 28500000, stock: 2,  description: "Flagship graphics card, PCIe 5.0" },
  { id: "13ab7375-c7b2-4e83-8cc0-dfd981ed74d7", name: "Headphone Sony WH-1000XM5",                 price: 4500000,  stock: 20, description: "Noise-cancelling, 30h battery" },
  { id: "79e5bb66-f451-4960-b144-1dc6af9866f1", name: "Laptop ASUS VivoBook 15 Core i5",           price: 8750000,  stock: 25, description: "Intel Core i5-1335U, 16GB RAM" },
  { id: "6e37486f-7ce2-41c1-9046-a8f2d943006f", name: "Mechanical Keyboard Keychron K2 RGB",       price: 1350000,  stock: 40, description: "Wireless, hot-swap, TKL layout" },
  { id: "cf217e3f-1cac-40f1-ae59-166e659c743a", name: "Monitor LG 24\" IPS Full HD",               price: 2850000,  stock: 15, description: "IPS panel, 75Hz, AMD FreeSync" },
  { id: "eb824b0c-dca7-48b9-a72b-3448dd3627a2", name: "SSD External Samsung T7 1TB",               price: 1750000,  stock: 35, description: "USB 3.2 Gen 2, up to 1,050 MB/s" },
  { id: "7edc8875-b3b2-4a04-acf3-5e57e501b431", name: "Standing Desk Ergonomic Motorized 140cm",   price: 5200000,  stock: 5,  description: "Electric height 70-120cm" },
  { id: "aa43c0cd-7b4b-4cc1-b9a8-a9d5673f84f3", name: "USB-C Hub 7-in-1 Anker Premium",           price: 425000,   stock: 60, description: "4K HDMI, 100W PD, SD card" },
  { id: "3bd14f9f-26b3-41c2-bb9a-461a7c4d37c6", name: "Webcam Logitech C920 HD Pro",               price: 1200000,  stock: 30, description: "1080p/30fps, stereo mic" },
  { id: "74662fc9-4e84-42c9-b153-c72db4e6d3f0", name: "Wireless Mouse Logitech MX Master 3",       price: 950000,   stock: 80, description: "MagSpeed scroll, 70-day battery" },
];

/* -------------------------------------------------------------------------- */
/*  Zod schema — full validation for order form                               */
/* -------------------------------------------------------------------------- */
function makeSchema(product: Product | null) {
  const maxQty = product?.stock ?? 1;
  return z.object({
    product_id: z.string().uuid("Please select a product"),
    quantity: z
      .number()
      .int()
      .min(1, "Quantity must be at least 1")
      .max(maxQty, `Only ${maxQty} units in stock`),
  });
}

type FormData = { product_id: string; quantity: number };

/* -------------------------------------------------------------------------- */
/*  Component                                                                   */
/* -------------------------------------------------------------------------- */
export default function ProductsPage() {
  const router = useRouter();

  const { data: products = [], isLoading, isError } = useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") return MOCK_PRODUCTS;
      const res = await api.get("/products");
      // Backend returns { products: [], total: N }
      return res.data.products ?? res.data;
    },
    staleTime: 60_000,
  });

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    defaultValues: { product_id: "", quantity: 1 },
    resolver: zodResolver(makeSchema(null)), // initial — updated via watch below
  });

  const selectedId  = watch("product_id");
  const selectedQty = watch("quantity");
  const selectedProduct = products.find((p) => p.id === selectedId) ?? null;
  const total = (selectedProduct?.price ?? 0) * (selectedQty || 0);

  const onSubmit = async (data: FormData) => {
    // Re-validate with product-specific max qty
    const result = makeSchema(selectedProduct).safeParse(data);
    if (!result.success) {
      result.error.issues.forEach((e: { message: string }) => toast.error(e.message));
      return;
    }

    if (!selectedProduct || selectedProduct.stock === 0) {
      toast.error("Product is out of stock.");
      return;
    }

    try {
      if (process.env.NEXT_PUBLIC_USE_MOCK === "true") {
        toast.success("Order placed!", {
          description: `${selectedProduct.name} × ${data.quantity}`,
        });
        router.push(`/customer/orders/mock-order-${data.product_id.slice(0, 8)}`);
        return;
      }

      const res = await api.post("/orders", {
        items: [
          {
            product_id: data.product_id,
            quantity: data.quantity,
            price: selectedProduct!.price,
          },
        ],
      });
      toast.success("Order placed!", { description: `Order ID: ${res.data.order.id}` });
      router.push(`/customer/orders/${res.data.order.id}`);
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { error?: string } } })?.response?.data?.error ??
        "Failed to place order.";
      toast.error("Order failed", { description: msg });
    }
  };

  /* ---------------------------------------------------------------------- */
  /*  States                                                                  */
  /* ---------------------------------------------------------------------- */
  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 bg-panel rounded w-48" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-44 bg-panel rounded-md border border-border" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-failed/10 border border-failed/30 rounded-md p-6 text-failed">
        Failed to load products. Make sure the backend is running or enable mock mode.
      </div>
    );
  }

  /* ---------------------------------------------------------------------- */
  /*  Render                                                                  */
  /* ---------------------------------------------------------------------- */
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="heading text-2xl font-bold">Product Catalog</h1>
        <span className="tech-data text-xs text-text-muted">
          {products.length} products
        </span>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const isSelected = product.id === selectedId;
          const isOutOfStock = product.stock === 0;

          return (
            <button
              key={product.id}
              type="button"
              disabled={isOutOfStock}
              onClick={() => {
                setValue("product_id", product.id, { shouldValidate: true });
                setValue("quantity", 1, { shouldValidate: true });
              }}
              aria-pressed={isSelected}
              className={[
                "text-left bg-panel border rounded-md p-5 flex flex-col transition-all duration-200",
                "focus:outline-none focus:ring-2 focus:ring-interactive focus:ring-offset-2 focus:ring-offset-background",
                isSelected ? "border-interactive ring-1 ring-interactive" : "border-border hover:border-interactive/50",
                isOutOfStock ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
              ].join(" ")}
            >
              <h3 className="heading text-sm font-bold line-clamp-2 leading-snug">{product.name}</h3>
              <p className="text-text-muted text-xs mt-1.5 flex-1 line-clamp-2">{product.description}</p>

              <div className="mt-4 flex items-end justify-between">
                <span className="tech-data text-success font-bold">
                  Rp {product.price.toLocaleString("id-ID")}
                </span>
                <span
                  className={`tech-data text-[10px] px-2 py-0.5 rounded border ${
                    isOutOfStock
                      ? "text-failed border-failed/30 bg-failed/10"
                      : product.stock <= 5
                      ? "text-pending border-pending/30 bg-pending/10"
                      : "text-success/80 border-success/20 bg-success/5"
                  }`}
                >
                  {isOutOfStock ? "Out of stock" : `${product.stock} in stock`}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Order Form */}
      {selectedProduct && (
        <form
          onSubmit={handleSubmit(onSubmit)}
          className="bg-panel border border-border rounded-md p-6 space-y-5"
        >
          <h2 className="heading text-lg font-bold">Place Order</h2>

          {/* Product summary */}
          <div className="bg-background border border-border rounded-md p-4 space-y-1">
            <p className="font-semibold">{selectedProduct.name}</p>
            <p className="tech-data text-xs text-text-muted">{selectedProduct.id}</p>
            <p className="tech-data text-success text-sm mt-2">
              Rp {selectedProduct.price.toLocaleString("id-ID")} / unit
            </p>
          </div>

          {/* Hidden product_id field */}
          <input type="hidden" {...register("product_id")} />
          {errors.product_id && (
            <p role="alert" className="text-xs text-failed">{errors.product_id.message}</p>
          )}

          {/* Quantity */}
          <div>
            <label htmlFor="qty-input" className="block text-sm font-medium mb-1">
              Quantity
              <span className="ml-2 tech-data text-xs text-text-muted">
                (max: {selectedProduct.stock})
              </span>
            </label>
            <input
              id="qty-input"
              type="number"
              min={1}
              max={selectedProduct.stock}
              {...register("quantity", { valueAsNumber: true })}
              className={[
                "w-full max-w-[140px] bg-background border rounded-md px-3 py-2 text-text-main tech-data",
                "focus:outline-none focus:ring-2 focus:ring-interactive focus:ring-offset-1 focus:ring-offset-panel",
                errors.quantity ? "border-failed" : "border-border",
              ].join(" ")}
            />
            {errors.quantity && (
              <p role="alert" className="mt-1 text-xs text-failed">{errors.quantity.message}</p>
            )}
          </div>

          {/* Total preview */}
          {selectedQty > 0 && !errors.quantity && (
            <div className="flex items-center gap-3 text-sm">
              <span className="text-text-muted">Order total:</span>
              <span className="tech-data text-success font-bold text-lg">
                Rp {total.toLocaleString("id-ID")}
              </span>
              {total >= 10_000_000 && (
                <span className="text-xs text-pending">
                  ⚠ Exceeds Rp 10M — payment may be auto-declined
                </span>
              )}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || selectedProduct.stock === 0}
            className="bg-interactive text-white py-2 px-6 rounded-md font-medium
                       hover:bg-interactive/90 transition-colors
                       focus:outline-none focus:ring-2 focus:ring-interactive focus:ring-offset-2 focus:ring-offset-panel
                       disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Placing order…" : "Confirm Order"}
          </button>
        </form>
      )}

      {products.length === 0 && (
        <div className="text-center py-16 text-text-muted">
          <p className="heading text-lg">No products available</p>
          <p className="text-sm mt-1">Check back later or contact support.</p>
        </div>
      )}
    </div>
  );
}
