#!/bin/bash

# This script gets the src code (and build) or the compiled assets from a git repository
# for Ketcher 2 
# source and version should be defined in .service-dependencies file or passed as arguments
# needs: jq or yq, unzip, git


package_name="KETCHER2"
package_type="standalone"
usage() {
    echo "Usage: $0 --package-src <user/repo:version> --artifact-type <type> --build-from-source"
    echo
    echo "  -s, --package-src <src>          Optional: specify the src and version for ${package_name} as defined in the .service-dependencies file. "
    echo "                                             Default from .service-dependencies file"
    echo "  -t, --package-type <standalone|remote> Optional: If multiple artifacts are present select the one to use - default 'standalone'"
    echo "  -b, --build-from-src             Optional: Build from src - default false: get compiled artifacts from src repo "
    echo "  --options <options>              Optional: Additional options to pass to the build script"
    echo "  -h, --help                       Display this help message."
    echo "  -v, --verbose                    verbose output  "
    exit 0
}

# Initialize variables
while [[ $# -gt 0 ]]; do
    case $1 in
       -s|--package-src)
            package_src="$2"
            shift 2
            ;;
        -t|--package-type)
            package_type="$2"
            shift 2
            ;;
	-b|--build-from-src)
            build_from_source=true
	    shift
	;;
	--options)
	    options="$2"
	    shift 2
	    ;;
	-h|--help)
	    usage
	    ;;
	-v | --verbose)
	    verbose=true
	    shift
	    ;;
	*)
	    echo "Unknown option: $1"
	    usage
	    ;;
    esac
done
# source utilities script from the same directory
source "$(dirname "$0")/chem-utils.sh"
source "${script_dir}chem-get-git-src.sh"
cd $app_dir

package_name_lower=$(echo $package_name | tr '[:upper:]' '[:lower:]')
log_file="${app_dir}log/install_${package_name_lower}.log"
vecho "starting $(date) "
editors_dir=public/editors/
final_destination=${editors_dir}default
relative_destination=${package_name_lower}/
# if build_from_source add another subfolder
if [ "$build_from_source" = true ]; then
    relative_destination=${relative_destination}rebuilt/
else
    relative_destination=${relative_destination}built/
fi

#function to make links
make_links(){
    rm -f $final_destination
    ln -s $relative_destination $final_destination
    vecho "Created symlink $final_destination -> $relative_destination"

    # create link for path from structure_editor.yml.example
    example_path=$editors_dir$package_name_lower/$package_type

    # check if the link exists
    if [ -d $example_path ] && [ ! -L $example_path ]; then
	vecho "Dir already exists: $example_path. Not symlinking"
    else
	rm -r $example_path
        ln -s ../$relative_destination $example_path
        vecho "symlinking $example_path to $relative_destination"
    fi
}

# relative path in the package src to the tsconfig.json that should define the build directory
tsconfig_path=example

info_cmd="get_git_src -n ${package_name} "
  
# if current env=production, then defined other var for the build
# will be added in the cloned directory .env file
if [ "$RAILS_ENV" = "production" ]; then
  echo "$package_name installation for Production environment: getting precompiled assets as defined in the .service-dependencies file"
  build_from_source=''
  package_src=''
else

  # multiple cases depending on args:
  #  1 package_src and build_from_source
  #  2 package_src and not build_from_source
  #  3 not package_src and build_from_source
  #  4 not package_src and not build_from_source
    #  case 1
  if [ -n "$package_src" ] && [ -n "$build_from_source" ]; then
      vecho "Package source defined, want to build from source"
      info_cmd="$info_cmd --package-src ${package_src} --parse-only"
  fi
  # case 2
  if [ -n "$package_src" ] && [ -z "$build_from_source" ]; then
      vecho "Package source defined, need to get asset links" 
      info_cmd="$info_cmd -s ${package_src}"
  fi
  #  case 3
  if [ -z "$package_src" ] && [ -n "$build_from_source" ]; then
      vecho "Package source from .service-dependencies, want to build from source"
      info_cmd="$info_cmd -p"
  fi
  # case 4
  if [ -z "$package_src" ] && [ -z "$build_from_source" ]; then
      vecho "Package source from .service-dependencies, need to get asset links" 
  fi
  

  options="ENABLE_POLYMER_EDITOR=true GENERATE_SOURCEMAP=true $options"
fi

vecho "options: $options"

vecho "running: $info_cmd"
package_info=$(eval $info_cmd)
vecho "Package info: $package_info"

# make a subfolder in the destination name after the $package_name and version as given in package_info json
version="$(get_attribute $package_name 'version')"
vecho "Version: $version"
relative_destination=${relative_destination}${version}/$package_type/
destination=${editors_dir}$relative_destination
mkdir -p $destination

# if the destination is not empty, then echo message and exit
if [ "$(ls -A $destination)" ]; then
    echo "Destination directory $destination is not empty. Assets might already exist. Exiting"
    vecho "Just re-creating the symlink"
    make_links
   exit 0
else 
  vecho "Destination: $destination"
fi


# if build_from_source then run the build script/ chem-node-package-install.sh
if [ -n "$build_from_source" ]; then
    vecho "Building from source"
    build_cmd="${script_dir}/chem-node-package-install.sh -s ${repo}@${version} -a $package_type --destination ${destination} --package-name ${package_name} --env-options '${options}' --tsconfig-path ${tsconfig_path}" 
    # add verbose flag if set
    if [ "$verbose" = true ]; then
	build_cmd="$build_cmd -v"
    fi
    vecho "running: $build_cmd"
    eval $build_cmd || exit 1
# else get assets from assets_url
else
    assets_url="$(get_attribute $package_name 'assets_urls' $package_type)"
    vecho "Assets url: $assets_url"
    # mk tmp dir, curl assets, and unzip them inside the tmp dir, then copy to destination, then remove tmp dir
    tmpdir=$(sanitize_dir_path "$(mktemp -d)")
    _cmd="curl -L  -o ${tmpdir}assets.zip ${assets_url}"
    vecho "curl_cmd: $_cmd"
    eval $_cmd || exit 1
    _cmd="unzip -q ${tmpdir}assets.zip -d ${tmpdir}"
    vecho "unzip_cmd: $_cmd"
    eval $_cmd || exit 1
    # remove zip file and copy to destination
    rm ${tmpdir}assets.zip
    cp -r ${tmpdir}${package_type}/* ${destination}
    rm -rf ${tmpdir}
fi

# symlink the selected artifact to the final destination
make_links

