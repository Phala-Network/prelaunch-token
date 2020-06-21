const fs = require('fs');
const parse = require('csv-parse/lib/sync');

function loadcsv (path) {
    const input = fs.readFileSync(path, 'utf-8');
    return parse(input, {
        columns: true,
        skip_empty_lines: true
    })
}

module.exports = loadcsv;