#!/bin/bash

# This script build and installs a npm package from its source code
# source and version should be defined in .service-dependencies file
package_name=KETCHER2
destination=public/default_editors/ket2

# relative path in the pacakge src to the tsconfig.json that should define the build directory
tsconfig_path=example

# if current env=production, then defined other var for the build
# will be added in the cloned directory .env file
if [ "$RAILS_ENV" = "development" ]; then
  env_options="ENABLE_POLYMER_EDITOR=true GENERATE_SOURCEMAP=true"
fi

script_dir=$(dirname "$(realpath "$0")")

${script_dir}/node-package-install.sh --destination "$destination" --package-name "$package_name" --env-options "$env_options" --tsconfig-path "$tsconfig_path" --artifact standalone
