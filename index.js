#!/usr/bin/env node

const { execSync } = require("child_process");
const { writeFileSync, lstatSync, readdirSync } = require("fs");
const path = require("path");

const myArgs = process.argv.slice(2);

const getArg = (command) => {
    let val;
    if (command) {
        const commandIndex = myArgs.indexOf(command);
        if (commandIndex > -1) {
            return myArgs[commandIndex + 1] || null;
        }
    }
    return val;
};

const maxBuffer = 1024 * 5000;

// Arguments
const filePath = getArg("-p"); // Path to a single file or directory
const username = getArg("-u"); // Username according to git (ie: Devin Corrow)
const outputArg = getArg("-o"); // Output file path
const excludedExtensionsOpt = getArg("-x"); // Excluded extensions
const includedExtensionsOpt = getArg("-i"); // Included extensions

const outputPath = outputArg ? `${path.resolve(outputArg)}/` : "./";
const outputFileName = "masterchief_report";
const outputFile = `${outputPath}${outputFileName}.json`;

let filesString = execSync(`git ls-files ${filePath || ""}`, { maxBuffer }).toString();
let filesArr = filesString.split(/\r?\n/);

if (excludedExtensionsOpt) {
    const excludedExtensions = excludedExtensionsOpt.split(",");
    filesArr = filesArr.filter((f) => !excludedExtensions.some((ext) => f.includes(`.${ext}`)));
} else if (includedExtensionsOpt) {
    const includedExtensions = includedExtensionsOpt.split(",");
    filesArr = filesArr.filter((f) => includedExtensions.some((ext) => f.includes(`.${ext}`)));
}

const NAME_RE = /\(([A-z]+[\s|.]?[A-z]+)\s+.*\)/;

// get files
const fileReport = {};

for (index in filesArr) {
    const file = filesArr[index];
    if (file) {
        const fileBlames = execSync(`git blame ${file}`, { maxBuffer }).toString();
        const lines = fileBlames.split(/\r?\n/);
        const contributors = {};

        for (line of lines) {
            const name = line.match(NAME_RE);
            if (name && name[1]) {
                if (username === name[1] || !username) {
                    if (!contributors[name[1]]) {
                        contributors[name[1]] = 0;
                    }
                    contributors[name[1]]++;
                }
            }
        }

        if (Object.keys(contributors).length) {
            fileReport[file] = {};
            fileReport[file].contributors = contributors;
            fileReport[file].total_lines = Object.values(fileReport[file].contributors).reduce((a, b) => a + b);
            fileReport[file].top_contributor = Object.keys(fileReport[file].contributors).reduce((keyA, keyB) =>
                fileReport[file].contributors[keyA] < fileReport[file].contributors[keyB] ? keyB : keyA
            );
        }
    }
}

// output report
writeFileSync(outputFile, JSON.stringify(fileReport));

console.log(`[Success]: File generated: ${outputFile}`);
