import { describe, it, expect } from 'vitest';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

describe('CLI Build', () => {
    it('should build successfully and generate dist/ui.js', () => {
        // Run build
        execSync('npm run build', { cwd: path.resolve(__dirname, '../') });
        
        const uiJsPath = path.resolve(__dirname, '../dist/ui.js');
        expect(fs.existsSync(uiJsPath)).toBe(true);
    });
});