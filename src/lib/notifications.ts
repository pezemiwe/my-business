"use client";

import { notifications } from "@mantine/notifications";

export function showSuccess(message: string, title = "Success") {
  notifications.show({
    title,
    message,
    color: "green",
    withCloseButton: true,
  });
}

export function showError(message: string, title = "Error") {
  notifications.show({
    title,
    message,
    color: "red",
    withCloseButton: true,
  });
}

export function showInfo(message: string, title = "Info") {
  notifications.show({
    title,
    message,
    color: "blue",
    withCloseButton: true,
  });
}

export function showWarning(message: string, title = "Warning") {
  notifications.show({
    title,
    message,
    color: "yellow",
    withCloseButton: true,
  });
}
