class BaseError extends Error {
  details: string;
  name = "BaseError";

  constructor(message: string) {
    super(message);
    this.details = message;
  }
}

const viem = {
  createPublicClient: jest.fn(),
  http: jest.fn(),
  custom: jest.fn(),
  parseEther: jest.fn(),
  formatEther: jest.fn(),
  parseUnits: jest.fn(),
  formatUnits: jest.fn(),
  BaseError,
};

export { BaseError };
export default viem;
