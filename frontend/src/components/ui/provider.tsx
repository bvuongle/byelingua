"use client"

import { ChakraProvider } from "@chakra-ui/react"
import React, { type PropsWithChildren } from "react"
import { system } from "../../theme"
import { ColorModeProvider, useColorMode } from "./color-mode"
import { Toaster } from "./toaster"
import { ThemeProvider as MuiThemeProvider, CssBaseline } from "@mui/material"
import { getMuiTheme } from "@/mui-theme"

function MuiThemeWrapper({ children }: PropsWithChildren) {
    const { colorMode } = useColorMode()
    const muiTheme = getMuiTheme(colorMode)

    return (
        <MuiThemeProvider theme={muiTheme}>
            <CssBaseline />
            {children}
        </MuiThemeProvider>
    )
}

export function CustomProvider(props: PropsWithChildren) {
    return (
        <ChakraProvider value={system}>
            <ColorModeProvider defaultTheme="light">
                <MuiThemeWrapper>{props.children}</MuiThemeWrapper>
            </ColorModeProvider>
            <Toaster />
        </ChakraProvider>
    )
}
