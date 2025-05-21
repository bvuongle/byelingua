"use client"

import { createTheme } from "@mui/material/styles"

export const getMuiTheme = (mode: "light" | "dark") =>
  createTheme({
    palette: {
      mode,
      ...(mode === "light"
        ? {
            primary: { main: "#009688" },
            background: { default: "#fff", paper: "#fff" },
          }
        : {
            primary: { main: "#009688" },
            background: { default: "#121212", paper: "#121212" },
          }),
    },
    typography: {
      fontFamily: "inherit", // to inherit from Chakra or Tailwind if needed
    },
    components: {
      MuiButton: {
        defaultProps: {
          disableElevation: true,
        },
      },
    },
  })
