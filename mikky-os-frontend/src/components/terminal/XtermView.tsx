/**
 * XtermView - Encapsulated xterm.js terminal canvas
 * Renders terminal output with cyberpunk styling
 * Handles user input for interactive sessions
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';

export interface XtermViewProps {
    /** Unique session ID for this terminal */
    sessionId: string;
    /** If true, disable user input (for SYSTEM/scan tabs) */
    isReadOnly?: boolean;
    /** Callback when user presses Enter with a command */
    onCommand?: (command: string) => void;
    /** Log entries to display - will be written to terminal */
    logs?: Array<{ content: string; timestamp: number; _id: string }>;
    /** Optional className for container */
    className?: string;
}

export function XtermView({
    sessionId,
    isReadOnly = false,
    onCommand,
    logs = [],
    className = '',
}: XtermViewProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const terminalRef = useRef<Terminal | null>(null);
    const fitAddonRef = useRef<FitAddon | null>(null);
    const inputBufferRef = useRef<string>('');
    const lastLogIdRef = useRef<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    // Initialize terminal
    useEffect(() => {
        if (!containerRef.current || terminalRef.current) return;

        const terminal = new Terminal({
            theme: {
                background: '#000000',        // Pure black as specified
                foreground: '#e4e4e7',        // zinc-200
                cursor: '#06b6d4',            // cyan-500
                cursorAccent: '#000000',
                selectionBackground: '#06b6d433',
                black: '#18181b',             // zinc-900
                red: '#f43f5e',               // rose-500
                green: '#22c55e',             // green-500
                yellow: '#eab308',            // yellow-500
                blue: '#3b82f6',              // blue-500
                magenta: '#a855f7',           // purple-500
                cyan: '#06b6d4',              // cyan-500
                white: '#e4e4e7',             // zinc-200
                brightBlack: '#71717a',       // zinc-500
                brightRed: '#fb7185',         // rose-400
                brightGreen: '#4ade80',       // green-400
                brightYellow: '#facc15',      // yellow-400
                brightBlue: '#60a5fa',        // blue-400
                brightMagenta: '#c084fc',     // purple-400
                brightCyan: '#22d3ee',        // cyan-400
                brightWhite: '#fafafa',       // zinc-50
            },
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", Menlo, Monaco, "Courier New", monospace',
            fontSize: 13,
            lineHeight: 1.4,
            cursorBlink: !isReadOnly,
            cursorStyle: isReadOnly ? 'underline' : 'block',
            scrollback: 1000,
            allowProposedApi: true,
            convertEol: true,
        });

        const fitAddon = new FitAddon();
        terminal.loadAddon(fitAddon);

        terminal.open(containerRef.current);
        fitAddon.fit();

        terminalRef.current = terminal;
        fitAddonRef.current = fitAddon;

        // Handle user input for interactive terminals
        if (!isReadOnly) {
            terminal.onData((data) => {
                const code = data.charCodeAt(0);

                if (code === 13) {
                    // Enter key - execute command
                    const command = inputBufferRef.current.trim();
                    terminal.write('\r\n');

                    if (command && onCommand) {
                        onCommand(command);
                    }

                    inputBufferRef.current = '';
                } else if (code === 127 || code === 8) {
                    // Backspace
                    if (inputBufferRef.current.length > 0) {
                        inputBufferRef.current = inputBufferRef.current.slice(0, -1);
                        terminal.write('\b \b');
                    }
                } else if (code === 3) {
                    // Ctrl+C
                    terminal.write('^C\r\n');
                    inputBufferRef.current = '';
                    terminal.write('\x1b[32m❯\x1b[0m ');
                } else if (code >= 32) {
                    // Printable characters
                    inputBufferRef.current += data;
                    terminal.write(data);
                }
            });

            // Show initial prompt
            terminal.write('\x1b[32m❯\x1b[0m ');
        }

        setIsInitialized(true);

        // Cleanup
        return () => {
            terminal.dispose();
            terminalRef.current = null;
            fitAddonRef.current = null;
            setIsInitialized(false);
        };
    }, [sessionId, isReadOnly, onCommand]);

    // Handle resize
    useEffect(() => {
        const handleResize = () => {
            if (fitAddonRef.current && terminalRef.current) {
                try {
                    fitAddonRef.current.fit();
                } catch {
                    // Ignore resize errors during unmount
                }
            }
        };

        window.addEventListener('resize', handleResize);

        // Also fit when container might have changed
        const resizeObserver = new ResizeObserver(() => {
            handleResize();
        });

        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }

        return () => {
            window.removeEventListener('resize', handleResize);
            resizeObserver.disconnect();
        };
    }, [isInitialized]);

    // Write new logs to terminal
    useEffect(() => {
        if (!terminalRef.current || !isInitialized || logs.length === 0) return;

        const terminal = terminalRef.current;

        // Find new logs since last update
        let startIndex = 0;
        if (lastLogIdRef.current) {
            const lastIndex = logs.findIndex((log) => log._id === lastLogIdRef.current);
            if (lastIndex !== -1) {
                startIndex = lastIndex + 1;
            }
        }

        // Write new logs
        for (let i = startIndex; i < logs.length; i++) {
            const log = logs[i];
            terminal.write(log.content);
        }

        // Update last log reference
        if (logs.length > 0) {
            lastLogIdRef.current = logs[logs.length - 1]._id;
        }
    }, [logs, isInitialized]);

    // Clear terminal method (exposed via ref if needed)
    const clear = useCallback(() => {
        if (terminalRef.current) {
            terminalRef.current.clear();
            inputBufferRef.current = '';
            lastLogIdRef.current = null;
            if (!isReadOnly) {
                terminalRef.current.write('\x1b[32m❯\x1b[0m ');
            }
        }
    }, [isReadOnly]);

    // Expose clear method on the container element for parent access
    useEffect(() => {
        if (containerRef.current) {
            (containerRef.current as HTMLDivElement & { clear?: () => void }).clear = clear;
        }
    }, [clear]);

    return (
        <div
            ref={containerRef}
            className={`w-full h-full bg-black ${className}`}
            style={{ minHeight: '200px' }}
            data-session-id={sessionId}
        />
    );
}
