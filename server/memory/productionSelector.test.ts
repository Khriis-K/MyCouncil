import { afterEach, describe, expect, test, vi } from 'vitest';
import { createProductionSelector, SELECTOR_KEEP_TOP } from './productionSelector';

const reply = (content: string) => new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status: 200 });

afterEach(() => vi.unstubAllGlobals());

describe('createProductionSelector', () => {
  test('keeps the dense top 2 and asks the model at temperature 0', async () => {
    const fetchMock = vi.fn(async () => reply('{"selected": [4]}'));
    vi.stubGlobal('fetch', fetchMock);
    const selector = createProductionSelector(5, 5000);
    expect(SELECTOR_KEEP_TOP).toBe(2);
    expect(await selector.score('q', ['a', 'b', 'c', 'd', 'e'])).toEqual([2, 2, 0, 1, 0]);
    const body = JSON.parse((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].body as string);
    expect(body.temperature).toBe(0);
    expect(body).not.toHaveProperty('signal');
  });

  test('gives up after the timeout, so the pipeline can fall back to dense order', async () => {
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) =>
      new Promise((_resolve, reject) => init.signal!.addEventListener('abort', () => reject(init.signal!.reason))));
    const started = performance.now();
    await expect(createProductionSelector(5, 30).score('q', ['a', 'b', 'c'])).rejects.toThrow();
    expect(performance.now() - started).toBeLessThan(2000);
  });

  test('without a timeout the request carries no abort signal', async () => {
    const fetchMock = vi.fn(async () => reply('{"selected": []}'));
    vi.stubGlobal('fetch', fetchMock);
    await createProductionSelector(5).score('q', ['a']);
    expect((fetchMock.mock.calls[0] as unknown as [string, RequestInit])[1].signal).toBeUndefined();
  });
});
