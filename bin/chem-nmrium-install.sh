#!/bin/bash

# Installs the precompiled NMRium wrapper assets for development, so the spectra
# editor can be served from this app's own public/ directory instead of pointing
# at somebody else's deployment.
#
# Opt-in: nothing in the prepare-*.sh chain calls this. An ELN without the assets
# still works — it just needs :nmriumwrapper: :url: in config/spectra.yml to name
# a wrapper that is running somewhere else (or nothing, which hides the editor).
#
# The work itself is done by the `nmrium-assets` service in
# docker-compose.services.yml: it copies the build out of the pinned image into
# public/nmrium/<version>/ and symlinks public/nmrium/default at it. This script
# runs that service and checks the things around it that are easy to get wrong —
# the version pin and the spectra.yml url.
#
# Run it from the host: it needs the docker CLI, which the app container has no
# access to. Inside the container it prints the command to run outside instead.

set -u

package_name="NMRIUMWRAPPER"

usage() {
    echo "Usage: $0 [options]"
    echo
    echo "  -c, --check-only   Report the version pin and spectra.yml state, install nothing"
    echo "  -f, --force        Reinstall even if the version is already present in public/nmrium"
    echo "  -h, --help         Display this help message"
    echo "  -v, --verbose      Verbose output"
    exit 0
}

check_only=""
force=""
verbose=""

while [[ $# -gt 0 ]]; do
    case $1 in
        -c|--check-only)
            check_only=true
            shift
            ;;
        -f|--force)
            force=true
            shift
            ;;
        -v|--verbose)
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

# source utilities script from the same directory (sanitize_dir_path, vecho,
# script_dir/app_dir). It also picks jq vs yq, which this script does not need.
source "$(dirname "$0")/chem-utils.sh"
cd "$app_dir" || exit 1

log_file="${app_dir}log/install_nmriumwrapper.log"

say() { echo ">>> $1"; vecho "$1"; }

############################################################################
# 1. Version pin
############################################################################

# .service-dependencies is the source of truth, but docker compose resolves an
# image tag before any container starts and so cannot read it — the tag is
# duplicated as IMG_NMRIUMWRAPPER.
dep_line=$(grep -E "^${package_name}=" .service-dependencies 2>/dev/null)
dep_version="${dep_line##*@}"

img_line=$(grep -E '^IMG_NMRIUMWRAPPER=' .dockerenv 2>/dev/null)
img_source=".dockerenv"
if [ -z "$img_line" ]; then
    # No override -> compose falls back to the default written in the yml.
    img_line=$(grep -oE 'IMG_NMRIUMWRAPPER:-[^}]+' docker-compose.services.yml 2>/dev/null | head -1)
    img_source="docker-compose.services.yml default"
fi
img_version="${img_line##*:}"

if [ -z "$dep_line" ]; then
    say "WARNING: no ${package_name} entry in .service-dependencies."
elif [ -z "$img_line" ]; then
    say "WARNING: no IMG_NMRIUMWRAPPER anywhere. Is docker-compose.services.yml up to date"
    say "         with docker-compose.services.yml.example?"
elif [ "$dep_version" != "$img_version" ]; then
    say "WARNING: version mismatch: .service-dependencies pins $dep_version but the"
    say "         nmrium-assets image is tagged $img_version ($img_source)."
    say "         Update IMG_NMRIUMWRAPPER in .dockerenv to match."
else
    say "Version $dep_version (.service-dependencies and $img_source agree)."
fi

############################################################################
# 2. spectra.yml
############################################################################

# The editor only appears once config/spectra.yml exists. It is deliberately not
# copied by prepare-config.sh: that would also advertise a chemspectra endpoint
# which may not be running.
if [ ! -f config/spectra.yml ]; then
    say "NOTE: config/spectra.yml is missing, so no spectra service is configured at all."
    say "      cp config/spectra.yml.example config/spectra.yml"
    say "      (its development :nmriumwrapper: already points at /nmrium/default/;"
    say "       check its :chemspectra: url too, or the editor button will 404)"
elif grep -qE "^\s*:url:\s*'?/nmrium/" config/spectra.yml; then
    say "config/spectra.yml points :nmriumwrapper: at the self-hosted assets."
else
    say "NOTE: config/spectra.yml does not point :nmriumwrapper: at /nmrium/default/."
    say "      The assets below will be installed but unused until it does."
    say "      The trailing slash matters — the build references its chunks relatively."
fi

if [ -n "$check_only" ]; then
    if [ -L public/nmrium/default ]; then
        say "Installed: public/nmrium/default -> $(readlink public/nmrium/default)"
    else
        say "Not installed: public/nmrium/default does not exist."
    fi
    exit 0
fi

############################################################################
# 3. Install
############################################################################

if [ -n "$force" ] && [ -n "$img_version" ]; then
    say "Forcing reinstall of public/nmrium/$img_version"
    rm -rf "public/nmrium/$img_version"
fi

compose_cmd="docker compose -f docker-compose.dev.yml -f docker-compose.services.yml"
[ -f .dockerenv ] && compose_cmd="$compose_cmd --env-file .dockerenv"
compose_cmd="$compose_cmd up nmrium-assets"

if ! command -v docker > /dev/null; then
    say "No docker CLI here (the app container has none). Run this from the host:"
    say "    bin/chem-nmrium-install.sh"
    say "or, equivalently:"
    say "    $compose_cmd"
    exit 1
fi

if [ ! -f docker-compose.services.yml ]; then
    say "docker-compose.services.yml is missing. Create it from the example first:"
    say "    cp docker-compose.services.yml.example docker-compose.services.yml"
    exit 1
fi

if ! grep -q 'nmrium-assets:' docker-compose.services.yml; then
    say "docker-compose.services.yml has no nmrium-assets service — it predates this"
    say "feature. Refresh it from docker-compose.services.yml.example."
    exit 1
fi

# public/nmrium must exist before compose bind-mounts it, or docker creates it
# root-owned. It is in the repo as a .keep, but a stale checkout may not have it.
mkdir -p public/nmrium

vecho "running: $compose_cmd"
uid=${uid:-$(id -u)} gid=${gid:-$(id -g)} eval "$compose_cmd" || exit 1

if [ -L public/nmrium/default ]; then
    say "Assets installed: public/nmrium/default -> $(readlink public/nmrium/default)"
    say "Served by the app at /nmrium/default/ — restart the app container if"
    say "config/spectra.yml changed, the url is read at boot."
else
    say "WARNING: public/nmrium/default was not created. See $log_file"
    exit 1
fi
