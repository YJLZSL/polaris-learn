import { useMediaQuery } from "./use-media-query";

export function useIsMobile(): boolean {
  // lg 断点 = 1024px，<lg 视为移动端
  return useMediaQuery("(max-width: 1023px)");
}
