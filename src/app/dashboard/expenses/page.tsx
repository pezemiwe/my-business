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
  Center,
  Select,
  Grid,
  ThemeIcon,
  Badge,
} from "@mantine/core";
import { showSuccess, showError } from "@/lib/notifications";
import {
  Pencil,
  Trash,
  Check,
  X,
  Plus,
  Wallet,
  TrendingDown,
  AlertCircle,
} from "lucide-react";
import { useDisclosure } from "@mantine/hooks";

interface Expense {
  id: string;
  description: string;
  amount: number;
  expense_date: string;
  category_id: number | null;
  category_name?: string;
  created_at: string;
}

interface ExpenseCategory {
  id: number;
  name: string;
}

interface ExpensesStats {
  totalExpenses: number;
  totalTransactions: number;
  averageExpense: number;
  todayExpenses: number;
}

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Expense>>({});
  const [loading, setLoading] = useState(false);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number | undefined>();
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [expenseDate, setExpenseDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [opened, { open, close }] = useDisclosure(false);
  const [
    categoryModalOpened,
    { open: openCategoryModal, close: closeCategoryModal },
  ] = useDisclosure(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [
    deleteModalOpened,
    { open: openDeleteModal, close: closeDeleteModal },
  ] = useDisclosure(false);
  const [expenseToDelete, setExpenseToDelete] = useState<{
    id: string;
    description: string;
  } | null>(null);
  const [stats, setStats] = useState<ExpensesStats>({
    totalExpenses: 0,
    totalTransactions: 0,
    averageExpense: 0,
    todayExpenses: 0,
  });
  const [dateFilter, setDateFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);

  const itemsPerPage = 8;

  const calculateStats = (data: Expense[]) => {
    const today = new Date().toISOString().split("T")[0];
    const todayExpenses = data
      .filter((e) => e.expense_date === today)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    const totalExpenses = data.reduce((sum, e) => sum + (e.amount || 0), 0);

    return {
      totalExpenses,
      totalTransactions: data.length,
      averageExpense: data.length > 0 ? totalExpenses / data.length : 0,
      todayExpenses,
    };
  };

  useEffect(() => {
    const fetchData = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: catData, error: catError } = await supabase
        .from("expense_categories")
        .select("id, name")
        .eq("user_id", user.id)
        .order("name", { ascending: true });

      if (catError) showError(catError.message);
      else setCategories(catData || []);

      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select(
          `
          id,
          description,
          amount,
          expense_date,
          category_id,
          created_at
        `
        )
        .eq("user_id", user.id)
        .order("expense_date", { ascending: false });

      if (expenseError) {
        showError(expenseError.message);
        return;
      }

      const formattedData = (expenseData || []).map((expense: any) => {
        const category = (catData || []).find(
          (c) => c.id === expense.category_id
        );
        return {
          ...expense,
          category_name: category?.name || "Uncategorized",
        };
      });

      setExpenses(formattedData);
      setStats(calculateStats(formattedData));
    };

    fetchData();
  }, []);

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) {
      showError("Category name is required");
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase.from("expense_categories").insert([
      {
        name: newCategoryName,
        user_id: user.id,
      },
    ]);

    if (error) return showError(error.message);

    showSuccess("Category added successfully");
    setNewCategoryName("");
    closeCategoryModal();

    const { data: catData, error: catError } = await supabase
      .from("expense_categories")
      .select("id, name")
      .eq("user_id", user.id)
      .order("name", { ascending: true });

    if (!catError) {
      setCategories(catData || []);
    }
  };

  const filtered = useMemo(() => {
    let result = expenses;

    if (search.trim()) {
      const query = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.description.toLowerCase().includes(query) ||
          e.amount.toString().includes(query) ||
          e.category_name?.toLowerCase().includes(query)
      );
    }

    if (dateFilter) {
      result = result.filter((e) => e.expense_date === dateFilter);
    }

    if (categoryFilter) {
      result = result.filter((e) => e.category_id === parseInt(categoryFilter));
    }

    return result;
  }, [search, expenses, dateFilter, categoryFilter]);

  const start = (currentPage - 1) * itemsPerPage;
  const paginated = filtered.slice(start, start + itemsPerPage);
  const totalPages = Math.ceil(filtered.length / itemsPerPage);

  const handleAdd = async () => {
    if (!description.trim() || amount === undefined) {
      showError("Description and amount are required");
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

    const { error } = await supabase.from("expenses").insert({
      description,
      amount,
      expense_date: expenseDate,
      category_id: categoryId ? parseInt(categoryId) : null,
      user_id: user.id,
    });

    setLoading(false);
    if (error) return showError(error.message);

    showSuccess("Expense recorded successfully");
    setDescription("");
    setAmount(undefined);
    setCategoryId(null);
    setExpenseDate(new Date().toISOString().split("T")[0]);
    setCurrentPage(1);
    close();

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select(
          `
          id,
          description,
          amount,
          expense_date,
          category_id,
          created_at
        `
        )
        .eq("user_id", currentUser.id)
        .order("expense_date", { ascending: false });

      if (!expenseError) {
        const formattedData = (expenseData || []).map((expense: any) => {
          const category = categories.find((c) => c.id === expense.category_id);
          return {
            ...expense,
            category_name: category?.name || "Uncategorized",
          };
        });
        setExpenses(formattedData);
        setStats(calculateStats(formattedData));
      }
    }
  };

  const openDeleteConfirm = (id: string) => {
    const expense = expenses.find((e) => e.id === id);
    if (expense) {
      setExpenseToDelete({ id, description: expense.description });
      openDeleteModal();
    }
  };

  const handleDelete = async () => {
    if (!expenseToDelete) return;

    const { error } = await supabase
      .from("expenses")
      .delete()
      .eq("id", expenseToDelete.id);
    if (error) {
      showError(error.message);
    } else {
      showSuccess("Expense deleted successfully");
      setExpenses(expenses.filter((e) => e.id !== expenseToDelete.id));
    }

    closeDeleteModal();
    setExpenseToDelete(null);
  };

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id);
    setEditData({ ...expense });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditData({});
  };

  const saveEdit = async () => {
    if (!editingId) return;

    const { error } = await supabase
      .from("expenses")
      .update({
        description: editData.description,
        amount: editData.amount,
        expense_date: editData.expense_date,
        category_id: editData.category_id,
      })
      .eq("id", editingId);

    if (error) return showError(error.message);

    showSuccess("Expense updated");
    setEditingId(null);
    setEditData({});

    const {
      data: { user: currentUser },
    } = await supabase.auth.getUser();
    if (currentUser) {
      const { data: expenseData, error: expenseError } = await supabase
        .from("expenses")
        .select(
          `
          id,
          description,
          amount,
          expense_date,
          category_id,
          created_at
        `
        )
        .eq("user_id", currentUser.id)
        .order("expense_date", { ascending: false });

      if (!expenseError) {
        const formattedData = (expenseData || []).map((expense: any) => {
          const category = categories.find((c) => c.id === expense.category_id);
          return {
            ...expense,
            category_name: category?.name || "Uncategorized",
          };
        });
        setExpenses(formattedData);
        setStats(calculateStats(formattedData));
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

  return (
    <Container size="lg" py="xs">
      <Stack gap="lg">
        <Flex justify="space-between" align="center">
          <Title order={2}>💸 Expenses</Title>
          <Group gap="sm">
            <Button
              variant="outline"
              onClick={openCategoryModal}
              leftSection={<Plus size={16} />}
            >
              Add Category
            </Button>
            <Button onClick={open} leftSection={<Plus size={16} />}>
              Record Expense
            </Button>
          </Group>
        </Flex>

        {/* Stats Cards */}
        <Grid>
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
                    Transactions
                  </Text>
                  <Text fw={700} size="lg">
                    {stats.totalTransactions}
                  </Text>
                </Stack>
                <ThemeIcon color="orange" variant="light" size="lg" radius="md">
                  <Wallet size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" radius="md">
              <Flex justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    Average Expense
                  </Text>
                  <Text fw={700} size="lg">
                    ₦
                    {stats.averageExpense.toLocaleString("en-NG", {
                      maximumFractionDigits: 0,
                    })}
                  </Text>
                </Stack>
                <ThemeIcon color="yellow" variant="light" size="lg" radius="md">
                  <AlertCircle size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
            <Card withBorder p="md" radius="md">
              <Flex justify="space-between" align="flex-start">
                <Stack gap={4}>
                  <Text size="sm" fw={600} c="dimmed">
                    Today&apos;s Expenses
                  </Text>
                  <Text fw={700} size="lg">
                    ₦{stats.todayExpenses.toLocaleString()}
                  </Text>
                </Stack>
                <ThemeIcon color="grape" variant="light" size="lg" radius="md">
                  <Wallet size={20} />
                </ThemeIcon>
              </Flex>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Add Category Modal */}
        <Modal
          opened={categoryModalOpened}
          onClose={closeCategoryModal}
          title="Add Expense Category"
          centered
        >
          <Stack gap="md">
            <TextInput
              label="Category Name"
              placeholder="e.g., Utilities, Office Supplies"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={closeCategoryModal}>
                Cancel
              </Button>
              <Button onClick={handleAddCategory}>Add Category</Button>
            </Group>
          </Stack>
        </Modal>

        {/* Add Expense Modal */}
        <Modal
          opened={opened}
          onClose={close}
          title="Record New Expense"
          centered
        >
          <Stack gap="md">
            <TextInput
              label="Description"
              placeholder="e.g., Office rent"
              value={description}
              onChange={(e) => setDescription(e.currentTarget.value)}
            />
            <Select
              label="Category"
              placeholder="Select a category"
              data={categories.map((c) => ({
                value: c.id.toString(),
                label: c.name,
              }))}
              value={categoryId}
              onChange={setCategoryId}
              searchable
              clearable
            />
            <NumberInput
              label="Amount"
              placeholder="₦0"
              value={amount}
              hideControls
              onChange={(val) =>
                setAmount(typeof val === "number" ? val : undefined)
              }
            />
            <TextInput
              label="Date"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.currentTarget.value)}
            />
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={close}>
                Cancel
              </Button>
              <Button onClick={handleAdd} loading={loading}>
                Record Expense
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Filters */}
        <Flex
          direction={{ base: "column", sm: "row" }}
          justify="space-between"
          align={{ base: "flex-start", sm: "center" }}
          gap="md"
        >
          <TextInput
            placeholder="Search by description..."
            value={search}
            onChange={(e) => setSearch(e.currentTarget.value)}
            style={{ flex: 1 }}
            w="100%"
          />
          <Select
            placeholder="Filter by category"
            data={categories.map((c) => ({
              value: c.id.toString(),
              label: c.name,
            }))}
            value={categoryFilter}
            onChange={setCategoryFilter}
            clearable
            w={{ base: "100%", sm: 200 }}
          />
          <TextInput
            placeholder="Filter by date"
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.currentTarget.value)}
            w={{ base: "100%", sm: "auto" }}
          />
          <Text c="dimmed" size="sm">
            {filtered.length} expenses
          </Text>
        </Flex>

        {/* Expenses Table */}
        <Card withBorder px="0" pt="0">
          {filtered.length === 0 ? (
            <Center py="xl">
              <Stack align="center" gap="xs">
                <Wallet size={40} strokeWidth={1.2} color="gray" />
                <Text fw={600}>No Expenses Yet</Text>
                <Text size="sm" c="dimmed" ta="center">
                  Record your first expense to see it appear here.
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
                    <th style={{ ...thStyle, fontWeight: 700 }}>S/N</th>
                    <th style={thStyle}>Description</th>
                    <th style={thStyle}>Category</th>
                    <th style={thStyle}>Amount</th>
                    <th style={thStyle}>Date</th>
                    <th style={thStyle}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((expense, i) => (
                    <tr key={expense.id} style={{ height: 48 }}>
                      <td style={{ ...tdStyle, fontWeight: 600 }}>{i + 1}</td>
                      <td style={{ ...tdStyle, textAlign: "left" }}>
                        {editingId === expense.id ? (
                          <TextInput
                            value={editData.description || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                description: e.currentTarget.value,
                              })
                            }
                            size="xs"
                          />
                        ) : (
                          expense.description
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === expense.id ? (
                          <Select
                            value={editData.category_id?.toString() || null}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                category_id: val ? parseInt(val) : null,
                              })
                            }
                            data={categories.map((c) => ({
                              value: c.id.toString(),
                              label: c.name,
                            }))}
                            size="xs"
                            searchable
                            clearable
                          />
                        ) : (
                          <Badge variant="light" size="sm">
                            {expense.category_name}
                          </Badge>
                        )}
                      </td>
                      <td
                        style={{
                          ...tdStyle,
                          fontWeight: 600,
                          color: "#dc2626",
                        }}
                      >
                        {editingId === expense.id ? (
                          <NumberInput
                            value={editData.amount || 0}
                            onChange={(val) =>
                              setEditData({
                                ...editData,
                                amount:
                                  typeof val === "number"
                                    ? val
                                    : expense.amount,
                              })
                            }
                            size="xs"
                            hideControls
                          />
                        ) : (
                          `₦${expense.amount.toLocaleString()}`
                        )}
                      </td>
                      <td style={tdStyle}>
                        {editingId === expense.id ? (
                          <TextInput
                            type="date"
                            value={editData.expense_date || ""}
                            onChange={(e) =>
                              setEditData({
                                ...editData,
                                expense_date: e.currentTarget.value,
                              })
                            }
                            size="xs"
                          />
                        ) : (
                          new Date(expense.expense_date).toLocaleDateString()
                        )}
                      </td>
                      <td style={tdStyle}>
                        <Group gap="xs" justify="center">
                          {editingId === expense.id ? (
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
                                onClick={() => startEdit(expense)}
                                size="sm"
                              >
                                <Pencil size={16} />
                              </ActionIcon>
                              <ActionIcon
                                color="red"
                                onClick={() => openDeleteConfirm(expense.id)}
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

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteModalOpened}
          onClose={closeDeleteModal}
          title="Delete Expense"
          centered
        >
          <Stack gap="lg">
            <Text>
              {`Are you sure you want to delete this expense "${expenseToDelete?.description}"? This action cannot be undone.`}
            </Text>
            <Group justify="flex-end" gap="sm">
              <Button variant="outline" onClick={closeDeleteModal}>
                Cancel
              </Button>
              <Button color="red" onClick={handleDelete}>
                Delete Expense
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Pagination */}
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
