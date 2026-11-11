/** Only the latest request may update the UI; invalidation also silences obsolete failures. */
export function createLatestRequest() {
  let revision = 0;
  return {
    invalidate() {
      revision++;
    },
    async run<T>(
      load: () => Promise<T>,
      onValue: (value: T) => void,
      onError: (error: unknown) => void,
    ) {
      const request = ++revision;
      try {
        const value = await load();
        if (request === revision) onValue(value);
      } catch (error) {
        if (request === revision) onError(error);
      }
    },
  };
}
