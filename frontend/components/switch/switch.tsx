import styles from "./switch.module.scss";

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
}

const Switch = ({ checked, onChange, disabled }: SwitchProps) => {
  return (
    <button
      className={`${styles.switch} ${checked ? styles.checked : ""} ${
        disabled ? styles.disabled : ""
      }`}
      onClick={() => !disabled && onChange(!checked)}
      type="button"
      disabled={disabled}
      aria-checked={checked}
      role="switch"
    >
      <span className={styles.thumb} />
    </button>
  );
};

export default Switch;
