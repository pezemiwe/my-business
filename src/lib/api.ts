import { supabase } from "./supabaseClient";

export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    ...(session?.access_token && {
      Authorization: `Bearer ${session.access_token}`,
    }),
    ...options.headers,
  };

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  return response;
}
