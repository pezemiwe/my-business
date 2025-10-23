"use client";

import { Loader, Text, Stack, Center, Transition, Paper } from "@mantine/core";
import { useState, useEffect } from "react";

export default function LoadingScreen({
  message = "Loading...",
  visible = true,
}: {
  message?: string;
  visible?: boolean;
}) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <Transition
      mounted={visible && mounted}
      transition="fade"
      duration={400}
      timingFunction="ease"
    >
      {(styles) => (
        <Center
          w="100%"
          h="100vh"
          style={{
            ...styles,
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 9999,
            backdropFilter: "blur(6px)",
            backgroundColor: "rgba(255, 255, 255, 0.65)",
          }}
        >
          <Paper
            shadow="md"
            radius="md"
            p="xl"
            withBorder
            style={{
              background: "rgba(255,255,255,0.85)",
              borderColor: "rgba(0,0,0,0.05)",
              textAlign: "center",
            }}
          >
            <Stack align="center" gap="sm">
              <Loader type="bars" color="brand.6" size="lg" />
              <Text size="sm" c="dimmed">
                {message}
              </Text>
            </Stack>
          </Paper>
        </Center>
      )}
    </Transition>
  );
}
