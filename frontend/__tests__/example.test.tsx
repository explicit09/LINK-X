import React from 'react';
import { render, screen } from '@testing-library/react';

// Simple test to ensure Jest is working
describe('Example Test', () => {
  it('should pass a basic test', () => {
    expect(true).toBe(true);
  });

  it('should render a component', () => {
    const TestComponent = () => <div>Hello Test</div>;
    render(<TestComponent />);
    expect(screen.getByText('Hello Test')).toBeInTheDocument();
  });
});