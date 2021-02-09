
**Darker Python** provides integration with [darker](https://pypi.org/project/darker),
for incrementally adopting [black](https://pypi.org/project/black) auto-formatting in Python files.

Darker applies black formatting only to changed parts of the code.
If a file is untracked by version control,
darker will run black on the whole file instead.

This extension provides commands to format with both `darker` and `black`.


## Requirements

[darker](https://pypi.org/project/darker) must be installed and on $PATH
(or specified via absolute path in preferences).


## Usage

To apply `darker` to the current Python editor:

- Select the **Editor → Darker Python** menu item; or
- Open the command palette and type `Darker Python`

You can also enable darker on save (can be toggled separately for tracked and untracked files) via Extension preferences.

![screenshot](https://github.com/minrk/darker-python.novaextension/raw/main/Images/screenshot.png)

### Configuration


To configure global preferences, open **Extensions → Extension Library...** then select Darker Python's **Preferences** tab,
e.g. to enable format-on-save (can be enabled separately for tracked and untracked files)
