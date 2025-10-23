import { MantineProvider, createTheme } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "../app/globals.css";

const theme = createTheme({
  fontFamily: "Inter, system-ui, sans-serif",
  colors: {
    brand: [
      "#E3F2FF",
      "#B3DAFF",
      "#81C2FF",
      "#4EA9FF",
      "#1C91FF",
      "#0078E6",
      "#0060B4",
      "#004882",
      "#003150",
      "#001A21",
    ],
  },
  primaryColor: "brand",
});

export const metadata = {
  title: "My Business Dashboard",
  description: "Track sales, purchases, and profits easily.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <MantineProvider theme={theme}>
          <Notifications position="top-right" />
          {children}
        </MantineProvider>
      </body>
    </html>
  );
}
