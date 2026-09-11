/**
 * Hafif, bağımsız (framework gerektirmeyen) sayfalama denetleyicisi.
 *
 * Zaten DOM'a render edilmiş öğe listesini (kitaplar, alıntılar, notlar,
 * incelemeler, arşiv kayıtları...) sayfa sayfa gösterir/gizler ve klasik
 * « ‹ 1 2 3 › » denetimlerini oluşturur. Mevcut istemci taraflı
 * filtreleme (Tümü/Kitaplar/Notlar gibi) ile birlikte çalışabilmesi için
 * her render'da güncel bir "görünürlük" fonksiyonu sorulur.
 */
export interface PagerOptions {
  items: HTMLElement[];
  container: HTMLElement;
  pageSize: number;
  /** Aktif filtreye göre hangi öğelerin aday olduğunu belirler. Verilmezse tüm öğeler adaydır. */
  isEligible?: (item: HTMLElement) => boolean;
  /** Sayfa değiştiğinde çağrılır (ör. üste kaydırmak için). */
  onPageChange?: (page: number) => void;
  /** Her render sonrası (ilk yükleme dahil) çağrılır — ör. bağımlı DOM düzeltmeleri için. */
  afterRender?: () => void;
}

export interface Pager {
  /** Aktif filtre değiştiğinde çağrılır: 1. sayfaya döner ve yeniden çizer. */
  reset: () => void;
  goToPage: (page: number) => void;
}

function buildPageWindow(current: number, total: number): (number | "ellipsis")[] {
  const delta = 1;
  const window: (number | "ellipsis")[] = [];
  for (let page = 1; page <= total; page++) {
    const isEdge = page === 1 || page === total;
    const isNearCurrent = page >= current - delta && page <= current + delta;
    if (isEdge || isNearCurrent) {
      window.push(page);
    } else if (window[window.length - 1] !== "ellipsis") {
      window.push("ellipsis");
    }
  }
  return window;
}

export function createPager(options: PagerOptions): Pager {
  const { items, container, pageSize, isEligible = () => true, onPageChange, afterRender } = options;
  let currentPage = 1;

  function eligibleItems(): HTMLElement[] {
    return items.filter(isEligible);
  }

  function renderControls(totalPages: number) {
    container.innerHTML = "";
    if (totalPages <= 1) return;

    const nav = document.createElement("nav");
    nav.setAttribute("aria-label", "Sayfalama");
    nav.className = "mt-8 flex flex-wrap items-center justify-center gap-1.5 text-sm";

    const activeClass = "grid size-8 place-items-center rounded-full border border-leather text-leather";
    const idleClass =
      "grid size-8 place-items-center rounded-full border border-rule text-ink-soft transition-colors hover:border-leather hover:text-leather";
    const disabledClass = "grid size-8 place-items-center rounded-full border border-rule text-ink-soft/40";

    function addButton(label: string, targetPage: number, opts: { disabled?: boolean; current?: boolean; ariaLabel?: string } = {}) {
      const button = document.createElement("button");
      button.type = "button";
      button.textContent = label;
      if (opts.ariaLabel) button.setAttribute("aria-label", opts.ariaLabel);
      if (opts.current) button.setAttribute("aria-current", "page");
      button.className = opts.disabled ? disabledClass : opts.current ? activeClass : idleClass;
      if (opts.disabled) {
        button.disabled = true;
      } else if (!opts.current) {
        button.addEventListener("click", () => goToPage(targetPage));
      }
      nav.appendChild(button);
    }

    addButton("«", 1, { disabled: currentPage === 1, ariaLabel: "İlk sayfa" });
    addButton("‹", currentPage - 1, { disabled: currentPage === 1, ariaLabel: "Önceki sayfa" });

    for (const entry of buildPageWindow(currentPage, totalPages)) {
      if (entry === "ellipsis") {
        const span = document.createElement("span");
        span.textContent = "…";
        span.className = "grid size-8 place-items-center text-ink-soft/70";
        nav.appendChild(span);
      } else {
        addButton(String(entry), entry, { current: entry === currentPage });
      }
    }

    addButton("›", currentPage + 1, { disabled: currentPage === totalPages, ariaLabel: "Sonraki sayfa" });
    addButton("»", totalPages, { disabled: currentPage === totalPages, ariaLabel: "Son sayfa" });

    container.appendChild(nav);
  }

  function render() {
    const eligible = eligibleItems();
    const totalPages = Math.max(1, Math.ceil(eligible.length / pageSize));
    currentPage = Math.min(Math.max(currentPage, 1), totalPages);

    const start = (currentPage - 1) * pageSize;
    const end = start + pageSize;
    const visibleSet = new Set(eligible.slice(start, end));

    items.forEach((item) => {
      item.style.display = visibleSet.has(item) ? "" : "none";
    });

    renderControls(totalPages);
    afterRender?.();
  }

  function goToPage(page: number) {
    currentPage = page;
    render();
    onPageChange?.(currentPage);
  }

  function reset() {
    currentPage = 1;
    render();
  }

  render();

  return { reset, goToPage };
}
