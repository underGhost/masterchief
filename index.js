#!/usr/bin/env node

const { spawnSync } = require("child_process");
const { writeFileSync, lstatSync, readdirSync } = require("fs");
const path = require("path");

const spawnOptions = {
    encoding: "utf-8"
};

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

// Arguments
const filePath = getArg("-p"); // Path to a single file or directory
const emailFilter = getArg("-e"); // Username according to git (ie: Devin Corrow)
const outputArg = getArg("-o"); // Output file path
const excludedExtensionsOpt = getArg("-x"); // Excluded extensions
const includedExtensionsOpt = getArg("-i"); // Included extensions

const outputFileName = "masterchief_report";

const { stdout: filesString } = spawnSync("git", ["ls-files", `${filePath || "."}`], spawnOptions);
let filesArr = filesString.split(/\r?\n/);

if (excludedExtensionsOpt) {
    const excludedExtensions = excludedExtensionsOpt.split(",");
    filesArr = filesArr.filter((f) => !excludedExtensions.some((ext) => f.includes(`.${ext}`)));
} else if (includedExtensionsOpt) {
    const includedExtensions = includedExtensionsOpt.split(",");
    filesArr = filesArr.filter((f) => includedExtensions.some((ext) => f.includes(`.${ext}`)));
}

const EMAIL_RE = /.*<((?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9]))\.){3}(?:(2(5[0-5]|[0-4][0-9])|1[0-9][0-9]|[1-9]?[0-9])|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\]))>.*/;

// get files
const fileReport = {};

for (index in filesArr) {
    const file = filesArr[index];
    if (file) {
        const { stdout: fileBlames } = spawnSync("git", ["blame", file, "-e"], spawnOptions);
        const lines = fileBlames.split(/\r?\n/);
        const rawContributors = {};

        for (line of lines) {
            const email = line.match(EMAIL_RE);
            if (email && email[1]) {
                if (emailFilter === email[1] || !emailFilter) {
                    if (!rawContributors[email[1]]) {
                        rawContributors[email[1]] = 0;
                    }
                    rawContributors[email[1]]++;
                }
            }
        }

        if (Object.keys(rawContributors).length) {
            const contributors = Object.entries(rawContributors).sort((a, b) => b[1] - a[1]).reduce((acc, entry) => {
                acc[entry[0]] = entry[1];
            return acc;
            }, {});

            const totalLines = Object.values(rawContributors).reduce((a, b) => a + b);

            const topContributor = Object.keys(rawContributors).reduce((keyA, keyB) =>
                contributors[keyA] < contributors[keyB] ? keyB : keyA
            );

            if (outputArg) {
                fileReport[file] = {
                    contributors,
                    total_lines: totalLines,
                    top_contributor: topContributor
                };
            } else {
                console.log(`
${file}:
    [-- Contributors --]
    ${Object.entries(contributors).map(c => `${c[0]}: ${c[1]}`).join("\r\n")}

    [-- Total Lines --]
    ${totalLines}

    [-- Top Contributor --]
    ${topContributor}
                `);
            }
        }
    }
}

if (outputArg) {
    const outputPath = outputArg ? `${path.resolve(outputArg)}/` : "./";
    const outputFile = `${outputPath}${outputFileName}.json`;
    // output report
    writeFileSync(outputFile, JSON.stringify(fileReport));
    console.log(`[Success]: File generated: ${outputFile}`);
}

