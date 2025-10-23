/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { useState } from "react";
import {
  TextInput,
  PasswordInput,
  Button,
  Text,
  Anchor,
  Stack,
  Group,
} from "@mantine/core";
import { Check } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { showSuccess, showError } from "@/lib/notifications";

const validateEmail = (email: string): boolean =>
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePassword = (password: string): boolean => password.length >= 8;
const validatePhone = (phone: string): boolean =>
  /^[\d\s+\-()]+$/.test(phone) && phone.replace(/\D/g, "").length >= 10;
const validateName = (name: string): boolean => name.trim().length >= 2;

export default function SignupPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const nameError =
    displayName && !validateName(displayName)
      ? "Name must be at least 2 characters"
      : "";
  const phoneError =
    phone && !validatePhone(phone) ? "Invalid phone number format" : "";
  const emailError =
    email && !validateEmail(email) ? "Invalid email format" : "";
  const passwordError =
    password && !validatePassword(password)
      ? "Password must be at least 8 characters"
      : "";

  const isSignupValid =
    displayName &&
    phone &&
    email &&
    password &&
    !nameError &&
    !phoneError &&
    !emailError &&
    !passwordError;

  const handleSignup = async () => {
    if (!isSignupValid) return;
    setLoading(true);

    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            display_name: displayName,
            phone,
          },
          emailRedirectTo: `${window.location.origin}/login`, // optional
        },
      });

      if (error) throw error;

      showSuccess(
        "Account created successfully! Check your email to confirm your account.",
        "Signup Successful 🎉"
      );

      router.push("/login");
    } catch (err: any) {
      console.error("Signup error:", err.message);
      showError(err.message || "Something went wrong", "Signup Failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Stack>
      <TextInput
        label="Full Name"
        placeholder="John Doe"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
        error={nameError}
        rightSection={
          displayName && !nameError ? <Check size={16} color="green" /> : null
        }
      />
      <TextInput
        label="Phone Number"
        placeholder="+234 812 345 6789"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        error={phoneError}
        rightSection={
          phone && !phoneError ? <Check size={16} color="green" /> : null
        }
      />
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
        description="Must be at least 8 characters"
      />

      <Button
        fullWidth
        mt="md"
        loading={loading}
        onClick={handleSignup}
        disabled={!isSignupValid}
      >
        Sign Up
      </Button>

      <Group justify="center">
        <Text size="sm">
          Already have an account?{" "}
          <Anchor href="/login" size="sm" c="brand.6">
            Sign In
          </Anchor>
        </Text>
      </Group>
    </Stack>
  );
}
