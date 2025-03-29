# PKGI README

**🇬🇧 EN** • [🇷🇺 RU](./README.RU.md)

*Means: Package Inspector*

This extension in automatically inspect the compliance of the established packages with the required (in `package.json`).

It does not depend on versions control systems. Can work with several Workspaces. Only root folders with `package.json` fall under observation.

## How does it work

Extension monitors changes in dependencies in `package.json`; updating `package-lock.json`, as well as changes in `node_modules`.

In case of detection of problems, notifies this.

You can also always start a forced check through [command pallete](#Commands)

Also, you can always call the command `Inspector: Check dependencies` for manual run inspection.

## Commands

| Команда | Сокращение | Описание |
|---------|------------|----------|
| `Inspector: Check dependencies` | `Inspect` | Launch for a compulsory check of dependencies |

## Extension Settings

**Coming soon**

## Release Notes

[Change log](./CHANGELOG.md)

### 0.1.0

The basic mechanism of the automatic inspection of compliance of the required and installed NPM packages
