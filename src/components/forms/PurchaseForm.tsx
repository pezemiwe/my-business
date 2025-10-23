/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import {
  Button,
  NumberInput,
  Select,
  Group,
  Stack,
  Title,
  Divider,
} from "@mantine/core";
import { showError, showSuccess } from "@/lib/notifications";

export default function PurchaseForm({
  onCreated,
}: {
  onCreated?: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<{ label: string; value: string }[]>(
    []
  );
  const [formData, setFormData] = useState({
    product_id: "",
    quantity: 1,
    total_cost: 0,
    date: new Date().toISOString().split("T")[0],
  });

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch("/api/products");
        if (!res.ok) throw new Error("Failed to fetch products");
        const data = await res.json();

        const options = data.map((p: any) => ({
          label: p.name,
          value: p.id,
        }));
        setProducts(options);
      } catch (err: any) {
        showError(err.message || "Failed to load products");
      }
    };
    fetchProducts();
  }, []);

  const handleChange = (key: string, value: any) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const { product_id, quantity, total_cost } = formData;

    if (!product_id || quantity <= 0 || total_cost <= 0) {
      showError("Please fill all required fields correctly.", "Invalid Input");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/purchases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const result = await res.json();

      if (!res.ok) throw new Error(result.error || "Failed to save purchase");

      showSuccess("Purchase recorded successfully!");
      if (onCreated) onCreated();

      // Reset form
      setFormData({
        product_id: "",
        quantity: 1,
        total_cost: 0,
        date: new Date().toISOString().split("T")[0],
      });
    } catch (err: any) {
      console.error("PurchaseForm error:", err);
      showError(err.message || "Unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack p="lg" gap="md" bg="white" w="100%">
      <Title order={4}>Add New Purchase</Title>
      <Divider />

      <Select
        label="Product"
        placeholder="Select a product"
        data={products}
        value={formData.product_id}
        onChange={(val) => handleChange("product_id", val)}
        searchable
        required
      />

      <NumberInput
        label="Quantity"
        placeholder="Enter quantity"
        value={formData.quantity}
        min={1}
        hideControls
        onChange={(val) => handleChange("quantity", val)}
        required
      />

      <NumberInput
        label="Total Cost (₦)"
        placeholder="Enter total cost"
        value={formData.total_cost}
        min={0}
        hideControls
        onChange={(val) => handleChange("total_cost", val)}
        required
      />

      <Group justify="flex-end" mt="sm">
        <Button loading={loading} onClick={handleSubmit}>
          Save Purchase
        </Button>
      </Group>
    </Stack>
  );
}
