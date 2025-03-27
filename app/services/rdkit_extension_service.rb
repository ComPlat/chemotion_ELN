# frozen_string_literal: true

# call rdkit functions from the database extension
class RdkitExtensionService < PostgresExtensionsService
  # SQL queries for RDKit functions
  SMILES_TO_CTAB = 'SELECT mol_to_ctab(mol_from_smiles(%s)) AS result;'
  CTAB_TO_SMILES = 'SELECT mol_to_smiles(mol_from_ctab(%s)) AS result;'
  SIM_COMPARISON = 'SELECT tanimoto_sml(morganbv_fp(%s), morganbv_fp(%s)) AS result;'
  VALID_SMILES = 'SELECT is_valid_smiles(%s) AS result;'

  # Calculate similarity between two molecules
  class << self
    # Calculate the similarity between two molecules given their SMILES strings
    # @param mol1 [String] The SMILES string of the first molecule
    # @param mol2 [String] The SMILES string of the second molecule
    # @return [Float] The Tanimoto similarity between the two molecules
    def similarity(mol1, mol2)
      execute_function(SIM_COMPARISON, mol1, mol2)
    end

    # Convert a SMILES string to a molfile
    # @param smiles [String] The SMILES string to convert
    # @return [String] The molfile representation of the molecule
    def smiles_to_ctab(smiles)
      execute_function(SMILES_TO_CTAB, smiles)
    end

    # Convert a molfile to a SMILES String
    # @param ctab [String] The molfile to convert
    # @return [String] The SMILES representation of the molecule
    def ctab_to_smiles(ctab)
      execute_function(CTAB_TO_SMILES, ctab)
    end

    # Check if a SMILES string is valid
    # @param smiles [String] The SMILES string to validate
    # @return [Boolean] Whether the SMILES string is valid
    def valid_smiles?(smiles)
      execute_function(VALID_SMILES, smiles)
    end

    # Check if the RDKit extension is installed
    # @return [Boolean] Whether the RDKit extension is installed and can be used
    # @note This method overrides the parent method to check for the RDKit extension
    # @note function calls will return nil if the extension is not installed (see execute_function)
    def extension_valid?
      Rails.configuration.pg_cartridge == 'rdkit'
    rescue ActiveRecord::StatementInvalid
      false
    end
  end
end
