/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  TextInput,
  Button,
  Title,
  Group,
  Grid,
  ThemeIcon,
  Stack,
  Container,
  Flex,
  Text,
  RingProgress,
  SimpleGrid,
  Badge,
  Select,
  Table,
  Center,
} from "@mantine/core";
import { showSuccess, showError } from "@/lib/notifications";
import { TrendingUp, TrendingDown, DollarSign, Download } from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart as RechartsChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

interface ProfitSummary {
  day: string;
  total_sales: number;
  total_purchases: number;
  total_expenses: number;
  net_profit: number;
  profit_margin_percent: number;
}

interface ReportsStats {
  totalRevenue: number;
  totalCosts: number;
  totalExpenses: number;
  netProfit: number;
  profitMargin: number;
  averageDailyProfit: number;
}

export default function ReportsPage() {
  const [profitData, setProfitData] = useState<ProfitSummary[]>([]);
  const [stats, setStats] = useState<ReportsStats>({
    totalRevenue: 0,
    totalCosts: 0,
    totalExpenses: 0,
    netProfit: 0,
    profitMargin: 0,
    averageDailyProfit: 0,
  });
  const [dateRange, setDateRange] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfitData();
  }, [dateRange]);

  const fetchProfitData = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from("profit_summary")
        .select("*")
        .eq("user_id", user.id)
        .order("day", { ascending: false });

      if (error) {
        showError(error.message);
        setLoading(false);
        return;
      }

      // Filter data based on date range
      const days = parseInt(dateRange);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const filteredData = (data || []).filter((item: any) => {
        const itemDate = new Date(item.day);
        return itemDate >= cutoffDate;
      });

      setProfitData(filteredData);
      calculateStats(filteredData);
    } catch (err: any) {
      showError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (data: ProfitSummary[]) => {
    if (data.length === 0) {
      setStats({
        totalRevenue: 0,
        totalCosts: 0,
        totalExpenses: 0,
        netProfit: 0,
        profitMargin: 0,
        averageDailyProfit: 0,
      });
      return;
    }

    const totalRevenue = data.reduce((sum, d) => sum + (d.total_sales || 0), 0);
    const totalCosts = data.reduce(
      (sum, d) => sum + (d.total_purchases || 0),
      0
    );
    const totalExpenses = data.reduce(
      (sum, d) => sum + (d.total_expenses || 0),
      0
    );
    const netProfit = totalRevenue - totalCosts - totalExpenses;
    const profitMargin =
      totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(2) : 0;
    const averageDailyProfit = netProfit / data.length;

    setStats({
      totalRevenue,
      totalCosts,
      totalExpenses,
      netProfit,
      profitMargin: parseFloat(profitMargin as any),
      averageDailyProfit,
    });
  };

  const chartData = useMemo(() => {
    return profitData
      .slice()
      .reverse()
      .map((item) => ({
        date: new Date(item.day).toLocaleDateString("en-NG", {
          month: "short",
          day: "numeric",
        }),
        sales: item.total_sales,
        costs: item.total_purchases,
        expenses: item.total_expenses,
        profit: item.net_profit,
      }));
  }, [profitData]);

  const expenseBreakdown = useMemo(() => {
    const expenses: { [key: string]: number } = {};
    profitData.forEach((item) => {
      if (item.total_expenses > 0) {
        const date = new Date(item.day).toLocaleDateString("en-NG");
        expenses[date] = (expenses[date] || 0) + item.total_expenses;
      }
    });
    return Object.entries(expenses)
      .map(([name, value]) => ({ name, value }))
      .slice(0, 8);
  }, [profitData]);

  const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b"];

  const downloadReport = () => {
    const csv = [
      ["Date", "Sales", "Purchases", "Expenses", "Net Profit", "Margin %"],
      ...profitData.map((item) => [
        item.day,
        item.total_sales,
        item.total_purchases,
        item.total_expenses,
        item.net_profit,
        item.profit_margin_percent,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `business-report-${
      new Date().toISOString().split("T")[0]
    }.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    showSuccess("Report downloaded successfully");
  };

  return (
    <Container size="lg" py="xs">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={2}>📈 Reports</Title>
          <Button
            onClick={downloadReport}
            leftSection={<Download size={16} />}
            variant="outline"
          >
            Download Report
          </Button>
        </Flex>

        {/* Date Range Filter */}
        <Card withBorder p="md" radius="md">
          <Flex gap="md" align="flex-end">
            <Select
              label="Time Period"
              placeholder="Select date range"
              data={[
                { value: "7", label: "Last 7 days" },
                { value: "30", label: "Last 30 days" },
                { value: "90", label: "Last 90 days" },
                { value: "365", label: "Last year" },
              ]}
              value={dateRange}
              onChange={(val) => setDateRange(val || "30")}
              w={200}
            />
            <Text size="sm" c="dimmed">
              Showing {profitData.length} days of data
            </Text>
          </Flex>
        </Card>

        {/* Stats Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" radius="md">
              <Flex justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    Total Revenue
                  </Text>
                  <Text fw={700} size="lg">
                    ₦{stats.totalRevenue.toLocaleString()}
                  </Text>
                  <Badge color="blue" variant="light" size="sm">
                    Sales
                  </Badge>
                </Stack>
                <ThemeIcon color="blue" variant="light" size="lg" radius="md">
                  <TrendingUp size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" radius="md">
              <Flex justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    Total Costs
                  </Text>
                  <Text fw={700} size="lg">
                    ₦{stats.totalCosts.toLocaleString()}
                  </Text>
                  <Badge color="red" variant="light" size="sm">
                    Purchases
                  </Badge>
                </Stack>
                <ThemeIcon color="red" variant="light" size="lg" radius="md">
                  <TrendingDown size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" radius="md">
              <Flex justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    Total Expenses
                  </Text>
                  <Text fw={700} size="lg">
                    ₦{stats.totalExpenses.toLocaleString()}
                  </Text>
                  <Badge color="yellow" variant="light" size="sm">
                    Operating
                  </Badge>
                </Stack>
                <ThemeIcon color="yellow" variant="light" size="lg" radius="md">
                  <DollarSign size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" radius="md">
              <Flex justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    Net Profit
                  </Text>
                  <Text
                    fw={700}
                    size="lg"
                    c={stats.netProfit >= 0 ? "green" : "red"}
                  >
                    ₦{stats.netProfit.toLocaleString()}
                  </Text>
                  <Badge
                    color={stats.profitMargin >= 0 ? "green" : "red"}
                    variant="light"
                    size="sm"
                  >
                    {stats.profitMargin}%
                  </Badge>
                </Stack>
                <ThemeIcon
                  color={stats.netProfit >= 0 ? "green" : "red"}
                  variant="light"
                  size="lg"
                  radius="md"
                >
                  <DollarSign size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Charts */}
        <SimpleGrid cols={{ base: 1, md: 2 }} spacing="lg">
          {/* Revenue vs Costs Chart */}
          <Card withBorder p="md" radius="md">
            <Title order={4} mb="md">
              Revenue vs Costs
            </Title>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: 12 }} />
                  <YAxis style={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="sales" fill="#3b82f6" name="Sales" />
                  <Bar dataKey="costs" fill="#ef4444" name="Costs" />
                  <Bar dataKey="expenses" fill="#f59e0b" name="Expenses" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Center h={300}>
                <Text c="dimmed">No data available</Text>
              </Center>
            )}
          </Card>

          {/* Profit Trend Chart */}
          <Card withBorder p="md" radius="md">
            <Title order={4} mb="md">
              Profit Trend
            </Title>
            {chartData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" style={{ fontSize: 12 }} />
                  <YAxis style={{ fontSize: 12 }} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Net Profit"
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <Center h={300}>
                <Text c="dimmed">No data available</Text>
              </Center>
            )}
          </Card>
        </SimpleGrid>

        {/* Metrics Summary */}
        <Grid>
          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder p="md" radius="md">
              <Stack gap="md">
                <Flex justify="space-between" align="center">
                  <Text fw={600} size="sm">
                    Profit Margin
                  </Text>
                  <Badge color="blue" variant="light">
                    {stats.profitMargin}%
                  </Badge>
                </Flex>
                <RingProgress
                  sections={[
                    {
                      value: Math.min(Math.max(stats.profitMargin, 0), 100),
                      color: stats.profitMargin >= 20 ? "green" : "yellow",
                    },
                  ]}
                  label={
                    <Stack gap={0} align="center">
                      <Text fw={700} size="xl">
                        {stats.profitMargin}%
                      </Text>
                      <Text size="xs" c="dimmed">
                        of revenue
                      </Text>
                    </Stack>
                  }
                  size={150}
                  thickness={8}
                />
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6 }}>
            <Card withBorder p="md" radius="md">
              <Stack gap="md">
                <Flex justify="space-between" align="center">
                  <Text fw={600} size="sm">
                    Average Daily Profit
                  </Text>
                  <Badge color="green" variant="light">
                    ₦
                    {stats.averageDailyProfit.toLocaleString("en-NG", {
                      maximumFractionDigits: 0,
                    })}
                  </Badge>
                </Flex>
                <Text size="sm" c="dimmed">
                  Based on {profitData.length} days of data
                </Text>
                <Text fw={700} size="lg">
                  ₦{stats.averageDailyProfit.toLocaleString()}
                </Text>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Detailed Data Table */}
        {profitData.length > 0 && (
          <Card withBorder p="md" radius="md">
            <Title order={4} mb="md">
              Detailed Daily Report
            </Title>
            <div
              style={{ overflowX: "auto", WebkitOverflowScrolling: "touch" }}
            >
              <Table striped highlightOnHover>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "rgb(243, 244, 246)",
                      height: 48,
                    }}
                  >
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        padding: "0 15px",
                      }}
                    >
                      Date
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        padding: "0 15px",
                      }}
                    >
                      Sales
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        padding: "0 15px",
                      }}
                    >
                      Purchases
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        padding: "0 15px",
                      }}
                    >
                      Expenses
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        padding: "0 15px",
                      }}
                    >
                      Net Profit
                    </th>
                    <th
                      style={{
                        textAlign: "center",
                        fontWeight: 700,
                        padding: "0 15px",
                      }}
                    >
                      Margin %
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profitData.slice(0, 20).map((item) => (
                    <tr key={item.day} style={{ height: 48 }}>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0 15px",
                          fontWeight: 600,
                        }}
                      >
                        {new Date(item.day).toLocaleDateString("en-NG")}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0 15px",
                          color: "#3b82f6",
                        }}
                      >
                        ₦{item.total_sales.toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0 15px",
                          color: "#ef4444",
                        }}
                      >
                        ₦{item.total_purchases.toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0 15px",
                          color: "#f59e0b",
                        }}
                      >
                        ₦{item.total_expenses.toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0 15px",
                          fontWeight: 600,
                          color: item.net_profit >= 0 ? "#10b981" : "#ef4444",
                        }}
                      >
                        ₦{item.net_profit.toLocaleString()}
                      </td>
                      <td
                        style={{
                          textAlign: "center",
                          padding: "0 15px",
                          fontWeight: 600,
                        }}
                      >
                        <Badge
                          color={
                            item.profit_margin_percent >= 0 ? "green" : "red"
                          }
                          variant="light"
                          size="sm"
                        >
                          {item.profit_margin_percent.toFixed(2)}%
                        </Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          </Card>
        )}
      </Stack>
    </Container>
  );
}
