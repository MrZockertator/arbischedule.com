declare function html2canvas(
  element: HTMLElement,
  options?: {
    backgroundColor?: string;
    scale?: number;
  }
): Promise<HTMLCanvasElement>;

interface Window {
  __ARBISCHEDULE_CONFIG__?: {
    errorEndpoint?: string;
  };
}
