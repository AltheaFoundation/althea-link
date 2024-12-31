import { createElement } from "react";
import SwapIcon from "./swapIcon";

export function generateSwapIcon(
  fromLogoURI: string,
  toLogoURI: string
): React.ReactNode {
  return createElement(SwapIcon, {
    fromTokenIcon: fromLogoURI,
    toTokenIcon: toLogoURI,
  });
}
