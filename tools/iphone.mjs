// iPhone en horizontal dentro de Safari: con viewport-fit=cover, el notch y la barra de inicio se comen los bordes
// (47 px a cada lado y 21 px abajo en un iPhone 12). Con IPHONE=1, las auditorías simulan esas zonas seguras.
export async function iphone(page) {
  if (!process.env.IPHONE) return;
  const s = await page.context().newCDPSession(page);
  await s.send('Emulation.setSafeAreaInsetsOverride', { insets: { top: 0, left: 47, right: 47, bottom: 21 } });
}
