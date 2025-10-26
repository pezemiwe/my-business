/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import {
  AppShell,
  Burger,
  Group,
  Button,
  Text,
  Image,
  ScrollArea,
  Flex,
} from "@mantine/core";
import { useDisclosure } from "@mantine/hooks";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess } from "@/lib/notifications";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [opened, { toggle, close }] = useDisclosure();
  const pathname = usePathname();
  const router = useRouter();
  const [displayName, setDisplayName] = useState<string>("User");

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

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.removeItem("display_name");
      showSuccess("You've been logged out safely.");
      router.replace("/login");
      close();
    } catch (err: any) {
      console.error("Logout failed:", err.message);
    }
  };

  const navLinks = [
    { label: "📊 Dashboard", href: "/dashboard" },
    { label: "🛍️ Products", href: "/dashboard/products" },
    { label: "💰 Sales", href: "/dashboard/sales" },
    { label: "📦 Purchases", href: "/dashboard/purchases" },
    { label: "💸 Expenses", href: "/dashboard/expenses" },
    { label: "📈 Reports", href: "/dashboard/reports" },
  ];

  const handleNavClick = () => {
    close();
  };

  return (
    <AppShell
      header={{ height: 60 }}
      navbar={{
        width: 240,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
      styles={(theme) => ({
        main: {
          backgroundColor: theme.colors.gray[0],
          minHeight: "100vh",
        },
        navbar: {
          backgroundColor: theme.white,
          borderRight: `1px solid ${theme.colors.gray[3]}`,
        },
        header: {
          borderBottom: `1px solid ${theme.colors.gray[3]}`,
          backgroundColor: theme.white,
        },
      })}
    >
      <AppShell.Header>
        <Flex justify="space-between" align="center" px="md" h="100%">
          <Flex align="center" gap="xs">
            <Flex>
              <Image
                src="/logo.svg"
                alt="My Business Logo"
                width={40}
                height={40}
              />
            </Flex>
            <Text fw={700} size="lg" c="brand.7">
              My Business
            </Text>
          </Flex>

          <Group gap="sm">
            <Text size="sm" fw={600} c="brand.8" hiddenFrom="sm">
              {displayName}
            </Text>
            <Burger
              opened={opened}
              onClick={toggle}
              hiddenFrom="sm"
              size="sm"
              color="black"
            />
            <Group gap="sm" visibleFrom="sm">
              <Text size="sm" fw={600} c="brand.8">
                {displayName}
              </Text>
              <Button
                variant="outline"
                c="brand.6"
                size="xs"
                onClick={handleLogout}
              >
                Logout
              </Button>
            </Group>
          </Group>
        </Flex>
      </AppShell.Header>

      <AppShell.Navbar p="md" component={ScrollArea}>
        <nav className="flex flex-col gap-2">
          {navLinks.map((link) => {
            const active = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                prefetch
                onClick={handleNavClick}
                style={{
                  textDecoration: "none",
                  backgroundColor: active
                    ? "rgb(219, 234, 254)"
                    : "transparent",
                  color: active ? "rgb(30, 58, 138)" : "rgb(55, 65, 81)",
                  fontWeight: active ? 600 : 500,
                }}
                className="text-sm flex items-center gap-2 px-3 py-2 rounded-md transition-colors hover:bg-blue-100 hover:text-blue-800"
              >
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6 pt-4 border-t border-gray-200 md:hidden">
          <Button
            fullWidth
            variant="outline"
            c="brand.6"
            size="sm"
            onClick={handleLogout}
            hiddenFrom="md"
          >
            Logout
          </Button>
        </div>
      </AppShell.Navbar>

      <AppShell.Main
        style={{
          paddingLeft: 0,
          paddingRight: 0,
        }}
      >
        {children}
      </AppShell.Main>
    </AppShell>
  );
}
