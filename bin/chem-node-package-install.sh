#!/bin/bash

# This script build and installs a npm package from its source code
# source and version should be defined in .service-dependencies
# (nodejs and npm should be installed)
usage() {
    echo "Usage: $0 --destination <path> --package-name <name> --env-options <options>"
    echo
    echo "Options:"
    echo "  --package-name <name>    Specify the package name as defined in the .service-dependencies file - required"
    echo "  --destination <path>     Specify the relative destination directory for the build artifacts - default 'public/'"
    echo "  --env-options <options>  Specify environment options to be added to the .env file in the package source - optional"
    echo "  --tsconfig-path <path>   Specify the relative path in the package source to the tsconfig.json file - default '.'"
    echo "  --artifact               Specify the artifact to be copied - optional"
    echo "  --package-info           package info - optional default from .service-dependencies"
    echo "  --help                   Display this help message and exit"
    exit 0
}

# source utilities script from the same directory
source "$(dirname "$0")/chem-utils.sh"

# Initialize variables
destination="./public/"
package_name=""
env_options=""
tsconfig_dir="."
artifact_path="."

while [[ $# -gt 0 ]]; do
    case $1 in
       -n|--package-name)
            package_name="$2"
            shift 2
            ;;
        -d|--destination)
            destination="$2"
            shift 2
            ;;
	--tsconfig-path)
	   tsconfig_dir="$2"
	   shift 2
	   ;;
        -o|--env-options)
            env_options="$2"
            shift 2
            ;;
	-a|--artifact)
            artifact_path="$2"
	    shift 2
	    ;;
    -s|--package-src)
	    package_info="$2"
	    shift 2
	    ;;
    -v)
	    verbose=true
	    shift
	    ;;
	-h|--help)
	    usage
	    ;;
	*)
	    echo "Unknown option: $1"
	    usage
	    ;;
    esac
done


# Set up trap to clean up on exit
trap cleanup $tmpdir EXIT

# Determine the destination directory for copying build artifacts
destination=$(sanitize_dir_path "$destination")
dest_dir=$(sanitize_dir_path "${app_dir}${destination}")
# Filename where the version is stored
filename="${app_dir}.service-dependencies"
tsconfig_dir=$(sanitize_dir_path "$tsconfig_dir")
artifact_path=$(sanitize_dir_path "$artifact_path")

vecho "Installing $package_name - $(date)"
vecho "Working from app dir: $app_dir"
vecho "Destination directory: $destination"
vecho "Destination directory: $dest_dir"
vecho "Service file setting the version to install: $filename"
vecho "relative path to tsconfig.json: $tsconfig_dir'"
vecho "--env_options: $env_options"
vecho "Log file: $log_file"



# Check if the build artifacts already exist
if [[ -d "$dest_dir" && "$(ls -A $dest_dir)" ]]; then
    echo "Build artifacts already exist /in $dest_dir. Skipping clone, build, and copy steps."
    exit 0
fi

# Create a temporary directory
tmpdir=$(mktemp -d)
tmpdir=$(sanitize_dir_path "$tmpdir")
# Clone the specified repository and checkout the specified branch/version


# Clone the repository
# cloning single revision not implemented yet
# exit if ref type is a revision. ref_type should be branch or tag
ref_type=$(get_attribute $package_name "ref_type")
if [[ "$ref_type" == "revision" ]]; then
    vecho "Cloning single revision not implemented yet. Exiting."
    exit 1
fi

repo_url=$(get_attribute $package_name "repo_url")
branch=$(get_attribute $package_name "version")
vecho "Cloning branch $branch $repo_url"
if ! git clone --branch "$branch" --depth 1 --single-branch "$repo_url" "$tmpdir"; then
    vecho "Failed to clone the repository."
    exit 1
fi

vecho "Repository cloned into $tmpdir"

# Navigate to the subdirectory
cd "$tmpdir/" || exit

# modify .env file located in the same directory as the tsconfig.json
if [[ -n $env_options ]]; then
    vecho "Adding environment options to .env file: $env_options"
    env_options_formatted=$(echo "$env_options" | tr ' ,' '\n')
 
    echo -e "\n${env_options_formatted}" >> "${tsconfig_dir}.env"
fi

# Run npm install and npm build
if ! npm install --production=false || ! npm run build; then
    vecho "npm install or npm build failed."
    exit 1
fi

echo "npm install and npm build completed successfully."

# Extract outDir from tsconfig.json
# if mode json use jq to extract outDir else use yq
if [[ $mode == "json" ]]; then
   outDir=$(jq -r '.compilerOptions.outDir' ${tsconfig_dir}tsconfig.json)
else
   outDir=$(cat ${tsconfig_dir}tsconfig.json | yq -r  '.compilerOptions.outDir')
fi
vecho "outDir: $outDir"
if [[ $outDir == "null" ]]; then
    vecho "outDir not found in tsconfig.json."
    exit 1
fi

vecho "outDir found in tsconfig.json: $outDir"
outDir=$(sanitize_dir_path "$outDir")

# Determine the absolute path to the build artifacts
build_dir="${tmpdir}${tsconfig_dir}${outDir}${artifact_path}"
echo "Build directory: $build_dir"

# Create the destination directory if it doesn't exist
mkdir -p "$dest_dir"

# Copy the build artifacts to the destination directory
if ! cp -r "$build_dir"* "$dest_dir"; then
    vecho "Failed to copy build artifacts."
    exit 1
fi

vecho "Build artifacts copied to $dest_dir successfully."

