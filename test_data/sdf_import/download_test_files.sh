#!/bin/bash
# Download test SDF files from IUPAC InChI repository
# These files are known to trigger the SDF import connection drop

set -e

TEST_DATA_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "${TEST_DATA_DIR}"

echo "Downloading organometallic SDF test files..."
echo "Source: https://github.com/IUPAC-InChI/InChI/tree/dev/INCHI-1-TEST/tests/test_executable/data"
echo ""

# Primary test file - 6,355 organometallic structures (triggers all prior incidents)
if [ ! -f "alex_clark_structures.sdf.gz" ]; then
    echo "Downloading alex_clark_structures.sdf.gz (21 MB, 6,355 records)..."
    wget -q --show-progress \
        'https://raw.githubusercontent.com/IUPAC-InChI/InChI/dev/INCHI-1-TEST/tests/test_executable/data/alex_clark_structures.sdf.gz' \
        -O alex_clark_structures.sdf.gz
    echo "✓ Downloaded: $(ls -lh alex_clark_structures.sdf.gz)"
else
    echo "✓ Already exists: alex_clark_structures.sdf.gz"
fi

# Alternative test files (also organometallic, may trigger different failure modes)
if [ ! -f "organometallic_structures_CCDC.sdf.gz" ]; then
    echo "Downloading organometallic_structures_CCDC.sdf.gz..."
    wget -q --show-progress \
        'https://raw.githubusercontent.com/IUPAC-InChI/InChI/dev/INCHI-1-TEST/tests/test_executable/data/organometallic_structures_CCDC.sdf.gz' \
        -O organometallic_structures_CCDC.sdf.gz || echo "⚠ Failed to download CCDC file"
    [ -f "organometallic_structures_CCDC.sdf.gz" ] && echo "✓ Downloaded: $(ls -lh organometallic_structures_CCDC.sdf.gz)"
else
    echo "✓ Already exists: organometallic_structures_CCDC.sdf.gz"
fi

if [ ! -f "organometallic_structures_pubchem.sdf.gz" ]; then
    echo "Downloading organometallic_structures_pubchem.sdf.gz..."
    wget -q --show-progress \
        'https://raw.githubusercontent.com/IUPAC-InChI/InChI/dev/INCHI-1-TEST/tests/test_executable/data/organometallic_structures_pubchem.sdf.gz' \
        -O organometallic_structures_pubchem.sdf.gz || echo "⚠ Failed to download PubChem file"
    [ -f "organometallic_structures_pubchem.sdf.gz" ] && echo "✓ Downloaded: $(ls -lh organometallic_structures_pubchem.sdf.gz)"
else
    echo "✓ Already exists: organometallic_structures_pubchem.sdf.gz"
fi

echo ""
echo "Test files ready in: ${TEST_DATA_DIR}"
echo ""
echo "Files downloaded:"
ls -lh *.sdf.gz 2>/dev/null || echo "No .sdf.gz files found"
echo ""
echo "Next step: Run ./reproduce_connection_drop.sh alex_clark_structures.sdf.gz"

</contents>