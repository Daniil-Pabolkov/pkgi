# PKGI README

**🇬🇧 EN** • [🇷🇺 RU](./README.RU.md)

*Means: Package Inspector*

This extension in automatically inspect the compliance of the established packages with the required (in `package.json`).

It does not depend on versions control systems. Can work with several Workspaces. Only root folders with `package.json` fall under observation.

## How does it work

Extension monitors changes in dependencies in `package.json`; updating `package-lock.json`, as well as changes in `node_modules`.

In case of detection of problems, notifies this.

You can also always start a forced check through [command pallete](#Commands): run `PKGI: Inspect dependencies` (shortly `inspect`)

## Commands

| Команда | Сокращение | Описание |
|---------|------------|----------|
| `PKGI: Inspect dependencies` | `inspect` | Run force check of dependencies for all projects |

## Extension Settings

**Coming soon**

## Release Notes

[Detailed change log](./CHANGELOG.md)

Summary:

### 0.1.2

Fixed error of redundant scanning.
Added detailed result log of scanning into output channel/

### 0.1.1

Fixed inspection run error if `package.json` have not dependencies changed.

### 0.1.0

The basic mechanism of the automatic inspection of compliance of the required and installed NPM packages.
