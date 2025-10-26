"use client";

import {
  Card,
  Text,
  Title,
  Group,
  Divider,
  Table,
  Paper,
  Button,
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
import { showError, showSuccess } from "@/lib/notifications";

interface Summary {
  label: string;
  value: number;
  color: string;
}

interface Transaction extends Summary {
  date: string;
  type: string;
  item: string;
  amount: string;
}

export default function DashboardPage() {
  const session = useUserSession(true);
  const [displayName, setDisplayName] = useState<string>("User");
  const [summary, setSummary] = useState([
    { label: "Total Sales", value: 0, color: "green" },
    { label: "Total Purchases", value: 0, color: "yellow" },
    { label: "Total Expenses", value: 0, color: "red" },
    { label: "Net Profit", value: 0, color: "blue" },
  ]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

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

  useEffect(() => {
    if (!session) return;

    const fetchSummary = async () => {
      setLoading(true);

      const { data, error } = await supabase
        .from("profit_summary")
        .select("total_sales, total_purchases, total_expenses, net_profit, day")
        .eq("user_id", session.user.id)
        .order("day", { ascending: false })
        .limit(1);

      if (!error && data?.[0]) {
        const s = data[0];
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

      const { data: sales } = await supabase
        .from("sales")
        .select("date, quantity, total_sales")
        .eq("user_id", session.user.id)
        .order("date", { ascending: false })
        .limit(5);

      const tx = (sales || []).map((s) => ({
        date: s.date,
        type: "Sale",
        item: "Product",
        amount: `₦${s.total_sales?.toLocaleString()}`,
      })) as Transaction[];

      setTransactions(tx);
      setLoading(false);
    };

    fetchSummary();
  }, [session]);

  const handleRefresh = async () => {
    setRefreshing(true);
    const { data, error } = await supabase.rpc("manual_refresh_profit_data");

    if (error) {
      showError(error.message);
    } else {
      showSuccess(data ?? "Profit summaries updated!");
    }
    setRefreshing(false);
  };

  if (loading) return <LoadingScreen message="Preparing your dashboard..." />;

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={2} c="brand.6">
            Welcome back, {displayName}!
          </Title>
          <Button
            loading={refreshing}
            onClick={handleRefresh}
            color="teal"
            variant="light"
          >
            🔄 Refresh Data
          </Button>
        </Flex>

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
                      <Table.Td>{t.type}</Table.Td>
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
