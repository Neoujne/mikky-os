
import React from 'react';
import { Box, Text } from 'ink';
import TextInput from 'ink-text-input';

interface Props {
	value: string;
	onChange: (value: string) => void;
	onSubmit: (value: string) => void;
	placeholder?: string;
}

export const ChatInput: React.FC<Props> = ({ value, onChange, onSubmit, placeholder = "Type a message..." }) => {
	return (
		<Box borderStyle="round" borderColor="cyan" paddingX={1}>
			<Box marginRight={1}>
				<Text color="cyan" bold>{'>'}</Text>
			</Box>
			<TextInput
				value={value}
				onChange={onChange}
				onSubmit={onSubmit}
				placeholder={placeholder}
			/>
		</Box>
	);
};
