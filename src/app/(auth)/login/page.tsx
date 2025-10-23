/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useEffect, useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Anchor,
  Stack,
} from "@mantine/core";
import { Check } from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { useUserSession } from "@/lib/useUserSession";
import { showError, showSuccess } from "@/lib/notifications";

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password: string): boolean => password.length >= 8;

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const session = useUserSession(false);

  useEffect(() => {
    if (session) router.push("/dashboard");
  }, [session, router]);

  const emailError =
    email && !validateEmail(email) ? "Invalid email format" : "";
  const passwordError =
    password && !validatePassword(password)
      ? "Password must be at least 8 characters"
      : "";

  const isLoginValid = email && password && !emailError && !passwordError;

  const handleLogin = async () => {
    if (!isLoginValid) return;

    setLoading(true);

    try {
      // Step 1: Sign in user
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      const user = data?.user;
      if (!user) throw new Error("User not found");

      // Step 2: Check if profile exists
      const { data: existingProfile, error: profileCheckError } = await supabase
        .from("profiles")
        .select("id, display_name, phone")
        .eq("id", user.id)
        .maybeSingle();

      if (profileCheckError) throw profileCheckError;

      // Step 3: If no profile, create one using user metadata
      if (!existingProfile) {
        const metaName = user.user_metadata?.display_name || "User";
        const metaPhone = user.user_metadata?.phone || null;

        const { error: insertError } = await supabase.from("profiles").insert({
          id: user.id,
          display_name: metaName,
          phone: metaPhone,
        });

        if (insertError) {
          console.warn("Profile creation error:", insertError.message);
        } else {
          localStorage.setItem("display_name", metaName);
        }
      } else {
        // Update local cache with existing name
        localStorage.setItem(
          "display_name",
          existingProfile.display_name || "User"
        );
      }

      showSuccess(
        `Welcome back, ${
          existingProfile?.display_name ||
          user.user_metadata?.display_name ||
          "User"
        }!`
      );

      router.push("/dashboard");
    } catch (err: any) {
      console.error("Login error:", err);
      showError(err.message || "Unable to sign in. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <TextInput
        label="Email"
        placeholder="you@company.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={emailError}
        rightSection={
          email && !emailError ? <Check size={16} color="green" /> : null
        }
      />
      <PasswordInput
        label="Password"
        placeholder="Your password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        error={passwordError}
        rightSection={
          password && !passwordError ? <Check size={16} color="green" /> : null
        }
      />
      <Button
        fullWidth
        mt="md"
        loading={loading}
        onClick={handleLogin}
        disabled={!isLoginValid}
      >
        Sign In
      </Button>
      <Text size="sm" ta="center">
        Don&apos;t have an account?{" "}
        <Anchor href="/signup" size="sm" c="brand.6">
          Create one
        </Anchor>
      </Text>
    </Stack>
  );
}
