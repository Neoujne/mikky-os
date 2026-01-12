
import React from 'react';
import { render } from 'ink-testing-library';
import { describe, it, expect, vi } from 'vitest';
import { ChatInput } from './ChatInput.js';

describe('ChatInput', () => {
	it('should render with placeholder', () => {
		const { lastFrame } = render(
			<ChatInput value="" onChange={() => {}} onSubmit={() => {}} placeholder="Test Placeholder" />
		);

		expect(lastFrame()).toContain('Test Placeholder');
	});

    it('should show value when typed', () => {
		const { lastFrame } = render(
			<ChatInput value="Hello MIKKY" onChange={() => {}} onSubmit={() => {}} />
		);

		expect(lastFrame()).toContain('Hello MIKKY');
	});
});
