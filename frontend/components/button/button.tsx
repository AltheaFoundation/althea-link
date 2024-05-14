import styles from "./button.module.scss";
import Image from "next/image";

export interface ButtonProps {
  onClick?: () => void;
  height?: "small" | "medium" | "large" | number;
  width?: "contain" | "fill" | number;
  color?: "primary" | "secondary" | "accent" | "white";
  icon?: {
    url: string;
    position: "left" | "right" | "top" | "bottom";
    size?: number;
  };
  padding?: "sm" | "md" | "lg" | number;
  fontFamily?: "macan-font" | "macan-font";
  fontSize?: "sm" | "md" | "lg" | number;
  weight?: "regular" | "bold";
  children: React.ReactNode;
  isLoading?: boolean;
  disabled?: boolean;
  shadow?: "small" | "medium" | "none";
  buttonProps?: React.JSX.IntrinsicElements["button"];
  themed?: boolean;
  minimal?: boolean;
}

const Button = (props: ButtonProps) => {
  const getHeight = () => {
    switch (props.height) {
      case "small":
        return 35;
      case "medium":
        return 46;
      case "large":
        return 56;
      case undefined:
        return 46;
      default:
        return props.height;
    }
  };

  const getFontFamily = () => {
    switch (props.fontFamily) {
      case "macan-font":
        return "var(--nm-macan)";
      default:
        return "var(--nm-plex)";
    }
  };

  const getWidth = () => {
    switch (props.width) {
      case "contain":
        return "fit-content";
      case "fill":
        return "100%";
      case undefined:
        return "fit-content";
      default:
        return props.width;
    }
  };

  const getBGColor = () => {
    if (props.minimal) {
      return "transparent";
    }
    if (props.disabled) {
      if (props.themed || props.themed == undefined) {
        return "var(--primary-10-color)";
      }
      switch (props.color) {
        case "primary":
          return "#111111";
        case "secondary":
          return "#f1f1f1";
        case "accent":
          return "var(--althea-blue)";
        case undefined:
          return "var(--primary-10-color)";
        default:
          return "var(--primary-10-color)";
      }
    }
    switch (props.color) {
      case "primary":
        return props.themed || props.themed == undefined
          ? "var(--text-dark-color)"
          : "#111111";
      case "secondary":
        return props.themed || props.themed == undefined
          ? "var(--card-surface-color)"
          : "#f1f1f1";
      case "accent":
        return props.themed || props.themed == undefined
          ? "var(--althea-blue)"
          : "var(--althea-blue)";
      case undefined:
        return "var(--text-dark-color)";
      default:
        return props.color;
    }
  };

  const getTextColor = () => {
    if (props.disabled) {
      if (props.themed || props.themed == undefined) {
        return "var(--primary-10-color)";
      }
      switch (props.color) {
        case "primary":
          return "rgb(#f1f1f1)";
        case "secondary":
          return "rgb(#111111)";
        case "accent":
          return "rgb(#212121)";
        case "white":
          return "rgb(#f1f1f1)";
        case undefined:
          return "var(--primary-10-color)";
        default:
          return "var(--primary-10-color)";
      }
    }
    switch (props.color) {
      case "primary":
        return props.themed || props.themed == undefined
          ? "var(--text-light-color)"
          : "#ffffff";
      case "secondary":
        return props.themed || props.themed == undefined
          ? "var(--text-dark-color)"
          : "#111111";
      case "accent":
        return props.themed || props.themed == undefined
          ? "var(--text-only-dark)"
          : "#212121";
      case "white":
        return "#ffffff";
      case undefined:
        return "var(--text-light-color)";
      default:
        return props.color;
    }
  };

  const getPadding = () => {
    switch (props.padding) {
      case "sm":
        return 10;
      case "md":
        return 20;
      case "lg":
        return 30;
      case undefined:
        return 20;
      default:
        return props.padding;
    }
  };

  function getFontSize() {
    switch (props.fontSize) {
      case "sm":
        return 14;
      case "md":
        return 16;
      case "lg":
        return 18;
      case undefined:
        return 16;
      default:
        return props.fontSize;
    }
  }

  function getShadow() {
    if (props.minimal) {
      return undefined;
    }
    if (props.disabled) {
      return "0px 0px 0px 0px rgba(17, 17, 17, 0.15)";
    }
    switch (props.shadow) {
      case "small":
        return "1px 1px 0px 0px rgba(17, 17, 17, 0.15)";
      case "medium":
        return "3px 3px 0px 0px rgba(17, 17, 17, 0.15)";
      case "none":
        return "0px 0px 0px 0px rgba(17, 17, 17, 0.15)";
      default:
        return "3px 3px 0px 0px rgba(17, 17, 17, 0.15)";
    }
  }

  return (
    <button
      className={`${styles.container}${props.minimal ? " minimal" : ""}`}
      onClick={props.onClick}
      disabled={props.disabled}
      style={{
        height: getHeight() + "px",
        // cursor: props.disabled ? "not-allowed" : "pointer",
        fontSize: getFontSize() + "px",
        width: getWidth(),
        backgroundColor: getBGColor(),
        padding: props.minimal ? undefined : getPadding() + "px",
        color: getTextColor(),
        fontFamily: getFontFamily(),
        gap: (() => {
          switch (props.icon?.position) {
            case "right":
              return "12px";
            case "left":
              return "12px";
            case "top":
              return "2px";
            case "bottom":
              return "2px";
            default:
              return "12px";
          }
        })(),
        fontWeight: props.weight == "bold" ? "bold" : "normal",
        boxShadow: getShadow(),
        flexDirection: (() => {
          switch (props.icon?.position) {
            case "right":
              return "row-reverse";
            case "left":
              return "row";
            case "top":
              return "column-reverse";
            case "bottom":
              return "column";
            default:
              return "row";
          }
        })(),
        textTransform: props.minimal ? "uppercase" : "none",
        letterSpacing: props.minimal ? "0.27px" : "none",
      }}
      {...props.buttonProps}
    >
      {props.icon && (
        <Image
          src={props.icon.url}
          style={{
            filter:
              props.color == "primary"
                ? "invert(var(--light-mode))"
                : props.color == "accent"
                  ? "invert(0)"
                  : "invert(var(--dark-mode))",
          }}
          alt="icon"
          width={props.icon.size || 16}
          height={props.icon.size || 16}
          className={styles.icon}
        ></Image>
      )}
      {props.children}{" "}
      {props.isLoading && (
        <Image
          style={{
            filter:
              props.color == "primary"
                ? "invert(var(--light-mode))"
                : props.color == "accent"
                  ? "invert(0)"
                  : "invert(var(--dark-mode))",
          }}
          src="/loader.svg"
          alt="loading"
          width={22}
          height={22}
          className={styles.loader}
        ></Image>
      )}
    </button>
  );
};

export default Button;
