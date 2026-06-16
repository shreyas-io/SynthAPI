import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from "react";
import { Link, type LinkProps } from "react-router";

type ButtonVariant = "primary" | "secondary" | "danger" | "purple" | "success";
type ButtonSize = "default" | "compact" | "icon";

type ButtonClassInput = {
  variant?: ButtonVariant | undefined;
  size?: ButtonSize | undefined;
  className?: string | undefined;
};

const variantClassNames: Record<ButtonVariant, string> = {
  primary: "primary-btn",
  secondary: "secondary-btn",
  danger: "danger-btn",
  purple: "purple-btn",
  success: "success-btn",
};

const sizeClassNames: Record<ButtonSize, string> = {
  default: "",
  compact: "compact-action",
  icon: "icon-only-action",
};

const getButtonClassName = ({
  variant = "primary",
  size = "default",
  className,
}: ButtonClassInput) =>
  [
    "button",
    variantClassNames[variant],
    sizeClassNames[size],
    className,
  ]
    .filter(Boolean)
    .join(" ");

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & ButtonClassInput;

export function Button({
  variant,
  size,
  className,
  type = "button",
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      type={type}
      className={getButtonClassName({ variant, size, className })}
    />
  );
}

type ButtonLinkProps = LinkProps &
  ButtonClassInput & {
    children: ReactNode;
  };

export function ButtonLink({
  variant,
  size,
  className,
  ...props
}: ButtonLinkProps) {
  return (
    <Link
      {...props}
      className={getButtonClassName({ variant, size, className })}
    />
  );
}

type ButtonAnchorProps = AnchorHTMLAttributes<HTMLAnchorElement> &
  ButtonClassInput;

export function ButtonAnchor({
  variant,
  size,
  className,
  ...props
}: ButtonAnchorProps) {
  return (
    <a
      {...props}
      className={getButtonClassName({ variant, size, className })}
    />
  );
}
