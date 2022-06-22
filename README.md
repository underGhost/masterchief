# Master Chief

Find out who the top contributors are for the files in your projects.

## Usage

```
$ npm i masterchief
$ npx masterchief [...opts]
```

## Options

1. `-p /some/path`: Path to directory/file to run. Default is the current working directory.
2. `-u underGhost`: Git username to filter by
3. `-o /some/path`: Path of where to output file. File name is `masterchief_report.json` and defaults to the current working directory.
4. `-x less,js`: File extensions to exclude, `,` delimited.
5. `-i tsx,json`: File extensions to include
