#!/bin/bash

# Prepare config files for use with the project:
# copy example config/*.yml.example files to actual config/*.yml files if not already present
# echo Warning if file already exist but differ from the current example one

for examplefile in config/{database,shrine,datacollectors,storage,radar}.yml.example; do
    configfile="${examplefile%.example}"
    if [ -f "$configfile" ]; then
        echo ">>> Config file $configfile already exists -> not overwriting"
        # diff with example file and notify if new version present
        if ! diff -q "$examplefile" "$configfile" > /dev/null; then
            echo ">>> WARNING: Config file $configfile differs from example file $examplefile. Please check for updates."
        fi
    else
        echo ">>> Copying example config file $examplefile to $configfile"
        cp "$examplefile" "$configfile"
    fi
done

# copy example .dockerenv.example to .dockerenv if not already present, so a
# developer can edit/persist overrides for subsequent runs. The first run does
# not depend on this — docker-compose.dev.yml has working defaults — because
# .dockerenv is a host-side file read at compose invocation, before this script
# runs inside the setup container.
if [ -f .dockerenv ]; then
    echo ">>> File .dockerenv already exists -> not overwriting"
else
    echo ">>> Copying example file .dockerenv.example to .dockerenv"
    cp .dockerenv.example .dockerenv
fi

# copy example public/welcome-message-sample.md to actual public/welcome-message.md if not already present
if [ -f public/welcome-message.md ]; then
    echo ">>> File public/welcome-message.md already exists -> not overwriting"
else
    echo ">>> Copying example file public/welcome-message-sample.md to public/welcome-message.md"
    cp public/welcome-message-sample.md public/welcome-message.md
fi
