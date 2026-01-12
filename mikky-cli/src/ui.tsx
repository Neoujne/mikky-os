
import React, { useState } from 'react';
import { Text, Box } from 'ink';
import { ChatInput } from './components/ChatInput.js';

export const App = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<{role: string, content: string}[]>([]);

    const handleSubmit = (value: string) => {
        if (!value.trim()) return;
        setMessages([...messages, { role: 'user', content: value }]);
        setInput('');
        // Trigger backend here later
    };

	return (
		<Box flexDirection="column" height="100%">
            {/* Chat History Area */}
            <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="cyan" paddingX={1}>
                <Text color="cyan" bold underline>MIKKY OS - SESSION ACTIVE</Text>
                {messages.length === 0 && (
                    <Box marginTop={1}>
                        <Text dimColor italic>No messages yet. Audit your SaaS project by typing below.</Text>
                    </Box>
                )}
                {messages.map((msg, i) => (
                    <Box key={i} marginTop={1}>
                        <Text bold color={msg.role === 'user' ? 'green' : 'white'}>
                            {msg.role === 'user' ? 'YOU' : 'MIKKY'}:
                        </Text>
                        <Text> {msg.content}</Text>
                    </Box>
                ))}
            </Box>

            {/* Input Area */}
            <ChatInput 
                value={input} 
                onChange={setInput} 
                onSubmit={handleSubmit} 
            />
		</Box>
	);
};
