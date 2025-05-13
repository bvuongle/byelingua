import {
    Box,
    Button,
    Container,
    Flex,
    Heading,
    HStack,
    Input,
    Kbd,
    Spinner,
    Text,
} from "@chakra-ui/react"
import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"

import { type ShortcutsPublic } from "@/client"
import { Field } from "../ui/field"
import useCustomToast from "@/hooks/useCustomToast"
import { useShortcuts } from "@/hooks/useShortcuts"

const isModifier = (k: string) =>
    ["Control", "Shift", "Alt", "Meta"].includes(k)

const prettifyKey = (k: string) => {
    switch (k) {
        case " ":          return "Space"
        case "ArrowLeft":  return "←"
        case "ArrowRight": return "→"
        case "ArrowUp":    return "↑"
        case "ArrowDown":  return "↓"
        case "Meta":       return "Cmd"
        default:
            return k.length === 1 ? k.toUpperCase() : k[0].toUpperCase() + k.slice(1)
    }
}

// 2️⃣  display component for non-edit mode
const ShortcutDisplay = ({ value }: { value?: string | null }) => {
    if (!value) return <Text py={2}>N/A</Text>

    const tokens = value
        .split(/\s*\+\s*/)        // split on “+”
        .map((t) => t.trim())
        .filter(Boolean)

    return (
        <HStack gap="2" py={2}>
            {tokens.map((t) => (
                <Kbd key={t} size="sm">
                    {t}
                </Kbd>
            ))}
        </HStack>
    )
}

const ShortcutsSettings = () => {
    const { showSuccessToast } = useCustomToast()

    const {
        shortcuts,
        isLoading,
        saveShortcuts,
        resetShortcuts,
        isSaving,
        isResetting,
    } = useShortcuts()

    const [editMode, setEditMode] = useState(false)

    const {
        register,
        setValue,
        watch,
        handleSubmit,
        reset,
        formState: { isDirty },
    } = useForm<ShortcutsPublic>({
        mode: "onBlur",
        defaultValues: {
            skip: "",
            accept: "",
            accept_and_next: "",
            previous: "",
        },
    })

    useEffect(() => {
        reset({
            skip: shortcuts.skip ?? "",
            accept: shortcuts.accept ?? "",
            accept_and_next: shortcuts.accept_and_next ?? "",
            previous: shortcuts.previous ?? "",
        })
    }, [shortcuts, reset])

    const capture = (
        e: React.KeyboardEvent<HTMLInputElement>,
        field: keyof ShortcutsPublic,
    ) => {
        e.preventDefault()
        e.stopPropagation()

        if (e.key === "Backspace" || e.key === "Delete") {
            setValue(field, "", { shouldDirty: true })
            return
        }

        if (isModifier(e.key)) return

        const combo: string[] = []
        if (e.ctrlKey || e.metaKey) combo.push("Ctrl")
        if (e.altKey) combo.push("Alt")
        if (e.shiftKey) combo.push("Shift")
        combo.push(prettifyKey(e.key))

        setValue(field, combo.join(" + "), { shouldDirty: true })
    }

    const onSave = handleSubmit((data) =>
        saveShortcuts(data, {
            onSuccess: () => {
                showSuccessToast("Shortcuts saved successfully")
                setEditMode(false)
            },
        }),
    )

    const onReset = () =>
        resetShortcuts(undefined, {
            onSuccess: () => {
                showSuccessToast("Shortcuts reset to default")
                setEditMode(false)
            },
        })

    const onCancel = () => {
        reset()
        setEditMode(false)
    }

    if (isLoading && !editMode)
        return (
            <Flex justify="center" align="center" py={12}>
                <Spinner />
            </Flex>
        )

    const renderInput = (
        field: keyof ShortcutsPublic,
        placeholder = "press shortcut",
    ) => {
        const { ref, name, onBlur } = register(field)
        return (
            <Input
                ref={ref}
                name={name}
                onBlur={onBlur}
                readOnly
                value={watch(field) || ""}
                placeholder={placeholder}
                onKeyDown={(e) => capture(e, field)}
            />
        )
    }

    return (
        <Container maxW="full">
            <Heading size="sm" py={4}>
                Keyboard Shortcuts
            </Heading>

            <Box w={{ sm: "full", md: "sm" }} as="form" onSubmit={(e) => e.preventDefault()}>
                {/* Skip */}
                <Field label="Skip">
                    {editMode ? renderInput("skip") : <ShortcutDisplay value={shortcuts.skip} />}
                </Field>

                {/* Accept */}
                <Field mt={4} label="Accept">
                    {editMode ? renderInput("accept") : <ShortcutDisplay value={shortcuts.accept} />}
                </Field>

                {/* Accept & Next */}
                <Field mt={4} label="Accept & Next">
                    {editMode
                        ? renderInput("accept_and_next")
                        : <ShortcutDisplay value={shortcuts.accept_and_next} />}
                </Field>

                {/* Previous */}
                <Field mt={4} label="Previous">
                    {editMode ? renderInput("previous") : <ShortcutDisplay value={shortcuts.previous} />}
                </Field>

                {/* buttons */}
                <Flex mt={6} gap={3}>
                    {editMode ? (
                        <Button
                            variant="solid"
                            onClick={onSave}
                            loading={isSaving}
                            disabled={!isDirty}
                        >
                            Save
                        </Button>
                    ) : (
                        <Button variant="solid" onClick={() => setEditMode(true)}>
                            Edit
                        </Button>
                    )}

                    {editMode && (
                        <>
                            <Button
                                variant="subtle"
                                colorPalette="gray"
                                onClick={onCancel}
                                disabled={isSaving}
                            >
                                Cancel
                            </Button>
                            <Button
                                variant="outline"
                                colorScheme="red"
                                onClick={onReset}
                                loading={isResetting}
                            >
                                Reset
                            </Button>
                        </>
                    )}
                </Flex>
            </Box>
        </Container>
    )
}

export default ShortcutsSettings
