import { describe, it, expect, vi, beforeEach } from 'vitest';

// 1. Mock Convex
vi.mock('./convex.js', () => ({
    convex: {
        mutation: vi.fn(),
        query: vi.fn(),
    }
}));

// 2. Define mocks using vi.hoisted
const { mockCreateContainer, mockListContainers, mockListImages, mockGetContainer } = vi.hoisted(() => {
    return {
        mockCreateContainer: vi.fn(),
        mockListContainers: vi.fn(),
        mockListImages: vi.fn(),
        mockGetContainer: vi.fn(),
    };
});

// 3. Mock Dockerode
vi.mock('dockerode', () => {
    return {
        default: class MockDocker {
            createContainer = mockCreateContainer;
            listContainers = mockListContainers;
            listImages = mockListImages;
            getContainer = mockGetContainer;
        }
    };
});

import { WorkerManager } from './docker';

describe('WorkerManager', () => {
    let workerManager: WorkerManager;

    beforeEach(() => {
        vi.clearAllMocks();
        
        // Setup default mock behaviors
        mockCreateContainer.mockResolvedValue({
            start: vi.fn().mockResolvedValue(undefined),
            wait: vi.fn().mockResolvedValue({ StatusCode: 0 }),
            logs: vi.fn().mockResolvedValue(Buffer.from('')), 
            remove: vi.fn().mockResolvedValue(undefined),
            kill: vi.fn().mockResolvedValue(undefined),
             exec: vi.fn().mockResolvedValue({
                 start: vi.fn().mockResolvedValue({}),
                 inspect: vi.fn().mockResolvedValue({ ExitCode: 0 })
            })
        });
        mockListContainers.mockResolvedValue([]);
        mockListImages.mockResolvedValue([]);
        
        // Reset singleton
        (WorkerManager as any).instance = undefined;
        // Re-instantiate to use fresh mocks
        workerManager = WorkerManager.getInstance();
    });

    it('runTool should create container with Privileged: true and correct CapAdd', async () => {
        const options = {
            command: 'nmap -F localhost',
            scanRunId: 'test-scan',
            stage: 'test',
            tool: 'nmap'
        };

        // Mock demuxDockerStream
        (workerManager as any).demuxDockerStream = vi.fn().mockResolvedValue({ stdout: '', stderr: '' });

        await workerManager.runTool(options);

        expect(mockCreateContainer).toHaveBeenCalledWith(expect.objectContaining({
            HostConfig: expect.objectContaining({
                Privileged: true,
                CapAdd: expect.arrayContaining(['NET_ADMIN', 'NET_RAW'])
            })
        }));
    });
});