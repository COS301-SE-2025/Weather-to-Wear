// Security test setup
// This file runs before each security test

// Ensure we're in test environment
process.env.NODE_ENV = 'test';

// Set default JWT secret for tests if not provided
if (!process.env.JWT_SECRET) {
  process.env.JWT_SECRET = 'test-jwt-secret-for-security-testing';
}

// Mock Prisma to prevent database connections
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'mock-user-id',
        name: 'Mock User',
        email: 'mock@example.com',
        password: 'mock-hashed-password'
      }),
      delete: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
    },
    post: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'mock-post-id',
        caption: 'Mock post',
        userId: 'mock-user-id'
      }),
      create: jest.fn().mockResolvedValue({
        id: 'mock-post-id',
        caption: 'Mock post',
        userId: 'mock-user-id'
      }),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
  
  // Mock Prisma enums
  const Style = {
    Formal: 'Formal',
    Casual: 'Casual',
    Athletic: 'Athletic',
    Party: 'Party',
    Business: 'Business',
    Outdoor: 'Outdoor'
  };
  
  const Category = {
    TOPS: 'TOPS',
    BOTTOMS: 'BOTTOMS',
    SHOES: 'SHOES',
    ACCESSORIES: 'ACCESSORIES'
  };
  
  return { 
    PrismaClient: jest.fn(() => mockPrisma),
    Style,
    Category,
    __esModule: true,
    default: mockPrisma
  };
});

// Mock the prisma instance that's imported directly
jest.mock('../../src/prisma', () => {
  const mockPrisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({
        id: 'mock-user-id',
        name: 'Mock User',
        email: 'mock@example.com',
        password: 'mock-hashed-password'
      }),
      delete: jest.fn().mockResolvedValue({ id: 'mock-user-id' }),
    },
    post: {
      findUnique: jest.fn().mockResolvedValue({
        id: 'mock-post-id',
        caption: 'Mock post',
        userId: 'mock-user-id'
      }),
      create: jest.fn().mockResolvedValue({
        id: 'mock-post-id',
        caption: 'Mock post',
        userId: 'mock-user-id'
      }),
    },
    $disconnect: jest.fn().mockResolvedValue(undefined),
  };
  
  return {
    __esModule: true,
    default: mockPrisma
  };
});

// Security test configuration - preserve original console but don't mock it
const originalConsole = { ...console };

// Increase timeout for security tests as they may involve multiple requests
jest.setTimeout(15000);

beforeAll(async () => {
  console.log('Starting Security Tests...');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('JWT Secret configured:', !!process.env.JWT_SECRET);
});

beforeEach(() => {
  // Clear all mocks before each test
  jest.clearAllMocks();
});

afterEach(() => {
  // Clear all mocks after each test
  jest.clearAllMocks();
});

afterAll(async () => {
  console.log('Security Tests Completed');
  
  // Clean up all mocks
  jest.restoreAllMocks();
  
  // Simple cleanup without accessing internal Node.js APIs
  // Let Jest handle the cleanup with forceExit
});
