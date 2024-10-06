#!/bin/bash

# Prepare database configuration files by renaming existing examples
rename_config_files() {
    local files_to_rename=(
        "database.yml.example"
        "shrine.yml.example"
        "storage.yml.example"
        "datacollectors.yml.example"
        # Add any other related file to rename here
    )

    for file in "${files_to_rename[@]}"; do
        correct_yml_file="./config/${file%.example}"

        if [ -f "$correct_yml_file" ]; then
            echo "$correct_yml_file already exists, skipping rename for $file"
        else
            if [ -f "./config/$file" ]; then
                mv "./config/$file" "$correct_yml_file"  # Remove .example from the filename
                echo "Renamed $file to ${file%.example}"
            else
                echo "$file does not exist, skipping rename"
                return 1
            fi
        fi
    done

    return 0
}

# Check for pending migrations
pending_migrations() {
    if bundle exec rails db:migrate:status | grep -q "down"; then
        return 0  # exists
    else
        return 1  # none
    fi
}