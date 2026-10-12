/** Thrown for any invalid spec. The message is written to be read (and fixed) by an LLM. */
export class SysketchError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SysketchError';
  }
}
