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
} from "@mantine/core";
import { showSuccess, showError } from "@/lib/notifications";
import { Pencil, Trash, Check, X } from "lucide-react";

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
  const itemsPerPage = 8;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Product>>({});
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [costPrice, setCostPrice] = useState<number | undefined>();
  const [sellingPrice, setSellingPrice] = useState<number | undefined>();
  const [stock, setStock] = useState<number | undefined>();

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

  useEffect(() => {
    (async () => {
      await fetchProducts();
    })();
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
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;
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
    fetchProducts();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", id);
    if (error) return showError(error.message);
    showSuccess("Product deleted");
    setProducts(products.filter((p) => p.id !== id));
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
    fetchProducts();
  };

  return (
    <div className="space-y-6">
      <Title order={3}>🛍️ Products</Title>
      <Card shadow="sm" withBorder>
        <Group grow>
          <TextInput
            label="Product Name"
            placeholder="e.g., Wall Clock"
            value={name}
            onChange={(e) => setName(e.currentTarget.value)}
          />
          <NumberInput
            label="Cost Price"
            value={costPrice}
            onChange={(val) =>
              setCostPrice(typeof val === "number" ? val : undefined)
            }
          />
          <NumberInput
            label="Selling Price"
            value={sellingPrice}
            onChange={(val) =>
              setSellingPrice(typeof val === "number" ? val : undefined)
            }
          />
          <NumberInput
            label="Stock"
            value={stock}
            onChange={(val) =>
              setStock(typeof val === "number" ? val : undefined)
            }
          />
        </Group>
        <Button mt="md" onClick={handleAdd} loading={loading}>
          Add Product
        </Button>
      </Card>

      {/* 🔹 Search Bar */}
      <Flex justify="space-between" align="center">
        <TextInput
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          w={300}
        />
        <Text c="dimmed">{filtered.length} items found</Text>
      </Flex>

      {/* 🔹 Table */}
      <Card withBorder>
        {filtered.length === 0 ? (
          <Text c="dimmed" ta="center" py="md">
            No products found.
          </Text>
        ) : (
          <Table striped highlightOnHover>
            <thead>
              <tr>
                <th>Name</th>
                <th>Cost Price</th>
                <th>Selling Price</th>
                <th>Stock</th>
                <th>Created</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((p) => (
                <tr key={p.id}>
                  <td>
                    {editingId === p.id ? (
                      <TextInput
                        value={editData.name || ""}
                        onChange={(e) =>
                          setEditData({
                            ...editData,
                            name: e.currentTarget.value,
                          })
                        }
                      />
                    ) : (
                      p.name
                    )}
                  </td>
                  <td>
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
                      />
                    ) : (
                      `₦${p.cost_price}`
                    )}
                  </td>
                  <td>
                    {editingId === p.id ? (
                      <NumberInput
                        value={editData.selling_price || 0}
                        onChange={(val) =>
                          setEditData({
                            ...editData,
                            selling_price:
                              typeof val === "number" ? val : p.selling_price,
                          })
                        }
                      />
                    ) : (
                      `₦${p.selling_price}`
                    )}
                  </td>
                  <td>
                    {editingId === p.id ? (
                      <NumberInput
                        value={editData.stock_quantity || 0}
                        onChange={(val) =>
                          setEditData({
                            ...editData,
                            stock_quantity:
                              typeof val === "number" ? val : p.stock_quantity,
                          })
                        }
                      />
                    ) : (
                      p.stock_quantity
                    )}
                  </td>
                  <td>{new Date(p.created_at).toLocaleDateString()}</td>
                  <td>
                    <Group gap="xs">
                      {editingId === p.id ? (
                        <>
                          <ActionIcon color="green" onClick={saveEdit}>
                            <Check size={16} />
                          </ActionIcon>
                          <ActionIcon color="gray" onClick={cancelEdit}>
                            <X size={16} />
                          </ActionIcon>
                        </>
                      ) : (
                        <>
                          <ActionIcon color="blue" onClick={() => startEdit(p)}>
                            <Pencil size={16} />
                          </ActionIcon>
                          <ActionIcon
                            color="red"
                            onClick={() => handleDelete(p.id)}
                          >
                            <Trash size={16} />
                          </ActionIcon>
                        </>
                      )}
                    </Group>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Card>

      {/* 🔹 Pagination */}
      {totalPages > 1 && (
        <Flex justify="center" mt="md">
          <Pagination
            total={totalPages}
            value={currentPage}
            onChange={setCurrentPage}
          />
        </Flex>
      )}
    </div>
  );
}
