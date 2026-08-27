const { chromium } = require('playwright');
(async () => {
  const b = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
  const shots = [
    ['home', '/?uniform=no1', { width: 1280, height: 800 }],
    ['stories', '/stories', { width: 1280, height: 800 }],
    ['checkin-mobile', '/check-in', { width: 390, height: 844 }],
    ['home-mobile-no4', '/?uniform=no4', { width: 390, height: 844 }],
  ];
  for (const [name, path, viewport] of shots) {
    const page = await (await b.newContext({ viewport, deviceScaleFactor: 2 })).newPage();
    await page.goto('https://saf-checkin.web.app' + path, { waitUntil: 'load' });
    await page.waitForTimeout(2500);
    await page.screenshot({ path: `docs/screenshots/${name}.png` });
  }
  await b.close();
})();
