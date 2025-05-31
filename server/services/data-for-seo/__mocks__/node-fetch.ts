// Mock implementation of node-fetch for testing purposes
const mockFetch = jest.fn();

// Default export to match node-fetch's export pattern
module.exports = mockFetch;
module.exports.default = mockFetch;

// Add Response, Request and Headers classes to match node-fetch
export class Response {
  body: any;
  ok: boolean;
  status: number;
  statusText: string;
  headers: Headers;

  constructor(body: any, init: any = {}) {
    this.body = body;
    this.ok = init.status ? init.status >= 200 && init.status < 300 : true;
    this.status = init.status || 200;
    this.statusText = init.statusText || 'OK';
    this.headers = new Headers(init.headers);
  }

  async json() {
    return this.body;
  }

  async text() {
    return typeof this.body === 'string' ? this.body : JSON.stringify(this.body);
  }
}

export class Request {
  url: string;
  method: string;
  headers: Headers;
  body: any;

  constructor(input: string, init: any = {}) {
    this.url = input;
    this.method = init.method || 'GET';
    this.headers = new Headers(init.headers);
    this.body = init.body;
  }
}

export class Headers {
  private _headers: Map<string, string>;

  constructor(init: Record<string, string> = {}) {
    this._headers = new Map();
    if (init) {
      Object.entries(init).forEach(([key, value]) => {
        this.set(key, value);
      });
    }
  }

  get(name: string): string | undefined {
    return this._headers.get(name.toLowerCase());
  }

  set(name: string, value: string): void {
    this._headers.set(name.toLowerCase(), value);
  }

  has(name: string): boolean {
    return this._headers.has(name.toLowerCase());
  }
}

// Make these available as named exports
module.exports.Response = Response;
module.exports.Request = Request;
module.exports.Headers = Headers;

// Also export the mock implementation of AbortController
export class AbortController {
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

module.exports.AbortController = AbortController;

// Default export to match node-fetch's export pattern
export default mockFetch; 