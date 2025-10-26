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
  Center,
} from "@mantine/core";
import { showSuccess, showError } from "@/lib/notifications";
import { Pencil, Trash, Check, X, Plus, Package } from "lucide-react";
import { useDisclosure } from "@mantine/hooks";

interface Product {
  id: string;
  name: string;
  cost_price: number;
  selling_price: number;
  stock_quantity: number;
  created_at: string;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState<number | undefined>();
  const [sellingPrice, setSellingPrice] = useState<number | undefined>();
  const [stock, setStock] = useState<number | undefined>();
  const [opened, { open, close }] = useDisclosure(false);
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [productToDelete, setProductToDelete] = useState<{
    id: string;
    name: string;
  } | null>(null);

  const itemsPerPage = 8;

  useEffect(() => {
    const fetchProducts = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) showError(error.message);
      else setProducts(data || []);
    };

    fetchProducts();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return products;
    const query = search.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        p.cost_price.toString().includes(query) ||
        p.selling_price.toString().includes(query)
    );
  }, [search, products]);

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleAdd = async () => {
    if (!name.trim()) {
      showError("Product name is required");
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

    const { error } = await supabase.from("products").insert([
      {
        name,
        cost_price: costPrice,
        selling_price: sellingPrice,
        stock_quantity: stock || 0,
        user_id: user.id,
      },
    ]);

    setLoading(false);
    if (error) return showError(error.message);

    showSuccess("Product added successfully");
    setName("");
    setCostPrice(undefined);
    setSellingPrice(undefined);
    setStock(undefined);
    setCurrentPage(1);
    close();

    const { data, error: fetchError } = await supabase
      .from("products")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (!fetchError) setProducts(data || []);
  };

  const openDeleteConfirm = (id: string) => {
    const product = products.find((p) => p.id === id);
    if (product) {
      setProductToDelete({ id, name: product.name });
      openDeleteModal();
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;

    const { error } = await supabase
      .from("products")
      .delete()
      .eq("id", productToDelete.id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Product deleted successfully");
      setProducts(products.filter((p) => p.id !== productToDelete.id));
    }

    closeDeleteModal();
    setProductToDelete(null);
  };

  const startEdit = (product: Product) => {
    setEditingId(product.id);
    setEditData({ ...product });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("products")
      .update({
        name: editData.name,
        cost_price: editData.cost_price,
        selling_price: editData.selling_price,
        stock_quantity: editData.stock_quantity,
      })
      .eq("id", editingId);

    if (error) return showError(error.message);

    showSuccess("Product updated");
    setEditingId(null);
    setEditData({});

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) {
      const { data, error: fetchError } = await supabase
        .from("products")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (!fetchError) setProducts(data || []);
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

  return (
    <Container size="lg" py="xs">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={2}>🛍️ Products</Title>
          <Button onClick={open} leftSection={<Plus size={16} />}>
            Add Product
          </Button>
        </Flex>

        <Modal opened={opened} onClose={close} title="Add New Product" centered>
          <Stack gap="md">
            <TextInput
              label="Product Name"
              placeholder="e.g., Wall Clock"
              value={name}
              onChange={(e) => setName(e.currentTarget.value)}
            />
            <NumberInput
              label="Cost Price"
              placeholder="₦0"
              value={costPrice}
              hideControls
              onChange={(val) =>
                setCostPrice(typeof val === "number" ? val : undefined)
              }
            />
            <NumberInput
              label="Selling Price"
              placeholder="₦0"
              value={sellingPrice}
              hideControls
              onChange={(val) =>
                setSellingPrice(typeof val === "number" ? val : undefined)
              }
            />
            <NumberInput
              label="Stock Quantity"
              placeholder="0"
              value={stock}
              hideControls
              onChange={(val) =>
                setStock(typeof val === "number" ? val : undefined)
              }
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={handleAdd} loading={loading}>
                Add Product
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
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            w="100%"
          />
          <Text c="dimmed" size="sm">
            {filtered.length} items found
          </Text>
        </Flex>

        <Card withBorder px="0" pt="0">
          {filtered.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Package size={40} strokeWidth={1.2} color="gray" />
                <Text fw={600}>No Products Yet</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Add your first product to see it appear here.
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
                    <th style={{ ...thStyle, textAlign: "left" }}>Name</th>
                    <th style={thStyle}>Cost Price</th>
                    <th style={thStyle}>Selling Price</th>
                    <th style={thStyle}>Stock</th>
                    <th style={thStyle}>Created</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((p, i) => (
                    <tr key={p.id} style={{ height: 48 }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>
                        {editingId === p.id ? (
                          <TextInput
                            value={editData.name || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                name: e.currentTarget.value,
                              })
                            }
                            size="xs"
                          />
                        ) : (
                          p.name
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === p.id ? (
                          <NumberInput
                            value={editData.cost_price || 0}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                cost_price:
                                  typeof val === "number" ? val : p.cost_price,
                              })
                            }
                            size="xs"
                            hideControls
                          />
                        ) : (
                          `₦${p.cost_price}`
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === p.id ? (
                          <NumberInput
                            value={editData.selling_price || 0}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                selling_price:
                                  typeof val === "number"
                                    ? val
                                    : p.selling_price,
                              })
                            }
                            size="xs"
                            hideControls
                          />
                        ) : (
                          `₦${p.selling_price}`
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === p.id ? (
                          <NumberInput
                            value={editData.stock_quantity || 0}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                stock_quantity:
                                  typeof val === "number"
                                    ? val
                                    : p.stock_quantity,
                              })
                            }
                            size="xs"
                            hideControls
                          />
                        ) : (
                          p.stock_quantity
                        )}
                      </td>
                      <td style={tdStyle}>
                        {new Date(p.created_at).toLocaleDateString()}
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
                                onClick={() => openDeleteConfirm(p.id)}
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
          title="Delete Product"
          centered
        >
          <Stack gap="lg">
            <Text>
              {`Are you sure you want to delete "${productToDelete?.name}"? This action cannot
              be undone.`}
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button color="red" onClick={handleDelete}>
                Delete Product
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
