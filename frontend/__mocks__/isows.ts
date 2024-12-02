const mockWebSocket = {
  CONNECTING: 0,
  OPEN: 1,
  CLOSING: 2,
  CLOSED: 3,
  addEventListener: jest.fn(),
  removeEventListener: jest.fn(),
  close: jest.fn(),
  send: jest.fn(),
};

export const getNativeWebSocket = jest.fn(() => mockWebSocket);
export const getWebSocket = jest.fn(() => mockWebSocket);
export default mockWebSocket;
