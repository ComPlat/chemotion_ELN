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
    echo "  --help                   Display this help message and exit"
    exit 0
}

# Initialize variables
destination="./public/"
package_name=""
env_options=""
tsconfig_dir="."
artifact_path="."

while [[ $# -gt 0 ]]; do
    case $1 in
       --package-name)
            package_name="$2"
            shift 2
            ;;
        --destination)
            destination="$2"
            shift 2
            ;;
	--tsconfig-path)
	   tsconfig_dir="$2"
	   shift 2
	   ;;
        --env-options)
            env_options="$2"
            shift 2
            ;;
	--artifact)
            artifact_path="$2"
	    shift 2
	    ;;
	--help)
	  usage
	  ;;
        *)
            echo "Invalid option: $1"
            usage
            ;;
    esac
done

# Function to clean up temporary directory
cleanup() {
    if [[ -n $tmpdir ]]; then
        rm -rf "$tmpdir"
        echo "Temporary directory $tmpdir removed." >> "$log_file"
    fi
}

# sanityse directory path
sanitize_dir_path() {
    local path="$1"
    # Remove leading `./` if present
    if [[ "$path" == "./" ]]; then
        echo ""
        return
    fi
    
    path="${path#./}"
    
    # Ensure the path ends with `/` if it's not empty and doesn't already end with `/`
    if [[ -n "$path" && "${path: -1}" != "/" ]]; then
        path="$path/"
    fi
    
    echo "$path"
}

# Set up trap to clean up on exit
trap cleanup EXIT

# Redirect all output to log file
exec > >(tee -a "$log_file") 2>&1

# define sanitysed directory paths 
script_dir=$(dirname "$(realpath "$0")")
script_dir=$(sanitize_dir_path "$script_dir")
app_dir=$(realpath "${script_dir}..")
app_dir=$(sanitize_dir_path "$app_dir")
# Determine the destination directory for copying build artifacts
destination=$(sanitize_dir_path "$destination")
dest_dir=$(sanitize_dir_path "${app_dir}${destination}")
# Filename where the version is stored
filename="${app_dir}.service-dependencies"
log_file="${app_dir}log/install_${package_name}.log"
tsconfig_dir=$(sanitize_dir_path "$tsconfig_dir")
artifact_path=$(sanitize_dir_path "$artifact_path")

echo "Installing $package_name - $(date)"
echo "Working from app dir: $app_dir"
echo "Destination directory: $destination"
echo "Destination directory: $dest_dir"
echo "Service file setting the version to install: $filename"
echo "relative path to tsconfig.json: $tsconfig_dir'"
echo "--env_options: $env_options"
echo "Log file: $log_file"


# Check if the file exists in the current directory
if [[ ! -f $filename ]]; then
    echo "File $filename not found in the current directory."
    exit 1
fi

echo "File $filename found."

# Extract the line starting with $package_name
line=$(grep "^${package_name}=" "$filename")

# Check if the line was found
if [[ -z $line ]]; then
    echo "No ${package_name} version specified/ in $filename."
    exit 1
fi

# Extract the value after the '=' character
value=${line#*=}

# Check if the extracted value matches the expected format
if [[ ! $value =~ ^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+$ ]]; then
    echo "No ${package_name} version extracted from $filename."
    echo "The extracted value does not match the expected format."
    exit 1
fi

echo "Found version to install: $value"

# Extract parts of the value
repo=${value%@*}  # part before '@' (user/repo)
ref=${value#*@}   # part after '@' (branch/version)

# Check if the build artifacts already exist
if [[ -d "$dest_dir" && "$(ls -A $dest_dir)" ]]; then
    echo "Build artifacts already exist /in $dest_dir. Skipping clone, build, and copy steps."
    exit 0
fi

# Create a temporary directory
tmpdir=$(mktemp -d)
tmpdir=$(sanitize_dir_path "$tmpdir")
# Clone the specified repository and checkout the specified branch/version

if ! git clone --branch "$ref" --depth 1 --single-branch "https://github.com/$repo" "$tmpdir"; then
    echo "Failed to clone the repository."
    exit 1
fi

echo "Repository cloned into $tmpdir"


# Navigate to the subdirectory
cd "$tmpdir/" || exit

# modify .env file located in the same directory as the tsconfig.json
if [[ -n $env_options ]]; then
    echo "Adding environment options to .env file: $env_options"
    env_options_formatted=$(echo "$env_options" | tr ' ,' '\n')
 
    echo -e "\n${env_options_formatted}" >> "$tsconfig_dir/.env"
fi

# Run npm install and npm build
if ! npm install || ! npm run build; then
    echo "npm install or npm build failed."
    exit 1
fi

echo "npm install and npm build completed successfully."

# Extract outDir from tsconfig.json
outDir=$(jq -r '.compilerOptions.outDir' ${tsconfig_dir}tsconfig.json)

if [[ $outDir == "null" ]]; then
    echo "outDir not found in tsconfig.json."
    exit 1
fi

echo "outDir found in tsconfig.json: $outDir"
outDir=$(sanitize_dir_path "$outDir")

# Determine the absolute path to the build artifacts
build_dir="${tmpdir}${tsconfig_dir}${outDir}${artifact_path}"
echo "Build directory: $build_dir"

# Create the destination directory if it doesn't exist
mkdir -p "$dest_dir"

# Copy the build artifacts to the destination directory
if ! cp -r "$build_dir"* "$dest_dir"; then
    echo "Failed to copy build artifacts."
    exit 1
fi

echo "Build artifacts copied to $dest_dir successfully."

