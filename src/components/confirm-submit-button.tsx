"use client";

import type { MouseEvent } from "react";
import { Button, type ButtonProps } from "@/components/ui/button";

type ConfirmSubmitButtonProps = Omit<ButtonProps, "type" | "onClick"> & {
  message: string;
};

export function ConfirmSubmitButton({ message, ...props }: ConfirmSubmitButtonProps) {
  function confirm(event: MouseEvent<HTMLButtonElement>) {
    if (!window.confirm(message)) event.preventDefault();
  }

  return <Button type="submit" onClick={confirm} {...props} />;
}
