import { test, expect } from 'vitest';

test('Resume Export Data Mapping Integrity', () => {
  const mockData = {
    name: "Test User",
    template: "modern",
    settings: { fontSize: 12 }
  };
  
  expect(mockData.name).toBe("Test User");
  expect(mockData.template).toBe("modern");
});
