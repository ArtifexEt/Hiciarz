import type { PDFProgress } from './pdf';

/** Reserve the viewer in the click handler, before asynchronous PDF generation. */
export function preparePDFPreview(onCancel: () => void) {
  let page: Window | null = null;
  try {
    page = window.open('about:blank', '_blank');
    if (!page) return null;
    page.opener = null;
    const doc = page.document;
    doc.title = 'Przygotowanie wydruku — Hiciarz';
    doc.documentElement.lang = 'pl';
    doc.body.style.cssText =
      'margin:0;padding:48px 24px;background:#f6f5f1;color:#183c33;font:16px/1.7 system-ui,sans-serif;';
    const main = doc.createElement('main');
    main.style.cssText = 'max-width:520px;margin:8vh auto;';
    const brand = doc.createElement('p');
    brand.textContent = 'hiciarz ✳';
    const title = doc.createElement('h1');
    title.textContent = 'Przygotowuję karty do druku…';
    title.style.cssText = 'font:normal 32px/1.25 Georgia,serif;';
    const hint = doc.createElement('p');
    hint.textContent =
      'Za chwilę otworzy się PDF. W jego podglądzie wybierz ikonę drukarki lub polecenie „Drukuj”.';
    const progress = doc.createElement('progress');
    progress.max = 100;
    progress.value = 0;
    progress.setAttribute('aria-label', 'Przygotowanie wydruku');
    progress.style.cssText = 'width:100%;accent-color:#183c33;';
    const status = doc.createElement('p');
    status.setAttribute('role', 'status');
    status.textContent = 'Przygotowuję plik…';
    const cancel = doc.createElement('button');
    cancel.textContent = 'Anuluj przygotowanie';
    cancel.style.cssText =
      'padding:12px 18px;min-height:44px;border:1px solid #b6bfae;border-radius:8px;background:white;color:#183c33;cursor:pointer;font:inherit;';
    cancel.onclick = onCancel;
    main.append(brand, title, hint, progress, status, cancel);
    doc.body.append(main);
    const viewer = page;
    let url: string | undefined;
    let cleanupTimer: number | undefined;
    const release = () => {
      window.clearInterval(cleanupTimer);
      if (url) URL.revokeObjectURL(url);
      url = undefined;
    };
    return {
      update(next: PDFProgress) {
        if (viewer.closed) {
          onCancel();
          return;
        }
        progress.value = next.percent;
        status.textContent = `Gotowe karty: ${next.completed} / ${next.total} · ${next.percent}%`;
      },
      show(blob: Blob) {
        if (viewer.closed) throw new Error('Podgląd został zamknięty. Otwórz wydruk ponownie.');
        url = URL.createObjectURL(blob);
        viewer.location.replace(url);
        cleanupTimer = window.setInterval(() => {
          if (viewer.closed) release();
        }, 30000);
      },
      close() {
        release();
        if (!viewer.closed) viewer.close();
      },
    };
  } catch {
    page?.close();
    return null;
  }
}
