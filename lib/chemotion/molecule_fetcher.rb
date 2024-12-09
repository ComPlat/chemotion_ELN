# frozen_string_literal: true

module Chemotion
  class MoleculeFetcher
    def initialize(smiles, babel_info)
      @smiles = smiles
      @babel_info = babel_info
    end

    def fetch_or_create
      find_existing || create_molecule
    end

    private

    def find_existing
      Molecule.find_by(inchikey: molecule_inchikey, is_partial: false)
    end

    def create_molecule
      molfile = fetch_molfile
      return unless molfile

      Molecule.find_or_create_by_molfile(molfile, @babel_info) || Molecule.find_or_create_dummy
    end

    def fetch_molfile
      @babel_info&.dig(:molfile) || rdkit_molfile || pubchem_molfile
    end

    def rdkit_molfile
      rw_mol = RDKitChem::RWMol.mol_from_smiles(@smiles)
      begin
        rw_mol&.mol_to_mol_block
      rescue StandardError => e
        handle_rdkit_error(e, rw_mol)
      end
    end

    def handle_rdkit_error(error, rw_mol)
      log_error(error)
      rw_mol&.mol_to_mol_block(true, -1, false)
    end

    def pubchem_molfile
      pc_mol = Chemotion::PubchemService.molfile_from_smiles(@smiles)
      validate_and_clear_molfile(pc_mol)
    rescue StandardError => e
      log_error(e)
      nil
    end

    def validate_and_clear_molfile(pc_mol)
      return unless validate_molfile(pc_mol)

      Chemotion::OpenBabelService.molfile_clear_hydrogens(pc_mol)
    end

    def validate_molfile(molfile)
      parsed = parse_to_hash(molfile)
      parsed['Status'] != '400'
    end

    def parse_to_hash(input)
      # Split the string into key-value pairs based on known patterns
      input.each_line.with_object({}) do |line, hash|
        next unless line =~ /^(.*?):\s*(.*)$/

        key = Regexp.last_match(1).strip
        value = Regexp.last_match(2).strip
        hash[key] = value
      end
    end

    def molecule_inchikey
      @babel_info[:inchikey]
    end

    def log_error(error)
      Rails.logger.error ["with smiles: #{@smiles}", error.message, *error.backtrace].join($INPUT_RECORD_SEPARATOR)
    end
  end
end
