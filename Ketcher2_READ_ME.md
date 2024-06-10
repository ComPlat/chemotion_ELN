# Ketcher2 Integration

This guide will help you integrate Ketcher2 into your project. Follow the steps below to ensure a smooth setup.

## Prerequisites

1. Ensure you have `jq` installed on your system:
    ```bash
    sudo apt install jq
    ```

## Installation Steps

### 1. Add Ketcher Files to `public/`

- Run the installation script:
    ```bash
    bin/ket2-install.sh
    ```

### 2. Seed the Database

- Seed your database to include necessary initial data for Matrice(table):
    ```bash
    bundle exec rails db:seed
    ```

    OR Execute

        Matrice.create(
        name: 'ketcher2Editor',
        enabled: false,
        label: 'ketcher2Editor',
        include_ids: [],
        exclude_ids: [],
        configs: { editor: 'ketcher2' })

### 3. Restart Your Server/Container

- After completing the above steps, restart your server or container to apply the changes.

### 4. Configure User Access

- Ensure that Ketcher2 is allowed for the user(s) by the admin. This step is necessary to provide appropriate access permissions.

