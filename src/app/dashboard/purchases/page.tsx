/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState, useEffect } from "react";
import { Stack, Title, Divider } from "@mantine/core";
import PurchaseForm from "@/components/forms/PurchaseForm";
import { showError } from "@/lib/notifications";
import PurchaseTable from "@/components/tables/PurchaseTable";

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<any[]>([]);

  const fetchPurchases = async () => {
    try {
      const res = await fetch("/api/purchases");
      const data = await res.json();
      if (res.ok) setPurchases(data);
      else showError(data.error || "Failed to load purchases");
    } catch (err: any) {
      showError(err.message);
    }
  };

  useEffect(() => {
    const loadPurchases = async () => {
      await fetchPurchases();
    };
    loadPurchases();
  }, []);

  return (
    <Stack>
      <Title order={2}>Purchases</Title>
      <Divider />
      <PurchaseForm onCreated={fetchPurchases} />
      <PurchaseTable data={purchases} />
    </Stack>
  );
}
