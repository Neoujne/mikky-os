import React, { useState, useRef } from 'react';
import { Box, useInput } from 'ink';
import { MessageList, Message } from './components/MessageList.js';
import { ChatInput } from './components/ChatInput.js';
import { ScrollViewRef } from 'ink-scroll-view';

export const App = () => {
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const scrollRef = useRef<ScrollViewRef>(null);

    useInput((input, key) => {
        if (key.upArrow) {
            scrollRef.current?.scrollBy(-1);
        }
        if (key.downArrow) {
            scrollRef.current?.scrollBy(1);
        }
    });

    const handleSubmit = (value: string) => {
        if (!value.trim()) return;
        setMessages([...messages, { role: 'user', content: value }]);
        setInput('');
        
        // Mock response
        setTimeout(() => {
            setMessages(prev => [...prev, { role: 'assistant', content: `I received your message: "${value}". I'm analyzing the target now...` }]);
            scrollRef.current?.scrollToBottom();
        }, 1000);
    };

	return (
		<Box flexDirection="column" height="100%">
            {/* Chat History Area */}
            <Box flexDirection="column" flexGrow={1} borderStyle="single" borderColor="cyan">
                <MessageList messages={messages} />
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