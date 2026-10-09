// Optional browser QA. Uses only synthetic, in-tab preview data; blocks external requests.
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '..');
const sizes = [[1024,768],[768,1024],[1180,820],[820,1180],[507,768],[390,844]];
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
let checks = 0;
async function layout(page, label) {
  const result = await page.evaluate(() => ({
    width: innerWidth, scrollWidth: document.documentElement.scrollWidth,
    small: [...document.querySelectorAll('button, a.quiet, summary')]
      .filter(e => e.getClientRects().length && !e.closest('[hidden]'))
      .map(e => ({text: e.textContent.trim(), w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height}))
      .filter(e => e.w < 44 || e.h < 44)
  }));
  assert.ok(result.scrollWidth <= result.width + 1, label + ': horizontal overflow');
  assert.deepEqual(result.small, [], label + ': small touch targets');
  checks += 2;
}
async function answer(page) {
  const q = await page.evaluate(() => state.current);
  if (q.mode === 'build') {
    const used = new Set();
    for (const part of q.parts) {
      const i = q.tiles.findIndex((t,j) => t === part && !used.has(j)); used.add(i);
      await page.locator(`[data-tile="${i}"]`).tap();
    }
    await page.locator('#check').tap();
  } else {
    await page.locator(`[data-choice="${q.choices.indexOf(q.word)}"]`).tap();
  }
  assert.equal(await page.locator('#next').isVisible(), true);
  checks++;
}
async function main() {
  const launch = process.env.READING_BROWSER_LAUNCHER
    ? require(path.resolve(process.env.READING_BROWSER_LAUNCHER))
    : () => require(process.env.READING_PLAYWRIGHT_MODULE || 'playwright').chromium.launch({headless:true});
  const browser = await launch();
  const errors = [];
  const context = await browser.newContext({hasTouch:true,isMobile:true,deviceScaleFactor:1});
  try {
    for (const [width,height] of sizes) {
      const page = await context.newPage();
      await page.setViewportSize({width,height});
      page.on('pageerror', e => errors.push(e.message));
      await page.route('**/*', route => route.request().url() === 'https://reading.local/'
        ? route.fulfill({contentType:'text/html',body:html}) : route.abort());
      await page.goto('https://reading.local/');
      await layout(page, `${width}x${height} code`);
      await page.locator('#previewcheck').tap();
      await layout(page, 'starting intro');
      await page.locator('#begincheck').tap();
      await layout(page, 'starting question');
      await page.locator('#notsure').tap();
      const count = await page.evaluate(() => connected.profile.placement.answers.length);
      await page.locator('#home').tap();
      await page.locator('#begincheck').tap();
      assert.equal(await page.evaluate(() => connected.profile.placement.answers.length), count);
      checks++;
      while (await page.locator('#notsure').count()) await page.locator('#notsure').tap();
      await layout(page, 'recommendation');
      await page.locator('#home').tap();
      await layout(page, 'next lesson');
      assert.ok((await page.locator('details.panel').boundingBox()).height < 110);
      await page.locator('details.panel summary').tap();
      assert.equal(await page.locator('details.panel').getAttribute('open'), '');
      await page.locator('details.panel summary').tap();
      checks += 2;
      await page.locator('#guidedstart').tap();
      await layout(page, 'lesson');
      await page.locator('#start').tap();
      await layout(page, 'practice example');
      if (width >= 960 && height <= 850) {
        const box = await page.locator('#hint').boundingBox();
        assert.ok(box.y + box.height <= height, 'landscape help must fit'); checks++;
      }
      await answer(page); await page.locator('#next').tap();
      await page.locator('#hint').tap();
      await layout(page, 'practice hint');
      await answer(page); await page.locator('#next').tap();
      await layout(page, 'letter building');
      const hasTiles = await page.locator('[data-tile]').count();
      if (hasTiles) await page.locator('[data-tile]').first().tap();
      const built = await page.evaluate(() => JSON.stringify(state.built));
      await page.setViewportSize({width:height,height:width});
      assert.equal(await page.evaluate(() => JSON.stringify(state.built)), built);
      await layout(page, 'rotated question');
      await page.setViewportSize({width,height});
      if (hasTiles) await page.locator('#clearword').tap();
      await page.locator('#privacy').tap();
      await layout(page, 'privacy dialog');
      await page.keyboard.press('Escape');
      assert.equal(await page.locator('#overlay').isVisible(), false);
      assert.equal(await page.locator('#privacy').evaluate(e => e === document.activeElement), true);
      checks += 3;
      while (await page.locator('#next').count()) {
        await answer(page); await page.locator('#next').tap();
        if (await page.locator('#next').count()) await layout(page, 'mixed practice/review');
      }
      assert.equal(await page.evaluate(() => state.stats.total), 12);
      assert.equal(await page.evaluate(() => state.stats.review), 1);
      await page.locator('#continueguide').tap();
      await layout(page, 'updated recommendation');
      // Browse stories through the same visible learner controls.
      await page.locator('#codeentry').tap();
      await page.locator('#openpractice').tap();
      const wordLesson = await page.evaluate(() => CONTENT.lessons.findIndex(l => !l.kind));
      const wordStage = await page.evaluate(i => CONTENT.lessons[i].stage, wordLesson);
      await page.locator(`[data-stage="${wordStage}"]`).tap();
      await page.locator(`[data-lesson="${wordLesson}"]`).tap();
      await page.locator('#start').tap();
      await answer(page); await page.locator('#next').tap();
      await answer(page); await page.locator('#next').tap();
      assert.equal(await page.evaluate(() => state.current.mode), 'build');
      await page.locator('[data-tile]').first().tap();
      const partial = await page.evaluate(() => JSON.stringify(state.built));
      await page.setViewportSize({width:height,height:width});
      assert.equal(await page.evaluate(() => JSON.stringify(state.built)), partial);
      await layout(page, 'rotated partial word');
      await page.setViewportSize({width,height});
      await page.locator('[data-slot]').first().tap();
      assert.equal(await page.evaluate(() => state.built.length), 0);
      await answer(page); await page.locator('#next').tap();
      await layout(page, 'read and match');
      await page.locator('#home').tap();
      await page.locator('#openpractice').tap();
      await page.locator('[data-stage="Meaning & stories"]').tap();
      const storyLesson = await page.evaluate(() => CONTENT.lessons.findIndex(l => l.kind === 'stories'));
      await page.locator(`[data-lesson="${storyLesson}"]`).tap();
      await page.locator('#start').tap();
      await page.locator('[data-story]').first().tap();
      await layout(page, 'story reading');
      await page.locator('#rereadnext').tap(); await page.locator('#rereadnext').tap();
      await layout(page, 'story questions');
      const columns = await page.locator('.story-workspace').evaluate(e => getComputedStyle(e).gridTemplateColumns.split(' ').length);
      assert.equal(columns, width >= 960 && width > height ? 2 : 1);
      checks++;
      await page.locator('#storyhint').tap();
      await layout(page, 'story help');
      for (let i=0;i<3;i++) {
        const correct = await page.evaluate(() => CONTENT.stories[state.story].questions[state.question].correct);
        await page.locator(`[data-answer="${correct}"]`).tap();
        await page.locator('#storynext').tap();
      }
      assert.equal(await page.evaluate(() => state.screen), 'story-finish'); checks++;
      console.log(`${width}x${height}: passed`);
      await page.close();
    }
    assert.deepEqual(errors, [], 'browser script errors');
    console.log(JSON.stringify({browser:await browser.version(),sizes,checks,scriptErrors:errors.length}));
  } finally { await browser.close(); }
}
main().catch(e => {console.error(e);process.exitCode=1;});
