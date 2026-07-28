// Thrown inside the order transaction to trigger a clean 400 with no partial write.
export class OrderError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderError";
  }
}
