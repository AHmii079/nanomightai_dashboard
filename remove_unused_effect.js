const fs = require('fs');
const path = 'c:/Users/ahmad/Downloads/final final/xdial-dev/src/ClientDashboard.jsx';

const content = fs.readFileSync(path, 'utf8');
const lines = content.split('\n');

// Find start line
const startMarker = '// Fetch trend timeseries data for the reports section';
const startIdx = lines.findIndex(line => line.includes(startMarker));

if (startIdx === -1) {
    console.error('Start marker not found');
    process.exit(1);
}

console.log(`Found start marker at line ${startIdx + 1}`);

// Find the end line
// The next section starts with "// Fetch transfer metrics from API"
const nextSectionMarker = '// Fetch transfer metrics from API';
const endIdx = lines.findIndex((line, idx) => idx > startIdx && line.includes(nextSectionMarker));

if (endIdx === -1) {
    console.error('End marker not found');
    process.exit(1);
}

console.log(`Found end marker at line ${endIdx + 1}`);

// Remove lines from startIdx to endIdx - 1
// We want to keep the next section marker.
// Also remove preceding empty lines if any? nah.

const linesToRemove = lines.slice(startIdx, endIdx);
console.log(`Removing ${linesToRemove.length} lines`);

const newLines = [
    ...lines.slice(0, startIdx),
    ...lines.slice(endIdx)
];

fs.writeFileSync(path, newLines.join('\n'), 'utf8');
console.log('Successfully removed unused useEffect from ClientDashboard.jsx');
