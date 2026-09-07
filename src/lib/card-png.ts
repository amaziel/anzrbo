/**
 * Export d'un élément DOM (carte de membre) en image PNG très haute résolution.
 * La carte CR80 fait ~323 px de large à l'écran : on augmente le ratio de pixels
 * pour atteindre au minimum la largeur cible (1920 px = Full HD, 3840 px = 4K).
 */

export const FULL_HD = 1920;
export const ULTRA_HD = 3840;

async function nodeToPng(node: HTMLElement, targetWidth: number): Promise<string> {
  const { toPng } = await import("html-to-image");
  const rect = node.getBoundingClientRect();
  const base = rect.width || node.offsetWidth || 324;
  const pixelRatio = Math.max(2, Math.min(16, targetWidth / base));
  // Deux passes : la première "réchauffe" les images/polices, la seconde produit le rendu net.
  await toPng(node, { pixelRatio: 1, cacheBust: true, backgroundColor: "#ffffff" });
  return toPng(node, {
    pixelRatio,
    cacheBust: true,
    backgroundColor: "#ffffff",
    style: { boxShadow: "none", transform: "none" },
  });
}

function triggerDownload(dataUrl: string, filename: string) {
  const a = document.createElement("a");
  a.href = dataUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
}

export async function downloadCardPng(
  node: HTMLElement | null,
  filename: string,
  targetWidth: number = FULL_HD,
) {
  if (!node) throw new Error("Carte introuvable à l'écran.");
  const dataUrl = await nodeToPng(node, targetWidth);
  triggerDownload(dataUrl, filename.endsWith(".png") ? filename : `${filename}.png`);
}

/** Assemble recto + verso dans une seule image verticale haute résolution. */
export async function downloadCardsPng(
  nodes: Array<HTMLElement | null>,
  filename: string,
  targetWidth: number = FULL_HD,
) {
  const valid = nodes.filter(Boolean) as HTMLElement[];
  if (valid.length === 0) throw new Error("Carte introuvable à l'écran.");
  const dataUrls = await Promise.all(valid.map((n) => nodeToPng(n, targetWidth)));
  const images = await Promise.all(
    dataUrls.map(
      (src) =>
        new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = () => reject(new Error("Rendu de la carte impossible."));
          img.src = src;
        }),
    ),
  );
  const gap = Math.round(targetWidth * 0.03);
  const width = Math.max(...images.map((i) => i.width));
  const height = images.reduce((s, i) => s + i.height, 0) + gap * (images.length - 1);
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas indisponible.");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  let y = 0;
  for (const img of images) {
    ctx.drawImage(img, Math.round((width - img.width) / 2), y);
    y += img.height + gap;
  }
  triggerDownload(canvas.toDataURL("image/png"), filename.endsWith(".png") ? filename : `${filename}.png`);
}
