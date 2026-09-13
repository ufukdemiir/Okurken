export interface BreadcrumbItem {
  name: string;
  url: string;
}

/** Google'ın "breadcrumb" zengin sonuçlarını göstermesi için BreadcrumbList şeması üretir. */
export function buildBreadcrumbList(items: BreadcrumbItem[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url,
    })),
  };
}
