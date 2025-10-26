"use client";

import {
  Card,
  Text,
  Title,
  Group,
  Divider,
  Table,
  Paper,
  Flex,
  Center,
  Stack,
  Container,
  SimpleGrid,
} from "@mantine/core";
import { useUserSession } from "@/lib/useUserSession";
import { supabase } from "@/lib/supabaseClient";
import LoadingScreen from "@/components/loader/LoadingScreen";
import CountUp from "react-countup";
import { useEffect, useState } from "react";
import { AlertCircle } from "lucide-react";
import { greetings } from "@/lib/utils";

// ✅ Interfaces
interface Summary {
  label: string;
  value: number;
  color: string;
}

interface Transaction {
  date: string;
  type: string;
  item: string;
  amount: string;
}

// ✅ Explicit result types for Supabase queries
interface SaleRow {
  date: string;
  total_sales: number;
  products: { name: string }[] | { name: string } | null;
}

interface PurchaseRow {
  date: string;
  total_cost: number;
  products: { name: string }[] | { name: string } | null;
}

interface ExpenseRow {
  date: string;
  description: string;
  amount: number;
}

export default function DashboardPage() {
  const session = useUserSession(true);
  const [displayName, setDisplayName] = useState<string>("User");
  const [summary, setSummary] = useState<Summary[]>([
    { label: "Total Sales", value: 0, color: "green" },
    { label: "Total Purchases", value: 0, color: "yellow" },
    { label: "Total Expenses", value: 0, color: "red" },
    { label: "Net Profit", value: 0, color: "blue" },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [greeting, setGreeting] = useState("");

  // Greeting logic
  useEffect(() => {
    const hour = new Date().getHours();
    const timeOfDay: keyof typeof greetings =
      hour < 12 ? "morning" : hour < 18 ? "afternoon" : "evening";

    const messages = greetings[timeOfDay];
    const randomMsg = messages[Math.floor(Math.random() * messages.length)];
    const finalGreeting = randomMsg.replace("{name}", displayName || "Boss");

    sessionStorage.setItem("greeting", finalGreeting);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(finalGreeting);
  }, [displayName]);

  // Fetch display name
  useEffect(() => {
    const fetchName = async () => {
      const cached = localStorage.getItem("display_name");
      if (cached) {
        setDisplayName(cached);
        return;
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("id", user.id)
          .single();

        if (data?.display_name) {
          setDisplayName(data.display_name);
          localStorage.setItem("display_name", data.display_name);
        }
      }
    };

    fetchName();
  }, []);

  // Fetch summary + recent transactions
  useEffect(() => {
    if (!session) return;

    const fetchSummary = async () => {
      setLoading(true);

      // --- Profit summary ---
      const { data: summaryData, error: summaryError } = await supabase
        .from("profit_summary")
        .select("total_sales, total_purchases, total_expenses, net_profit, day")
        .eq("user_id", session.user.id)
        .order("day", { ascending: false })
        .limit(1);

      if (!summaryError && summaryData?.[0]) {
        const s = summaryData[0];
        setSummary([
          { label: "Total Sales", value: s.total_sales || 0, color: "green" },
          {
            label: "Total Purchases",
            value: s.total_purchases || 0,
            color: "yellow",
          },
          {
            label: "Total Expenses",
            value: s.total_expenses || 0,
            color: "red",
          },
          { label: "Net Profit", value: s.net_profit || 0, color: "blue" },
        ]);
      }

      // --- Sales ---
      const { data: sales } = (await supabase
        .from("sales")
        .select(
          `
          date,
          total_sales,
          products (
            name
          )
        `
        )
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(5)) as { data: SaleRow[] | null };

      // --- Purchases ---
      const { data: purchases } = (await supabase
        .from("purchases")
        .select(
          `
          date,
          total_cost,
          products (
            name
          )
        `
        )
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(5)) as { data: PurchaseRow[] | null };

      // --- Expenses ---
      const { data: expenses } = (await supabase
        .from("expenses")
        .select("date, description, amount")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(5)) as { data: ExpenseRow[] | null };

      // --- Normalize all transactions ---
      const allTx: Transaction[] = [
        ...(sales || []).map((s) => ({
          date: s.date,
          type: "Sale",
          item: Array.isArray(s.products)
            ? s.products[0]?.name || "—"
            : s.products?.name || "—",
          amount: `₦${Number(s.total_sales || 0).toLocaleString()}`,
        })),
        ...(purchases || []).map((p) => ({
          date: p.date,
          type: "Purchase",
          item: Array.isArray(p.products)
            ? p.products[0]?.name || "—"
            : p.products?.name || "—",
          amount: `₦${Number(p.total_cost || 0).toLocaleString()}`,
        })),
        ...(expenses || []).map((e) => ({
          date: e.date,
          type: "Expense",
          item: e.description || "—",
          amount: `₦${Number(e.amount || 0).toLocaleString()}`,
        })),
      ];

      // Sort newest first
      const sorted = allTx
        .filter((t) => t.date)
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5);

      setTransactions(sorted);
      setLoading(false);
    };

    fetchSummary();
  }, [session]);

  if (loading) return <LoadingScreen message="Preparing your dashboard..." />;

  // --- Render ---
  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={4} c="brand.6">
            {greeting}
          </Title>
        </Flex>

        {/* Summary Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, md: 4 }} spacing="md">
          {summary.map((stat) => (
            <Card
              key={stat.label}
              shadow="sm"
              radius="md"
              p="lg"
              withBorder
              style={{
                borderTop: `4px solid var(--mantine-color-${stat.color}-6)`,
                background: "#fff",
              }}
            >
              <Text size="sm" c="dimmed">
                {stat.label}
              </Text>
              <Text fz="xl" fw={600} mt="xs">
                <CountUp
                  end={Number(stat.value)}
                  prefix="₦"
                  duration={1.8}
                  separator=","
                />
              </Text>
            </Card>
          ))}
        </SimpleGrid>

        {/* Recent Transactions */}
        <Paper shadow="sm" radius="md" p="lg" withBorder>
          <Group justify="space-between" mb="sm">
            <Title order={4}>Recent Transactions</Title>
          </Group>
          <Divider mb="md" />

          {transactions.length > 0 ? (
            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Date</Table.Th>
                    <Table.Th>Type</Table.Th>
                    <Table.Th>Item</Table.Th>
                    <Table.Th>Amount</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {transactions.map((t, i) => (
                    <Table.Tr key={i}>
                      <Table.Td>{t.date}</Table.Td>
                      <Table.Td
                        c={
                          t.type === "Sale"
                            ? "green"
                            : t.type === "Purchase"
                            ? "yellow.8"
                            : "red"
                        }
                      >
                        {t.type}
                      </Table.Td>
                      <Table.Td>{t.item}</Table.Td>
                      <Table.Td fw={600}>{t.amount}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </div>
          ) : (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <AlertCircle size={40} strokeWidth={1.2} color="gray" />
                <Text fw={600}>No transactions yet</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Once you start recording sales, purchases, or expenses,
                  they&apos;ll appear here.
                </Text>
              </Stack>
            </Center>
          )}
        </Paper>
      </Stack>
    </Container>
  );
}
