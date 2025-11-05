import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import ChatMessage from './ChatMessage';

vi.mock('../services/api');

describe('ChatMessage', () => {
  it('renders user message correctly', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      content: 'Hello, this is a test message',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Hello, this is a test message')).toBeInTheDocument();
  });

  it('renders assistant message correctly', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      content: 'This is an assistant response',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('This is an assistant response')).toBeInTheDocument();
  });

  it('shows feedback buttons for assistant messages', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      content: 'Response',
    };

    render(<ChatMessage message={message} />);

    expect(screen.getByText('Utile')).toBeInTheDocument();
    expect(screen.getByText('Pas utile')).toBeInTheDocument();
  });

  it('does not show feedback buttons for user messages', () => {
    const message = {
      id: '1',
      role: 'user' as const,
      content: 'Question',
    };

    render(<ChatMessage message={message} />);

    expect(screen.queryByText('Utile')).not.toBeInTheDocument();
    expect(screen.queryByText('Pas utile')).not.toBeInTheDocument();
  });

  it('shows feedback form when clicking on feedback button', () => {
    const message = {
      id: '2',
      role: 'assistant' as const,
      content: 'Response',
    };

    render(<ChatMessage message={message} />);

    fireEvent.click(screen.getByText('Utile'));

    expect(screen.getByPlaceholderText('Commentaire optionnel...')).toBeInTheDocument();
    expect(screen.getByText('Envoyer')).toBeInTheDocument();
  });
});
