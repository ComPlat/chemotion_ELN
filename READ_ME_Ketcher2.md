# Ketcher2 Integration

This guide will help you integrate Ketcher2 into your project. Follow the steps below to ensure a smooth setup.

## Prerequisites

1. Ensure you have `jq` installed on your system:
    ```bash
    sudo apt install jq
    ```

## Installation Steps

### 1. Add Ketcher2 Files

- Run the installation script (Choose one script based on release requried):
    
    1- fetching build assets from github release

    ```bash
        ✅ bin/chem-ket2-install.sh  -s epam/ketcher@v2.21.0
    ```

    2- building from src at  v2.22.0-rc.9
    ```bash
        ✅ bin/chem-ket2-install.sh -b -s epam/ketcher@v2.22.0-rc.9
    ```


### 2. Restart Your Server/Container

- After completing the above steps, restart your server or container to apply the changes.

### 4. Configure User Access

- Ensure that Ketcher2 is allowed for the user(s) by the admin. This step is necessary to provide appropriate access permissions.

