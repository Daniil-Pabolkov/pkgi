# Change Log

## 0.1.2

- Added the result of scanning into a separate output channel for each project;
- Fixed a frequent scan error while dependencies are installing (with a sufficiently large number of dependencies);
- Fixed error scanning all projects when only one of them changed (some of them)
- Fixed an error of dependencies due to which the extension could fall.

## 0.1.1

Fixed a bug where package inspection was performed after each package change.json, even if the file became invalid or fields unrelated to dependencies changed.

## 0.1.0

- Initial release