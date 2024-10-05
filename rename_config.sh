#!/bin/bash

# Function to rename prepare database configuration files
rename_config_files() {
    local files_to_rename=(
        "database.yml.example"
        "shrine.yml.example"
        "storage.yml.example"
        # Add other files you want to rename here
    )

    for file in "${files_to_rename[@]}"; do
        correct_yml_fileyml_file="./config/${file%.example}"

        if [ -f "$correct_yml_fileyml_file" ]; then
            echo "$correct_yml_fileyml_file already exists, skipping rename for $file"
        else
            if [ -f "./config/$file" ]; then
                mv "./config/$file" "$correct_yml_fileyml_file"  # Remove .example from the filename
                echo "Renamed $file to ${file%.example}"
            else
                echo "$file does not exist, skipping rename"
                return 1
            fi
        fi
    done

    return 0
}