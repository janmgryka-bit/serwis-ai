import React from "react";
import ReactDOM from "react-dom/client";
import { MantineProvider, createTheme } from "@mantine/core";
import { DatesProvider } from "@mantine/dates";
import dayjs from "dayjs";
import "dayjs/locale/pl";
import "@mantine/core/styles.css";
import "@mantine/dates/styles.css";
import "mantine-react-table/styles.css";
import App from "./App";

dayjs.locale("pl");

const theme = createTheme({
  primaryColor: "teal",
  defaultRadius: "md",
});

ReactDOM.createRoot(document.getElementById("root") as HTMLElement).render(
  <React.StrictMode>
    <MantineProvider defaultColorScheme="dark" theme={theme}>
      <DatesProvider settings={{ locale: "pl", firstDayOfWeek: 1 }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </React.StrictMode>,
);
