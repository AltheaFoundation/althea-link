import { ThemeCustomizationProps } from "@cosmos-kit/react";

export const modalThemeOverrides: ThemeCustomizationProps = {
  modalContentStyles: {
    backgroundColor: "#001833",
    opacity: 1,
  },
  overrides: {
    "connect-modal": {
      bg: {
        light: "rgba(0, 0, 0, 0)",
        dark: "rgba(32, 32, 32, 0)",
      },
      activeBg: {
        light: "rgba(0, 0, 0, 0)",
        dark: "rgba(255, 255, 255, 0.9)",
      },
      color: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
      focusedBg: {
        light: "rgba(0, 0, 0, 0)",
        dark: "rgba(32, 32, 32, 0)",
      },
      disabledBg: {
        light: "rgba(0, 0, 0, 0)",
        dark: "rgba(32, 32, 32, 0)",
      },
    },

    "clipboard-copy-text": {
      bg: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
    },
    "connect-modal-qr-code-shadow": {
      bg: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
    },
    button: {
      bg: {
        light: "#1c508c",
        dark: "#1c508c",
      },
    },
    "connect-modal-head-title": {
      bg: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
    },
    "connect-modal-wallet-button-label": {
      bg: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
    },
    "connect-modal-wallet-button-sublogo": {
      bg: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
    },
    "connect-modal-qr-code-loading": {
      bg: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
    },
    "connect-modal-wallet-button": {
      bg: {
        light: "rgba(45, 47, 61, 0.9)",
        dark: "rgba(45, 47, 61, 0.9)",
      },
      hoverBg: {
        light: "#1c508c",
        dark: "#1c508c",
      },
      borderColor: { light: "black", dark: "black" },
      hoverBorderColor: {
        light: "black",
        dark: "black",
      },
      activeBorderColor: {
        light: "#FFFFFF",
        dark: "#FFFFFF",
      },
      color: {
        light: "#ffffff",
        dark: "#FFFFFF",
      },
      focusedBorderColor: { light: "#FFFFFF", dark: "#FFFFFF" },
    },
    "connect-modal-qr-code": {
      bg: {
        light: "#add3ff",
        dark: "#0077ff",
      },
      color: {
        light: "#0077ff",
        dark: "#add3ff",
      },
    },
    "connect-modal-install-button": {
      bg: {
        light: "#F0F0F0",
        dark: "#fcfcfc",
      },
    },
    "connect-modal-qr-code-error": {
      bg: {
        light: "#FFEEEE",
        dark: "#FFFFFF",
      },
    },
    "connect-modal-qr-code-error-button": {
      bg: {
        light: "#FFCCCC",
        dark: "#552222",
      },
    },
  },
};
