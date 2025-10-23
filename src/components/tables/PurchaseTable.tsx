/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { Table, ScrollArea, Text, Group, Paper, Divider } from "@mantine/core";
import { ShoppingBag } from "lucide-react";

export default function PurchaseTable({ data }: { data: any[] }) {
  if (!data?.length) {
    return (
      <Paper withBorder p="xl" radius="md" ta="center">
        <Group justify="center" mb="sm">
          <ShoppingBag size={32} color="gray" />
        </Group>
        <Text fw={500}>No Purchases Yet</Text>
        <Text size="sm" c="dimmed">
          Add your first purchase to see it appear here.
        </Text>
      </Paper>
    );
  }

  return (
    <Paper withBorder shadow="xs" radius="md" p="md">
      <Text fw={600} mb="sm">
        Purchase History
      </Text>
      <Divider mb="sm" />
      <ScrollArea>
        <Table striped highlightOnHover withTableBorder>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Date</Table.Th>
              <Table.Th>Product</Table.Th>
              <Table.Th>Quantity</Table.Th>
              <Table.Th>Total Cost</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {data.map((p) => (
              <Table.Tr key={p.id}>
                <Table.Td>{new Date(p.date).toLocaleDateString()}</Table.Td>
                <Table.Td>{p.product_name || p.product_id}</Table.Td>
                <Table.Td>{p.quantity}</Table.Td>
                <Table.Td>₦{Number(p.total_cost).toLocaleString()}</Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
}
