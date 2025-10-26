/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useMemo, useState, useEffect } from "react";
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
} from "@mantine/core";
import { showSuccess, showError } from "@/lib/notifications";
import { Pencil, Trash, Check, X, Plus, ShoppingBag } from "lucide-react";
import { useDisclosure } from "@mantine/hooks";

interface Purchase {
  id: string;
  product_id: string;
  product_name: string;
  quantity: number;
  total_cost: number;
  date: string;
  created_at: string;
}

interface Product {
  id: string;
  name: string;
}

export default function PurchasesPage() {
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Purchase>>({});
  const [loading, setLoading] = useState(false);
  const [productId, setProductId] = useState("");
  const [quantity, setQuantity] = useState<number | undefined>();
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [purchaseToDelete, setPurchaseToDelete] = useState<{
    id: string;
    product_name: string;
  } | null>(null);

  const itemsPerPage = 8;

  useEffect(() => {
    const fetchProducts = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from("products")
        .select("id, name")
        .eq("user_id", authUser.id);

      if (error) showError(error.message);
      else setProducts(data || []);
    };

    const fetchPurchasesData = async () => {
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data, error } = await supabase
        .from("purchases")
        .select(
          `
          id,
          product_id,
          quantity,
          total_cost,
          date,
          created_at,
          products(name)
        `
        )
        .eq("user_id", authUser.id)
        .order("date", { ascending: false });

      if (error) {
        showError(error.message);
      } else {
        const formatted = (data || []).map((p: any) => ({
          id: p.id,
          product_id: p.product_id,
          product_name: p.products?.name || "Unknown",
          quantity: p.quantity,
          total_cost: p.total_cost,
          date: p.date,
          created_at: p.created_at,
        }));
        setPurchases(formatted);
      }
    };

    fetchProducts();
    fetchPurchasesData();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return purchases;
    const query = search.toLowerCase();
    return purchases.filter(
      (p) =>
        p.product_name.toLowerCase().includes(query) ||
        p.quantity.toString().includes(query) ||
        p.total_cost.toString().includes(query)
    );
  }, [search, purchases]);

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleAdd = async () => {
    if (!productId || !quantity) {
      showError("Please fill all required fields");
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

    const { error } = await supabase.from("purchases").insert([
      {
        product_id: productId,
        quantity,
        date,
        user_id: user.id,
      },
    ]);

    setLoading(false);
    if (error) return showError(error.message);

    showSuccess("Purchase recorded successfully");
    setProductId("");
    setQuantity(undefined);
    setDate(new Date().toISOString().split("T")[0]);
    setCurrentPage(1);
    close();

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      const { data, error } = await supabase
        .from("purchases")
        .select(
          `
          id,
          product_id,
          quantity,
          total_cost,
          date,
          created_at,
          products(name)
        `
        )
        .eq("user_id", authUser.id)
        .order("date", { ascending: false });

      if (!error) {
        const formatted = (data || []).map((p: any) => ({
          id: p.id,
          product_id: p.product_id,
          product_name: p.products?.name || "Unknown",
          quantity: p.quantity,
          total_cost: p.total_cost,
          date: p.date,
          created_at: p.created_at,
        }));
        setPurchases(formatted);
      }
    }
  };

  const openDeleteConfirm = (id: string, productName: string) => {
    setPurchaseToDelete({ id, product_name: productName });
    openDeleteModal();
  };

  const handleDelete = async () => {
    if (!purchaseToDelete) return;

    const { error } = await supabase
      .from("purchases")
      .delete()
      .eq("id", purchaseToDelete.id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Purchase deleted successfully");
      setPurchases(purchases.filter((p) => p.id !== purchaseToDelete.id));
    }

    closeDeleteModal();
    setPurchaseToDelete(null);
  };

  const startEdit = (purchase: Purchase) => {
    setEditingId(purchase.id);
    setEditData({ ...purchase });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("purchases")
      .update({
        product_id: editData.product_id,
        quantity: editData.quantity,
        date: editData.date,
      })
      .eq("id", editingId);

    if (error) return showError(error.message);

    showSuccess("Purchase updated");
    setEditingId(null);
    setEditData({});

    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (authUser) {
      const { data, error } = await supabase
        .from("purchases")
        .select(
          `
          id,
          product_id,
          quantity,
          total_cost,
          date,
          created_at,
          products(name)
        `
        )
        .eq("user_id", authUser.id)
        .order("date", { ascending: false });

      if (!error) {
        const formatted = (data || []).map((p: any) => ({
          id: p.id,
          product_id: p.product_id,
          product_name: p.products?.name || "Unknown",
          quantity: p.quantity,
          total_cost: p.total_cost,
          date: p.date,
          created_at: p.created_at,
        }));
        setPurchases(formatted);
      }
    }
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

  const productOptions = products.map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <Container size="xl" py="lg">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={2}>📦 Purchases</Title>
          <Button onClick={open} leftSection={<Plus size={16} />}>
            Add Purchase
          </Button>
        </Flex>

        <Modal
          opened={opened}
          onClose={close}
          title="Record New Purchase"
          centered
        >
          <Stack gap="md">
            <Select
              label="Product"
              placeholder="Select a product"
              data={productOptions}
              value={productId}
              onChange={(val) => setProductId(val || "")}
              searchable
            />
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
                Save Purchase
              </Button>
            </Group>
          </Stack>
        </Modal>

        <Flex
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "flex-start", sm: "center" }}
          gap="md"
        >
          <TextInput
            placeholder="Search purchases..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            w="100%"
          />
          <Text c="dimmed" size="sm">
            {filtered.length} records found
          </Text>
        </Flex>

        <Card withBorder px="0" pt="0">
          {filtered.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <ShoppingBag size={40} strokeWidth={1.2} color="gray" />
                <Text fw={600}>No Purchases Yet</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Add your first purchase to see it appear here.
                </Text>
              </Stack>
            </Center>
          ) : (
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
                        ...thStyle,
                        fontWeight: 700,
                        textAlign: "center",
                      }}
                    >
                      S/N
                    </th>
                    <th style={{ ...thStyle, textAlign: "left" }}>Product</th>
                    <th style={thStyle}>Quantity</th>
                    <th style={thStyle}>Total Cost</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => (
                    <tr key={p.id} style={{ height: 48 }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>
                        {editingId === p.id ? (
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
                          p.product_name
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === p.id ? (
                          <NumberInput
                            value={editData.quantity || 0}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                quantity:
                                  typeof val === "number" ? val : p.quantity,
                              })
                            }
                            size="xs"
                            hideControls
                          />
                        ) : (
                          p.quantity
                        )}
                      </td>
                      <td style={tdStyle}>
                        ₦{Number(p.total_cost).toLocaleString()}
                      </td>
                      <td style={tdStyle}>
                        {editingId === p.id ? (
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
                          new Date(p.date).toLocaleDateString()
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Group gap="xs" justify="center">
                          {editingId === p.id ? (
                            <>
                              <ActionIcon
                                color="green"
                                onClick={saveEdit}
                                size="sm"
                              >
                                <Check size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="gray"
                                onClick={cancelEdit}
                                size="sm"
                              >
                                <X size={16} />
                              </ActionIcon>
                            </>
                          ) : (
                            <Flex gap="xs">
                              <ActionIcon
                                color="blue"
                                onClick={() => startEdit(p)}
                                size="sm"
                              >
                                <Pencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                onClick={() =>
                                  openDeleteConfirm(p.id, p.product_name)
                                }
                                size="sm"
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

        <Modal
          opened={deleteModalOpened}
          onClose={closeDeleteModal}
          title="Delete Purchase"
          centered
        >
          <Stack gap="lg">
            <div>
              <Text size="sm" c="dimmed">
                Product
              </Text>
              <Text fw={600} size="md" mt="xs">
                {purchaseToDelete?.product_name}
              </Text>
            </div>
            <Text>Are you sure you want to delete this purchase record?</Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button color="red" onClick={handleDelete}>
                Delete Purchase
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
