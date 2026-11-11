import { describe, expect, it, vi } from 'vitest';
import { createLatestRequest } from './latest-request';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (error: Error) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

describe('background upload ordering', () => {
  it('keeps the last chosen image when an older upload finishes later', async () => {
    const requests = createLatestRequest();
    const first = deferred<string>();
    const second = deferred<string>();
    const apply = vi.fn();
    const reportError = vi.fn();
    const oldUpload = requests.run(() => first.promise, apply, reportError);
    const newUpload = requests.run(() => second.promise, apply, reportError);

    second.resolve('new-background');
    await newUpload;
    first.resolve('old-holiday-background');
    await oldUpload;

    expect(apply.mock.calls).toEqual([['new-background']]);
    expect(reportError).not.toHaveBeenCalled();
  });

  it('does not briefly apply an older image while a newer upload is still processing', async () => {
    const requests = createLatestRequest();
    const first = deferred<string>();
    const second = deferred<string>();
    const apply = vi.fn();
    const reportError = vi.fn();
    const oldUpload = requests.run(() => first.promise, apply, reportError);
    const newUpload = requests.run(() => second.promise, apply, reportError);

    first.resolve('old-holiday-background');
    await oldUpload;
    expect(apply).not.toHaveBeenCalled();
    second.resolve('new-background');
    await newUpload;
    expect(apply.mock.calls).toEqual([['new-background']]);
  });

  it('discards invalidated image results and errors, then permits a new upload', async () => {
    const requests = createLatestRequest();
    const obsolete = deferred<string>();
    const apply = vi.fn();
    const reportError = vi.fn();
    const upload = requests.run(() => obsolete.promise, apply, reportError);
    requests.invalidate();
    obsolete.resolve('obsolete-holiday-background');
    await upload;
    expect(apply).not.toHaveBeenCalled();

    const failed = deferred<string>();
    const failure = requests.run(() => failed.promise, apply, reportError);
    requests.invalidate();
    failed.reject(new Error('Obsolete image could not load'));
    await failure;
    expect(reportError).not.toHaveBeenCalled();

    await requests.run(async () => 'current-background', apply, reportError);
    expect(apply.mock.calls).toEqual([['current-background']]);
  });

  it('reports current failures while ignoring a superseded upload error', async () => {
    const requests = createLatestRequest();
    const first = deferred<string>();
    const second = deferred<string>();
    const apply = vi.fn();
    const reportError = vi.fn();
    const oldUpload = requests.run(() => first.promise, apply, reportError);
    const newUpload = requests.run(() => second.promise, apply, reportError);
    const currentError = new Error('Current image could not load');
    second.reject(currentError);
    await newUpload;
    first.reject(new Error('Obsolete image could not load'));
    await oldUpload;
    expect(reportError.mock.calls).toEqual([[currentError]]);
    expect(apply).not.toHaveBeenCalled();
  });
});
