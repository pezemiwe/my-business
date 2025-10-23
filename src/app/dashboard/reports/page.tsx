"use client";

import { Button, LoadingOverlay } from "@mantine/core";
import { showNotification } from "@mantine/notifications";
import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function RefreshButton() {
  const [loading, setLoading] = useState(false);

  const handleRefresh = async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc("manual_refresh_profit_data");

    if (error) {
      showNotification({
        title: "Error",
        message: error.message,
        color: "red",
      });
    } else {
      showNotification({
        title: "Success",
        message: data ?? "Profit summaries refreshed!",
        color: "green",
      });
    }
    setLoading(false);
  };

  return (
    <div className="relative flex items-center justify-center">
      <LoadingOverlay visible={loading} />
      <Button onClick={handleRefresh} variant="light" color="teal" size="md">
        🔄 Refresh Data
      </Button>
    </div>
  );
}
