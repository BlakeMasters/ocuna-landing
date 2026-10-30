import assert from "node:assert/strict";
import test from "node:test";
import vm from "node:vm";
import { homeStartupMarkup, notFoundStartupMarkup } from "../src/content/homeStartup.js";
import { crawlableHtml } from "../src/content/crawlable.js";

function browser({ modules = true, execute = true, notFound = false } = {}) {
  const attributes = new Map(), timers = new Map(), listeners = new Map();
  const markup = notFound ? notFoundStartupMarkup(crawlableHtml("/404")) : homeStartupMarkup("/", crawlableHtml("/"));
  const window = {
    setTimeout(fn, delay) { timers.set(1, { fn, delay }); return 1; },
    clearTimeout(id) { timers.delete(id); },
    addEventListener(name, fn, capture) { listeners.set(name, { fn, capture }); },
    removeEventListener(name, fn, capture) {
      const saved = listeners.get(name);
      if (saved?.fn === fn && saved.capture === capture) listeners.delete(name);
    },
  };
  const document = { documentElement: {
    setAttribute(name, value) { attributes.set(name, value); },
    removeAttribute(name) { attributes.delete(name); },
  } };
  if (execute) vm.runInNewContext(markup.head.match(/<script id="(?:home|not-found)-startup">([\s\S]*?)<\/script>/)[1], {
    window, document, HTMLScriptElement: { supports: type => modules && type === "module" },
  });
  return { attributes, timers, listeners, markup };
}

test("the startup guard only wraps home aliases and preserves their complete no-JavaScript content", () => {
  for (const route of ["/", "/ocuna", "/ocura"]) {
    const content = crawlableHtml(route), markup = homeStartupMarkup(route, content);
    assert.equal(markup.content, `<div data-home-prerender>${content}</div>`);
    assert.equal(markup.bodyClass, "landing-route");
    assert.ok(!markup.content.includes("visibility:hidden"));
    assert.ok(!markup.content.includes(" hidden"));
  }
  for (const route of ["/four1", "/research", "/docs", "/contact", "/404"]) {
    assert.deepEqual(homeStartupMarkup(route, "ordinary page"), { content: "ordinary page", head: "", bodyClass: "" });
  }
  assert.equal(browser({ execute: false }).attributes.has("data-home-startup"), false);
  const unsupported = browser({ modules: false });
  assert.equal(unsupported.attributes.has("data-home-startup"), false);
  assert.equal(unsupported.timers.size, 0);
});

test("modern browsers hide only the temporary static wrapper while the application loads", () => {
  const state = browser();
  assert.equal(state.attributes.get("data-home-startup"), "pending");
  const style = state.markup.head.match(/<style[^>]*>(.*?)<\/style>/)[1];
  const hiddenRules = [...style.matchAll(/([^{}]+)\{[^{}]*visibility:hidden[^{}]*\}/g)].map(([, selector]) => selector);
  assert.deepEqual(hiddenRules, ['html[data-home-startup="pending"] [data-home-prerender]']);
  assert.ok(!style.includes("#root"), "React's replacement cannot inherit startup hiding");
  assert.equal(state.listeners.get("error").capture, true);
});

test("a stalled module reveals the static page after five seconds and removes its listeners", () => {
  const state = browser(), timer = state.timers.get(1);
  assert.equal(timer.delay, 5000);
  timer.fn();
  assert.equal(state.attributes.has("data-home-startup"), false);
  assert.equal(state.timers.size, 0);
  assert.equal(state.listeners.size, 0);
});

test("module load failures and runtime exceptions reveal the fallback immediately", () => {
  for (const event of [{ target: { tagName: "SCRIPT", type: "module" } }, { error: new Error("application startup failed") }]) {
    const state = browser();
    state.listeners.get("error").fn(event);
    assert.equal(state.attributes.has("data-home-startup"), false);
    assert.equal(state.timers.size, 0);
    assert.equal(state.listeners.size, 0);
  }
});

test("an unrelated image failure cannot flash the static homepage during successful startup", () => {
  const state = browser();
  state.listeners.get("error").fn({ target: { tagName: "IMG" } });
  assert.equal(state.attributes.get("data-home-startup"), "pending");
  assert.equal(state.timers.size, 1);
});

test("404 startup hides only its replaceable fallback and preserves the complete gallery without JavaScript", () => {
  const content = crawlableHtml("/404"), markup = notFoundStartupMarkup(content);
  assert.equal(markup.content, `<div data-not-found-prerender>${content}</div>`);
  assert.equal(markup.bodyClass, "paper-route not-found-route");
  assert.ok(!markup.content.includes("visibility:hidden") && !markup.content.includes(" hidden"));
  assert.ok(markup.content.includes("Raccoons through the years"));
  assert.equal(browser({ notFound: true, execute: false }).attributes.size, 0);
  const unsupported = browser({ notFound: true, modules: false });
  assert.equal(unsupported.attributes.size, 0);
  assert.equal(unsupported.timers.size, 0);
  const state = browser({ notFound: true });
  assert.equal(state.attributes.get("data-not-found-startup"), "pending");
  assert.equal(state.attributes.has("data-home-startup"), false);
  const style = markup.head.match(/<style[^>]*>(.*?)<\/style>/)[1];
  const hiddenRules = [...style.matchAll(/([^{}]+)\{[^{}]*visibility:hidden[^{}]*\}/g)].map(([, selector]) => selector);
  assert.deepEqual(hiddenRules, ['html[data-not-found-startup="pending"] [data-not-found-prerender]']);
  assert.ok(!style.includes("#root"), "The live React 404 must remain visible during and after startup");
});

test("404 fallback is revealed when the app fails or stalls, with no gallery-image-triggered flash", () => {
  for (const event of [{ target: { tagName: "SCRIPT", type: "module" } }, { error: new Error("404 startup failed") }]) {
    const state = browser({ notFound: true });
    state.listeners.get("error").fn(event);
    assert.equal(state.attributes.size, 0);
    assert.equal(state.timers.size, 0);
    assert.equal(state.listeners.size, 0);
  }
  const stalled = browser({ notFound: true });
  assert.equal(stalled.timers.get(1).delay, 5000);
  stalled.timers.get(1).fn();
  assert.equal(stalled.attributes.size, 0);
  assert.equal(stalled.listeners.size, 0);
  const imageError = browser({ notFound: true });
  imageError.listeners.get("error").fn({ target: { tagName: "IMG" } });
  assert.equal(imageError.attributes.get("data-not-found-startup"), "pending");
});
