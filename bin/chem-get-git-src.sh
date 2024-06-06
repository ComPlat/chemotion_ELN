#!/bin/bash

# source utilities function located in the same directory
source $(dirname $0)/chem-utils.sh


# This script reads the version for a package as defined in the ../.service-dependencies file
# @param $1: the package name
# @return: the version of the package and the git repository as json or yml object 

function get_git_src() {

 # dependencies lock
 local dep_filename=".service-dependencies"
 local dependencies="${app_dir}${dep_filename}"
 local ref=""
 local version=""
 local ref_type=""
 local repo=""
 local repo_url=""

# check whether jq or yq are installed. need one of them (jq default) to output json or yml
# if none installed, exit with error
# if both installed, use jq as default
# remember which one is used as $mode
# local mode="json"

  get_git_src_usage() {
    echo "Usage: $0 --package-name <name>"
    echo
    echo "  -n, --package-name <name>        Specify the package name as defined in the .service-dependencies file - required"
    echo "  -s, --package-src  <src@version> Set the src and version - optional default from .service-dependencies"
    echo "  -p, --parse-only                 Do not try to get the assets urls from github"
    exit 0
  }

# Initialize variables
package_name=""

while [[ $# -gt 0 ]]; do
    case $1 in
       -n|--package-name)
            package_name="$2"
            shift 2
            ;;
       -p|--parse-only)
            parse_only=true
	    shift
	;;
 -s|--package-src)
            package_src="$2"
	    shift 2
	;;
	-h|--help)
	  get_git_src_usage
	  ;;

        *)
  echo "hello $1"
            echo "Invalid option: $1"
  #          usage
            ;;
    esac
done

############################################################################################################
# Local functions
############################################################################################################

# Function that extracts a line starting with the package name
# or build the line if package_src is provided
# @param $1: the package name
# @return: the info after the "$package_name=" part if the line is valid
get_package_src() {
    local package_name="$1"
    local line=$(grep -E "^${package_name}=" "$dependencies")	
    if [[ -z $line ]]; then
        vecho "No ${package_name} version specified/ in $dep_filename."
        exit 1
    fi
    # package_src=$(echo "$line" | cut -d'=' -f2)
    package_src=${line#*=}
    vecho "Package source: $package_src"
}

# Function that validates the package info
# @param $1: the package name src info
validate_package_info() {
    local info_src="$1"
    if [[ ! $info_src =~ ^[a-zA-Z0-9_-]+/[a-zA-Z0-9_-]+@[a-zA-Z0-9_.-]+$ ]]; then
      # echo invalid version and exit
      vecho "Invalid version format for $package_name in $dep_filename."
      # return empty string
      exit 1
    fi
    vecho "Valid version format: $info_src"
    repo=${info_src%@*}  # part before '@' (user/repo)
    repo_url="https://github.com/$repo"
    version=${info_src#*@}  # part after '@' (version)
    ref=${info_src#*@}   # part after '@' (branch/version/revision)
    ref_type="tag"

    # if ref is an hexademical string, it is a revision
    # otherwise it is a branch or a tag
    if [[ $ref =~ ^[0-9a-fA-F]+$ ]]; then
	type="revision"
    fi
    # if ref is like a version number, it is a tag otherwise it is a branch
    # A version number  is semantic, can start with v or a number, and can have dots
    
    if [[ $ref =~ ^v?[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
	type="tag"
    else
	type="branch"
    fi
    vecho "Repo: $repo, Ref: $ref, Type: $type"
 
}	


# function to get the assets from the release by the tag
# @param $1: the git repository
# @param $2: the tag
# @return: the url to the assets from the release tag
get_assets_urls() {
    # if mode is json, use jq to get the assets url
    vecho "Getting assets urls from $repo_url/releases/tag/$ref"
    if [[ $mode == "json" ]]; then
      local assets_url=$(curl -L -H "Accept: application/vnd.github+json" -s "https://api.github.com/repos/${repo}/releases/tags/$ref" | jq -r '.assets_url')
      assets_urls=$(curl -L -H "Accept: application/vnd.github+json" -s $assets_url | jq -r '[.[] | .browser_download_url]') jq -r ".$package_name.assets_urls = ( env.assets_urls | fromjson)" $dep_json > tmp/.tmp.json
      mv tmp/.tmp.json $dep_json

    elif [[ $mode == "yml" ]]; then
      local assets_url=$(curl -L -H "Accept: application/vnd.github+json" -s "https://api.github.com/repos/${repo}/releases/tags/$ref" | yq -r '.assets_url')
      local assets_urls=$(curl -L -H "Accept: application/vnd.github+json" -s $assets_url | yq -p=json '[.[] | .browser_download_url]')
      assus="$assets_urls" yq  ".${package_name}.assets_urls = env(assus)" -i $dep_yml
    fi
}


# Function that echoes a json object with the version and the git repository
#  from the package info
# @param $1: the package_info
# @param $2: the git repository of the package
# @return: the json or yml object
get_service_info() {
    # define the repo_url on github based on $repo
   local result=""
   local base_info="{\"$package_name\": {\"repo\": \"$repo\", \"repo_url\": \"$repo_url\", \"version\": \"$ref\", \"ref_type\": \"$ref_type\", \"assets_urls\": []}}"

    if [[ $mode == "json" ]]; then
      # build the json object from the base_info and the assets_urls
      vecho "Building json object with base_info: $base_info"
      echo $base_info | jq -r | tee $dep_json
    elif [[ $mode == "yml" ]]; then
       local cmd="yq -n '$base_info' > $dep_yml"
       eval $cmd
       cp $dep_yml $dep_yml.bak
    fi
}


############################################################################################################
# Main
############################################################################################################

# Check if the file exists in the current directory
# if no package_name is provided, exit with error
if [ -z "$package_name" ]; then
  echo "Error: No package name provided"
  get_git_src_usage
fi
# if no package_src is provided, and $dependencies does not exist, exit with error
if [ -z "$package_src" ] && [ ! -f "$dependencies" ]; then
  echo "Error: No package source provided and no dependencies file found"
  get_git_src_usage
fi


if [ -z "$package_src" ]; then
  get_package_src $package_name
fi

# if validate_package_info returns false, exit with error
if ! validate_package_info $package_src; then
  vecho "Error: Invalid package source provided"
  get_git_src_usage
fi

get_service_info $package_src
# get type of version from the package info
# if the version is a tag, get the assets urls
if [[ $ref_type == "tag" && -z $parse_only ]]; then
	vecho "Getting assets urls for $package_name"
  get_assets_urls
fi

}

