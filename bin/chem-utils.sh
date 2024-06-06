# shell utilities for chemotion dep installation

# Sanitized directory paths 
#  so that to not worryi about double slashes
# @param $1: the directory path
# @return: the directory path with removed trailing slash and
#   with removed leading dot-slash
function sanitize_dir_path {
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
    

    # remove '//' from  path
    path=$(echo $path | sed 's/\/\//\//g')

    echo "$path"
}


# Function to clean up temporary directory
# @param $1: list of directory to clean up
function cleanup {
# rm tmp dir if defined
    for dir in "$@"; do
	if [[ -n $dir ]]; then
	    rm -rf "$dir"
	    vecho "Directory $dir removed."
	fi
    done
}


# function to echo message if verbose is set
function vecho {
    if [ "$verbose" = true ]; then
	echo "$package_name install: $1"
    fi
    # log the message to the log file if defined
    if [ -n "$log_file" ]; then
	echo "$package_name install: $1" >> "$log_file"
    fi
}

function log_only {
  if [ -n "$log_file" ]; then
    # Redirect all output to log file
    exec > >(tee -a "$log_file") 2>&1
  fi
}



# define sanitized directory paths 
script_dir=$(dirname "$(realpath "$0")")
script_dir=$(sanitize_dir_path "$script_dir")
app_dir=$(realpath "${script_dir}..")
app_dir=$(sanitize_dir_path "$app_dir")

# define the parsed service info file
dep_json="${app_dir}tmp/.service-dependencies.json"
dep_yml="${app_dir}tmp/.service-dependencies.yml"



# define whether jq or yq is installed
if [ -x "$(command -v jq)" ]; then
  mode="json"
elif [ -x "$(command -v yq)" ]; then
  mode="yml"
else
  echo "Error: jq or yq is required to run this script"
  vecho "Error: jq or yq is required to run this script"
  exit 1
fi

# WIP force yq mode
# mode="yml"

get_attribute() {
    local package_name="$1"
    local attribute="$2"
    local package_type="${3:-standalone}"
    local attribute_value=""
    if [[ $mode == "json" ]]; then
      local attribute_value=$(jq -r ".${package_name}.${attribute}" $dep_json)
    elif [[ $mode == "yml" ]]; then
      local attribute_value=$(yq ".${package_name}.${attribute}" $dep_yml)
    fi
    # if attribute is assets_urls, grep by package_type
    if [[ $attribute == "assets_urls" ]]; then
      local attribute_value=$(echo "$attribute_value" | grep -o -E "https://.*${package_type}-[^\"]*") > /dev/null
    fi
    echo "$attribute_value"
}
#
