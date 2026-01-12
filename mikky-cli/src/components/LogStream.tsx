
import React, { useState } from 'react';
import { Box, Text } from 'ink';

interface Props {
    logs: string[];
}

export const LogStream: React.FC<Props> = ({ logs }) => {
    const [expanded, setExpanded] = useState(true);

    if (logs.length === 0) return null;

    return (
        <Box flexDirection="column" borderStyle="classic" borderColor="gray" paddingX={1} marginTop={1}>
            <Box justifyContent="space-between">
                <Text bold color="gray">RUN LOGS ({logs.length})</Text>
                <Text dimColor>[Arrows to Scroll]</Text>
            </Box>
            
            {expanded && (
                <Box flexDirection="column" marginTop={1}>
                    {logs.map((log, i) => (
                        <Text key={i} color="gray">
                            <Text dimColor>│</Text> {log}
                        </Text>
                    ))}
                </Box>
            )}
        </Box>
    );
};
