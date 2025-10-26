/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabaseClient";
import {
  Card,
  TextInput,
  NumberInput,
  Button,
  Table,
  Title,
  Group,
  ActionIcon,
  Pagination,
  Flex,
  Text,
  Stack,
  Container,
  Modal,
  Select,
  Center,
  Grid,
  ThemeIcon,
} from "@mantine/core";
import { showSuccess, showError } from "@/lib/notifications";
import {
  Pencil,
  Trash,
  Check,
  X,
  Plus,
  ShoppingCart,
  TrendingUp,
  DollarSign,
  Clock,
  Search,
} from "lucide-react";
import { useDisclosure } from "@mantine/hooks";

interface Sale {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total_sales: number;
  date: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

interface SalesStats {
  totalSales: number;
  totalTransactions: number;
  averageTransaction: number;
  todaySales: number;
}

export default function SalesPage() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Sale>>({});
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number | undefined>();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [availableStock, setAvailableStock] = useState<number | null>(null);

  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [saleToDelete, setSaleToDelete] = useState<{
    id: string;
    product_name: string;
  } | null>(null);

  const [stats, setStats] = useState<SalesStats>({
    totalSales: 0,
    totalTransactions: 0,
    averageTransaction: 0,
    todaySales: 0,
  });

  const itemsPerPage = 8;

  // ✅ Utility to calculate sales stats
  const calculateStats = useCallback((data: Sale[]) => {
    const today = new Date().toISOString().split("T")[0];
    const todaySales = data
      .filter((s) => s.date === today)
      .reduce((sum, s) => sum + (s.total_sales || 0), 0);
    const totalSales = data.reduce((sum, s) => sum + (s.total_sales || 0), 0);
    setStats({
      totalSales,
      totalTransactions: data.length,
      averageTransaction: data.length > 0 ? totalSales / data.length : 0,
      todaySales,
    });
  }, []);

