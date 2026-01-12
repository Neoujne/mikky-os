
import React, { useState, useRef, useEffect } from 'react';
import { Box, useInput, Text } from 'ink';
import Spinner from 'ink-spinner';
import { MessageList, Message } from './components/MessageList.js';
import { ChatInput } from './components/ChatInput.js';
import { LogStream } from './components/LogStream.js';
import { AuthPrompt } from './components/AuthPrompt.js';
import { ScrollViewRef } from 'ink-scroll-view';
import { getAgentClient, AgentStatus } from './lib/agent-client.js';

export const App = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [status, setStatus] = useState<AgentStatus['status'] | 'idle'>('idle');
    const [thought, setThought] = useState<string>('');
    const [logs, setLogs] = useState<string[]>([]);
    const scrollRef = useRef<ScrollViewRef>(null);
    const agentClient = getAgentClient();

    useInput((input, key) => {
        if (key.upArrow) {
            scrollRef.current?.scrollBy(-1);
        }
        if (key.downArrow) {
            scrollRef.current?.scrollBy(1);
        }
    });

    const handleSubmit = async (value: string) => {
        if (!value.trim() || status !== 'idle') return;
        
        const userMsg: Message = { role: 'user', content: value };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setStatus('thinking');
        setThought('Connecting to agent...');
        setLogs([]);

        try {
            // We'll manually implement polling here to update state in real-time for Ink
            // instead of using agentClient.chat() which is blocking
            const response = await fetch(`${agentClient['baseUrl']}/api/agent/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ message: value, sessionId: agentClient.getSessionId() })
            });

            if (!response.ok) throw new Error('Failed to send message');

            startPolling();
        } catch (err) {
            setStatus('failed');
            setThought(`Error: ${(err as Error).message}`);
        }
    };

    const startPolling = () => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch(`${agentClient['baseUrl']}/api/agent/status/${agentClient.getSessionId()}`);
                if (!response.ok) return;
                
                const data: AgentStatus = await response.json();
                setStatus(data.status);
                setThought(data.thought || '');
                setLogs(data.logs || []);

                if (data.status === 'completed' || data.status === 'failed') {
                    clearInterval(interval);
                    if (data.finalResponse) {
                        setMessages(prev => [...prev, { role: 'assistant', content: data.finalResponse! }]);
                    }
                    setStatus('idle');
                    setThought('');
                    setTimeout(() => scrollRef.current?.scrollToBottom(), 100);
                }
            } catch (err) {
                console.error('Polling error:', err);
            }
        }, 1000);
    };

	return (
		<Box flexDirection="column" height="100%">
            {/* Header */}
            <Box paddingX={1} borderStyle="single" borderColor="cyan" justifyContent="space-between">
                <Text bold color="cyan">MIKKY OS</Text>
                <Text dimColor>Session: {agentClient.getSessionId()}</Text>
            </Box>

            {/* Chat History Area */}
            <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="cyan" marginTop={-1}>
                <MessageList messages={messages} />
                
                {status !== 'idle' && (
                    <Box flexDirection="column" paddingX={1} marginBottom={1}>
                        <Box>
                            <Text color="cyan">
                                <Spinner type="dots" />
                            </Text>
                            <Text bold color="cyan"> {status.toUpperCase()}: </Text>
                            <Text italic>{thought}</Text>
                        </Box>
                        <LogStream logs={logs} />
                    </Box>
                )}
            </Box>

            {/* Input Area */}
            <ChatInput 
                value={input} 
                onChange={setInput} 
                onSubmit={handleSubmit} 
                placeholder={status === 'idle' ? "Type a message..." : "Agent is busy..."}
            />
		</Box>
	);
};
