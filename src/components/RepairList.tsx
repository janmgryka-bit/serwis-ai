import { useMemo, type KeyboardEvent } from "react";
import { Badge, Box, Button, Container, Group, Paper, Text, Title } from "@mantine/core";
import { useMediaQuery } from "@mantine/hooks";
import { MantineReactTable, useMantineReactTable, type MRT_ColumnDef } from "mantine-react-table";
import type { Repair, RepairStatus } from "../types/repair";
import { REPAIR_STATUS_LABELS } from "../types/repair";

type RepairListProps = {
  repairs: Repair[];
  onNewRepair: () => void;
  onSelectRepair: (repair: Repair) => void;
};

function statusBadgeColor(status: RepairStatus) {
  switch (status) {
    case "nowa":
      return "gray";
    case "diagnoza":
      return "yellow";
    case "w naprawie":
      return "teal";
    case "gotowa":
      return "green";
    case "wydana":
      return "dark";
    default:
      return "gray";
  }
}

export function RepairList({ repairs, onNewRepair, onSelectRepair }: RepairListProps) {
  const isNarrow = useMediaQuery("(max-width: 720px)");

  const columns = useMemo<MRT_ColumnDef<Repair>[]>(
    () => [
      {
        accessorKey: "id",
        header: "ID",
        enableSorting: false,
        size: 108,
        Cell: ({ row }) => (
          <Text size="sm" ff="monospace" c="teal.4" truncate title={row.original.id}>
            {row.original.id.slice(0, 8)}…
          </Text>
        ),
      },
      {
        accessorKey: "device_type",
        header: "Typ",
        enableSorting: false,
        size: 130,
      },
      {
        accessorKey: "brand",
        header: "Marka",
        enableSorting: false,
        size: 120,
      },
      {
        accessorKey: "model",
        header: "Model",
        enableSorting: false,
        size: 160,
      },
      {
        accessorKey: "motherboard",
        header: "Płyta",
        enableSorting: false,
        size: 160,
        Cell: ({ cell }) => (
          <Text size="sm" c="dimmed" style={{ whiteSpace: "nowrap" }}>
            {(cell.getValue() as string) || "—"}
          </Text>
        ),
      },
      {
        accessorKey: "symptom",
        header: "Objaw",
        enableSorting: false,
        minSize: 220,
        maxSize: 420,
        mantineTableBodyCellProps: {
          style: {
            verticalAlign: "top",
            wordBreak: "normal",
            overflowWrap: "break-word",
          },
        },
        Cell: ({ cell }) => (
          <Text size="sm" lineClamp={2} style={{ wordBreak: "normal", overflowWrap: "break-word" }}>
            {String(cell.getValue() ?? "")}
          </Text>
        ),
      },
      {
        accessorKey: "status",
        header: "Status",
        enableSorting: false,
        size: 130,
        Cell: ({ row }) => (
          <Badge variant="light" color={statusBadgeColor(row.original.status)} size="sm">
            {REPAIR_STATUS_LABELS[row.original.status]}
          </Badge>
        ),
      },
    ],
    [],
  );

  const table = useMantineReactTable({
    columns,
    data: repairs,
    getRowId: (row) => row.id,
    enableColumnActions: false,
    enableColumnFilters: false,
    enableDensityToggle: false,
    enableFilters: false,
    enableFullScreenToggle: false,
    enableGlobalFilter: false,
    enableHiding: false,
    enablePagination: false,
    enableSorting: false,
    enableTopToolbar: false,
    enableBottomToolbar: false,
    layoutMode: "grid",
    mantinePaperProps: {
      shadow: "md",
      withBorder: true,
      radius: "md",
      p: isNarrow ? "xs" : "sm",
    },
    mantineTableProps: {
      highlightOnHover: true,
      horizontalSpacing: isNarrow ? "xs" : "sm",
      verticalSpacing: isNarrow ? "xs" : "sm",
    },
    mantineTableContainerProps: {
      style: { overflowX: "auto" },
    },
    mantineTableBodyRowProps: ({ row }) => ({
      tabIndex: 0,
      role: "button",
      "aria-label": `Szczegóły naprawy ${row.original.brand} ${row.original.model}`,
      style: { cursor: "pointer" },
      onClick: () => onSelectRepair(row.original),
      onKeyDown: (e: KeyboardEvent<HTMLTableRowElement>) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelectRepair(row.original);
        }
      },
    }),
  });

  return (
    <Box style={{ width: "100%", minWidth: 0 }}>
      <Container size="xl" px={{ base: "sm", sm: "md" }}>
        <Paper withBorder shadow="sm" p="md" radius="md" mb="md">
          <Group justify="space-between" align="flex-end" wrap="wrap" gap="md">
            <Box>
              <Title order={3} size="h4">
                Naprawy
              </Title>
              <Text size="sm" c="dimmed" ff="monospace" mt={4}>
                {repairs.length} pozycji
              </Text>
            </Box>
            <Button onClick={onNewRepair}>Nowa naprawa</Button>
          </Group>
        </Paper>

        {repairs.length === 0 ? (
          <Paper withBorder p="xl" radius="md">
            <Text ta="center" c="dimmed">
              Brak napraw. Dodaj pierwszą pozycję.
            </Text>
          </Paper>
        ) : (
          <MantineReactTable table={table} />
        )}
      </Container>
    </Box>
  );
}
