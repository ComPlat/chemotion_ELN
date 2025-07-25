#!/bin/sh
# shell script to change user uid and gid
# to be run in the container as root
#
# Usage: chuser.sh <uid> <gid>
# Example: chuser.sh 1001 1001

# Note: This script assumes the user 'ubuntu' exists in the container

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <uid> <gid>"
    exit 1
fi
uid=$1
gid=$2
uid_was=$(id -u ubuntu)
gid_was=$(id -g ubuntu)
# Check if the user 'ubuntu' exists
# If not, exit with an error message
if ! id -u ubuntu >/dev/null 2>&1; then
    echo "User 'ubuntu' does not exist. Please create the user first."
    exit 1
fi

# Check if the provided uid and gid are valid numbers
# If not, exit with an error message

if ! echo "$uid" | grep -qE '^[0-9]+$' || ! echo "$gid" | grep -qE '^[0-9]+$'; then
    echo "Both uid and gid must be valid numbers."
    exit 1
fi

# Check if the provided uid and gid are not the same as the current uid and gid
# If they are, exit with an error message
if [ "$uid" -eq "$uid_was" ] && [ "$gid" -eq "$gid_was" ]; then
    echo "The provided uid and gid are the same as the current uid and gid."
    exit 0
fi

# Check if the provided uid and gid are not already in use
# If they are, exit with an error message
if getent passwd ${uid} >/dev/null 2>&1; then
    echo "UID ${uid} is already in use. Please choose a different UID."
    exit 1
fi
if getent group ${gid} >/dev/null 2>&1; then
    echo "GID ${gid} is already in use. Please choose a different GID."
    exit 1
fi



ps -u ubuntu                  # kill any existing ubuntu processes
usermod -u ${uid} ubuntu
find / -user ${uid_was} -exec chown -h ${uid} {} \;

groupmod -g ${uid} ubuntu
usermod -u ${uid} -g ${gid} ubuntu
find / -group ${gid_was} -exec chgrp -h ${gid} {} \;
echo "User 'ubuntu' has been changed to UID ${uid} and GID ${gid}."
