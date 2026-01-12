
import React, { useState } from 'react';
import { Box, Text } from 'ink';
import SelectInput from 'ink-select-input';

interface Props {
    message: string;
    onSelect: (choice: 'yes' | 'no') => void;
}

export const AuthPrompt: React.FC<Props> = ({ message, onSelect }) => {
    const [selected, setSelected] = useState<string | null>(null);

    const items = [
        { label: 'Yes, proceed', value: 'yes' },
        { label: 'No, abort', value: 'no' }
    ];

    const handleSelect = (item: { value: string }) => {
        if (selected) return; // Lock state
        const choice = item.value as 'yes' | 'no';
        setSelected(choice);
        onSelect(choice);
    };

    return (
        <Box flexDirection="column" borderStyle="round" borderColor={selected ? 'gray' : 'yellow'} paddingX={1} marginTop={1}>
            <Text bold color="yellow">AUTHORIZATION REQUIRED</Text>
            <Text>{message}</Text>
            
            {selected ? (
                <Box marginTop={1}>
                    <Text>Selected: </Text>
                    <Text bold color={selected === 'yes' ? 'green' : 'red'}>
                        {selected.toUpperCase()}
                    </Text>
                </Box>
            ) : (
                <Box marginTop={1}>
                    <SelectInput items={items} onSelect={handleSelect} />
                </Box>
            )}
        </Box>
    );
};
