import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function readDegreePlan(degreeCode) {
    const filePath = path.join(__dirname, '../degreeplans', `${degreeCode}.txt`);
    console.log(`Reading degree plan file: ${filePath}`);
    try {
        const data = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);
        const formattedLines = [];
        for (const line of data) {
            // Stop on first blank line
            if (line.trim() === '') break;
            // Wrap line in single quotes and push to array
            formattedLines.push(line.trim());
        }
        return formattedLines;
    } catch (err) {
        console.error(`Error reading file: ${filePath}`, err);
        return null;
    }
}