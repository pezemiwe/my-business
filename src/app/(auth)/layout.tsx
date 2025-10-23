"use client";

import { Paper, Image, Title } from "@mantine/core";
import "@mantine/core/styles.css";
import "../globals.css";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="flex items-center justify-center min-h-screen bg-[#F9FAFB] px-4"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        height: "100vh",
      }}
    >
      <Paper
        shadow="md"
        radius="md"
        p="xl"
        w={{ base: "90%", sm: 380 }}
        style={{
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Image
          src="/logo.svg"
          alt="My Business Logo"
          width={80}
          height={80}
          style={{ marginBottom: "0.5rem" }}
        />
        <Title order={2} c="brand.6" mb="md">
          My Business
        </Title>

        <div style={{ width: "100%" }}>{children}</div>
      </Paper>
    </div>
  );
}