  // ✅ Fetch products + sales
  const fetchSales = useCallback(async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [productsRes, salesRes] = await Promise.all([
      supabase.from("products").select("id, name").eq("user_id", user.id),
      supabase
        .from("sales")
        .select(
          `
          id,
          product_id,
          quantity,
          total_sales,
          date,
          created_at,
          products(name)
        `
        )
        .eq("user_id", user.id)
        .order("date", { ascending: false }),
    ]);

    if (productsRes.error) showError(productsRes.error.message);
    else setProducts(productsRes.data || []);

    if (salesRes.error) showError(salesRes.error.message);
    else {
      const formatted = (salesRes.data || []).map((s: any) => ({
        id: s.id,
        product_id: s.product_id,
        product_name: s.products?.name || "Unknown",
        quantity: s.quantity,
        total_sales: s.total_sales,
        date: s.date,
        created_at: s.created_at,
      }));
      setSales(formatted);
      calculateStats(formatted);
    }
  }, [calculateStats]);

  useEffect(() => {
    (async () => {
      await fetchSales();
    })();
  }, [fetchSales]);

  const filtered = useMemo(() => {
    if (!search.trim()) return sales;
    const q = search.toLowerCase();
    return sales.filter(
      (s) =>
        s.product_name.toLowerCase().includes(q) ||
        s.quantity.toString().includes(q) ||
        s.total_sales.toString().includes(q)
    );
  }, [sales, search]);

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  // ✅ Handle Add Sale (with stock check)
  const handleAdd = async () => {
    if (!productId || !quantity) {
      showError("All fields are required");
      return;
    }

    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    // ✅ Check product stock
    const { data: product, error: stockError } = await supabase
      .from("products")
      .select("name, stock_quantity")
      .eq("id", productId)
      .single();

    if (stockError) {
      setLoading(false);
      return showError("Could not check product stock");
    }

    if (!product) {
      setLoading(false);
      return showError("Product not found");
    }

    if (product.stock_quantity <= 0) {
      setLoading(false);
      return showError(`"${product.name}" is out of stock`);
    }

    if (quantity > product.stock_quantity) {
      setLoading(false);
      return showError(
        `Cannot record sale. Only ${product.stock_quantity} units of "${product.name}" available.`
      );
    }

    // ✅ Proceed with sale
    const { error } = await supabase
      .from("sales")
      .insert([{ product_id: productId, quantity, date, user_id: user.id }]);

    setLoading(false);
    if (error) return showError(error.message);

    showSuccess("Sale recorded successfully");

    // ✅ Optimistic UI update
    const newSale: Sale = {
      id: crypto.randomUUID(),
      product_id: productId,
      product_name: product.name,
      quantity,
      total_sales: 0,
      date,
      created_at: new Date().toISOString(),
    };
    setSales((prev) => {
      const updated = [newSale, ...prev];
      calculateStats(updated);
      return updated;
    });

    // ✅ Delay and refetch for DB consistency
    await new Promise((r) => setTimeout(r, 300));
    await fetchSales();

    // Reset form
    setProductId("");
    setQuantity(undefined);
    setAvailableStock(null);
    setDate(new Date().toISOString().split("T")[0]);
    setCurrentPage(1);
    close();
  };

  const openDeleteConfirm = (id: string, productName: string) => {
    setSaleToDelete({ id, product_name: productName });
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!saleToDelete) return;

    const { error } = await supabase
      .from("sales")
      .delete()
      .eq("id", saleToDelete.id);
    if (error) showError(error.message);
    else {
      showSuccess("Sale deleted successfully");
      const updated = sales.filter((s) => s.id !== saleToDelete.id);
      setSales(updated);
      calculateStats(updated);
    }

    closeDeleteModal();
    setSaleToDelete(null);
  };

  const startEdit = (sale: Sale) => {
    setEditingId(sale.id);
    setEditData({ ...sale });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("sales")
      .update({
        product_id: editData.product_id,
        quantity: editData.quantity,
        date: editData.date,
      })
      .eq("id", editingId);

    if (error) return showError(error.message);

    showSuccess("Sale updated");
    setEditingId(null);
    setEditData({});
    await fetchSales();
  };

  const thStyle = {
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
    fontWeight: 600,
    paddingLeft: "15px",
    paddingRight: "15px",
  };

  const tdStyle = {
    textAlign: "center" as const,
    whiteSpace: "nowrap" as const,
    paddingLeft: "15px",
    paddingRight: "15px",
  };

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={2}>💰 Sales</Title>
          <Group>
            <TextInput
              placeholder="Search sales..."
              value={search}
              onChange={(e) => setSearch(e.currentTarget.value)}
              leftSection={<Search size={16} />}
              style={{ minWidth: 220 }}
            />
            <Button onClick={open} leftSection={<Plus size={16} />}>
              Record Sale
            </Button>
          </Group>
        </Flex>

        {/* ✅ 4 Stats Cards */}
        <Grid>
          {[
            {
              label: "Total Sales",
              value: `₦${stats.totalSales.toLocaleString()}`,
              icon: <ShoppingCart />,
              color: "blue",
            },
            {
              label: "Transactions",
              value: stats.totalTransactions,
              icon: <TrendingUp />,
              color: "green",
            },
            {
              label: "Average Sale",
              value: `₦${stats.averageTransaction.toLocaleString("en-NG", {
                maximumFractionDigits: 0,
              })}`,
              icon: <DollarSign />,
              color: "cyan",
            },
            {
              label: "Today's Sales",
              value: `₦${stats.todaySales.toLocaleString()}`,
              icon: <Clock />,
              color: "orange",
            },
          ].map((card, i) => (
            <Grid.Col key={i} span={{ base: 12, sm: 6, md: 3 }}>
              <Card withBorder p="md" radius="md">
                <Flex justify="space-between" align="flex-start">
                  <Stack gap={4}>
                    <Text size="sm" fw={600} c="dimmed">
                      {card.label}
                    </Text>
                    <Text fw={700} size="lg">
                      {card.value}
                    </Text>
                  </Stack>
                  <ThemeIcon
                    color={card.color}
                    variant="light"
                    size="lg"
                    radius="md"
                  >
                    {card.icon}
                  </ThemeIcon>
                </Flex>
              </Card>
            </Grid.Col>
          ))}
        </Grid>

        {/* Modal */}
        <Modal opened={opened} onClose={close} title="Record New Sale" centered>
          <Stack gap="md">
            <Select
              label="Product"
              placeholder="Select a product"
              data={productOptions}
              value={productId}
              onChange={async (val) => {
                setProductId(val || "");
                if (val) {
                  const { data } = await supabase
                    .from("products")
                    .select("stock_quantity")
                    .eq("id", val)
                    .single();
                  setAvailableStock(data?.stock_quantity ?? null);
                } else {
                  setAvailableStock(null);
                }
              }}
              searchable
            />

            {availableStock !== null && (
              <Text size="sm" c="dimmed">
                Available stock:{" "}
                <Text span fw={600} c={availableStock > 0 ? "green" : "red"}>
                  {availableStock}
                </Text>
              </Text>
            )}

            <NumberInput
              label="Quantity"
              placeholder="0"
              value={quantity}
              onChange={(val) =>
                setQuantity(typeof val === "number" ? val : undefined)
              }
              hideControls
            />
            <TextInput
              label="Date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={handleAdd} loading={loading}>
                Save Sale
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Table */}
        <Card withBorder px="0" pt="0">
          {filtered.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <ShoppingCart size={40} strokeWidth={1.2} color="gray" />
                <Text fw={600}>No Sales Yet</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Record your first sale to see it appear here.
                </Text>
              </Stack>
            </Center>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <Table striped highlightOnHover>
                <thead>
                  <tr
                    style={{
                      backgroundColor: "rgb(243, 244, 246)",
                      height: 48,
                    }}
                  >
                    <th style={thStyle}>S/N</th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Product</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={thStyle}>Total Sales</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((s, i) => (
                    <tr key={s.id}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>
                        {editingId === s.id ? (
                          <Select
                            data={productOptions}
                            value={editData.product_id || ""}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                product_id: val || "",
                              })
                            }
                            size="xs"
                            searchable
                          />
                        ) : (
                          s.product_name
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === s.id ? (
                          <NumberInput
                            value={editData.quantity || 0}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                quantity:
                                  typeof val === "number" ? val : s.quantity,
                              })
                            }
                            size="xs"
                            hideControls
                          />
                        ) : (
                          s.quantity
                        )}
                      </td>
                      <td style={tdStyle}>
                        ₦{Number(s.total_sales).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        {editingId === s.id ? (
                          <TextInput
                            type="date"
                            value={editData.date || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                date: e.currentTarget.value,
                              })
                            }
                            size="xs"
                          />
                        ) : (
                          new Date(s.date).toLocaleDateString()
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Group gap="xs" justify="center">
                          {editingId === s.id ? (
                            <>
                              <ActionIcon color="green" onClick={saveEdit}>
                                <Check size={16} />
                              </ActionIcon>
                              <ActionIcon color="gray" onClick={cancelEdit}>
                                <X size={16} />
                              </ActionIcon>
                            </>
                          ) : (
                            <Flex gap="xs">
                              <ActionIcon
                                color="blue"
                                onClick={() => startEdit(s)}
                              >
                                <Pencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                onClick={() =>
                                  openDeleteConfirm(s.id, s.product_name)
                                }
                              >
                                <Trash size={16} />
                              </ActionIcon>
                            </Flex>
                          )}
                        </Group>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </Card>

        {/* Delete Modal */}
        <Modal
          opened={deleteModalOpened}
          onClose={closeDeleteModal}
          title="Delete Sale"
          centered
        >
          <Stack gap="lg">
            <Text>
              Are you sure you want to delete this sale for “
              {saleToDelete?.product_name}”?
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button color="red" onClick={handleDelete}>
                Delete Sale
              </Button>
            </Group>
          </Stack>
        </Modal>

        {totalPages > 1 && (
          <Flex justify="center" mt="lg">
            <Pagination
              total={totalPages}
              value={currentPage}
              onChange={setCurrentPage}
            />
          </Flex>
        )}
      </Stack>
    </Container>
  );
}
