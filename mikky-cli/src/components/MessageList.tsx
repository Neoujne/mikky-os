
import React from 'react';
import { Box, Text } from 'ink';
import { ScrollView } from 'ink-scroll-view';

export interface Message {
    role: 'user' | 'assistant' | 'system' | 'tool';
    content: string;
}

interface Props {
    messages: Message[];
}

export const MessageList: React.FC<Props> = ({ messages }) => {
    return (
        <ScrollView>
            <Box flexDirection="column" paddingX={1}>
                {messages.length === 0 && (
                    <Box marginTop={1}>
                        <Text dimColor italic>No messages yet. Audit your SaaS project by typing below.</Text>
                    </Box>
                )}
                {messages.map((msg, i) => (
                    <Box key={i} flexDirection="column" marginTop={1}>
                        <Text bold color={getMessageColor(msg.role)}>
                            {msg.role.toUpperCase()}:
                        </Text>
                        <Box paddingLeft={2}>
                            <Text>{msg.content}</Text>
                        </Box>
                    </Box>
                ))}
            </Box>
        </ScrollView>
    );
};

function getMessageColor(role: Message['role']): string {
    switch (role) {
        case 'user': return 'green';
        case 'assistant': return 'cyan';
        case 'system': return 'yellow';
        case 'tool': return 'magenta';
        default: return 'white';
    }
}
