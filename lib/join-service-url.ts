/**
 * Concatena URL base com path (ou path?query), normalizando barras.
 */
export function joinServiceUrl(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl;
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}
