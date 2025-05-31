// Mock implementation of node-abort-controller for testing purposes
class AbortControllerMock {
  signal: {
    aborted: boolean;
    addEventListener: jest.Mock;
    removeEventListener: jest.Mock;
    dispatchEvent: jest.Mock;
  };

  constructor() {
    this.signal = {
      aborted: false,
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  }

  abort(): void {
    this.signal.aborted = true;
  }
}

// Export the mock AbortController
module.exports = { AbortController: AbortControllerMock }; 