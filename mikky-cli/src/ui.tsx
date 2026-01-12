import React from 'react';
import { Text, Box } from 'ink';

export const App = () => (
	<Box borderStyle="single" borderColor="cyan" padding={1} flexDirection="column">
		<Text>
			Welcome to <Text color="cyan" bold>MIKKY OS</Text> CLI
		</Text>
        <Text dimColor>
            Cyberpunk Pentesting Agent v1.0.0
        </Text>
	</Box>
);