# frozen_string_literal: true

require 'logger'

# Find problematic molefile and recreate molecules /update samples
# @example: MoleculeStructureCuration.new.process
# @note: process
# find problematic molecules                                                                  get_faulty_molecules
#   for each molecule
#     -> find associated samples:                                                             get_samples
#        -> if sample has molfile, try to recreate the Molecule                               get_or_create_molecule
#           -> if molecule is found, update the Sample
#
#     -> reload associated samples                                                            get_samples
#       -> if samples left, try to create a new molecule using the molecule cano_smiles       get_new_molecule
#          -> if new molecule is found, update the remaining samples
#          -> if new molecule is not found
#              -> TODO: set remaining samples as decoupled and set the mw
#
#     -> if no samples left, destroy the molecule
#

class MoleculeStructureCuration
  def process
    faulty_molecules.find_each do |molecule|
      next if samples_empty?(molecule)

      molecule_id = molecule.id
      # try to recreate a molecule for each sample from sample.molfile
      process_samples_by_sample_mol(molecule)
      next if samples_empty?(molecule_id)

      # try to create a new molecule using the molecule cano_smiles
      # then update the remaining samples
      process_samples_by_molecule_smiles(molecule)
      next if samples_empty?(molecule_id)

      # convert samples to decoupled samples
      # set the mw
      #
      # destroy the molecule
      logger.info "Failed to create new molecule for molecule with id: #{molecule_id}"
    end
  end

  # try to recreate a molecule for each sample from sample.molfile for all samples
  # associated with the given molecule
  # @param [Molecule]
  # @return [void]
  def process_samples_by_sample_mol(molecule)
    logger.info __method__
    get_samples(molecule).each do |sample|
      logger.info "Processing sample with id: #{sample.id}"
      molfile = sample.molfile
      next if decoupled?(sample)
      next if faulty_molfile?(molfile)
      next if get_inchikey(molfile).blank?

      new_molecule = get_or_create_molecule(molfile)
      if new_molecule.blank? || new_molecule.id == sample.molecule_id
        logger.info "Molecule not found or already associated with sample with id: #{sample.id}"
        next
      end
      update_sample(sample, new_molecule)
    end
  end

  # try to create a new molecule using the molecule cano_smiles
  # the remaining samples will be updated with the new molecule
  # @param [Molecule]
  # @return [void]
  def process_samples_by_molecule_smiles(molecule)
    molecule_id = molecule.id
    logger.info __method__
    new_molecule = get_new_molecule(molecule)
    return if new_molecule.blank?

    get_samples(molecule_id).each { |sample| update_sample(sample, new_molecule) }
  end

  # update the given sample with the new Molecule
  # @param [Sample]
  # @param [Molecule]
  # @return [void]
  def update_sample(sample, molecule)
    molecule_id = molecule.id
    attributes = { molecule_id: molecule_id }
    attributes[:molfile] = molecule.molfile if faulty_molfile?(sample.molfile)
    sample.update_columns(**attributes) # rubocop:disable Rails/SkipsModelValidations
    logger.info "Updated sample with id: #{sample.id} with molecule id: #{molecule_id}"
  end

  # check if the given molecule has no samples associated left
  # @note: this method will destroy the molecule if it has no samples left
  # @param [Molecule, Integer, String]
  # @return [Boolean]
  def samples_empty?(molecule_id)
    result = get_samples(molecule_id).empty?
    logger.info "Molecule with id: #{molecule_id} has no samples left" if result
    destroy(molecule_id) if result
    result
  end

  # define local logger to write to log/seed.log:
  def logger
    @logger ||= Logger.new(Rails.root.join('log/data_curation.log'))
  end

  # Find problematic molecules
  # @note: this method will find all molecules that have a corrupted molfile due to
  #  wrong parsing of pubchem response
  # @return [ActiveRecord::Relation]
  def faulty_elements(klass = Molecule)
    relation = klass.where('molfile LIKE ?', 'Status: %')
  ensure
    logger.info "Found #{relation.count} #{klass} with molfile starting with 'Status:%'"
  end

  def faulty_samples
    faulty_elements(Sample)
  end

  def faulty_molecules
    faulty_elements(Molecule)
  end

  # check if the given molfile is faulty due to wrong parsing of pubchem response
  # @param [String]
  # @return [Boolean]
  def faulty_molfile?(molfile)
    faulty = molfile.starts_with?('Status: 400')
  ensure
    logger.info 'Molfile is faulty' if faulty
  end

  def decoupled?(sample)
    decoupled = sample.decoupled
  ensure
    logger.info "Sample with id: #{sample.id} is decoupled" if decoupled
  end

  # infer the attribute from the input
  # @param [String, Integer, Molecule, Sample]
  # @param [Symbol] the attribute to infer
  # @return [String, Integer] the attribute value
  def infer_attribute(input, attribute)
    case input
    when Molecule, Sample
      input.send(attribute)
    when String, Integer
      input
    end
  end

  # get the samples associated to a given molecule id
  # @param [String, Integer, Molecule]
  # @return [ActiveRecord::Relation]
  # @note: query through the foreign key molecule_id instead of through the molecule association
  #   in case the molecule is already destroyed
  def get_samples(molecule)
    id = infer_attribute(molecule, :id)
    samples = Sample.with_deleted.where(molecule_id: id)
    logger.info "Found #{samples.count} samples for molecule with id: #{id}"
    samples
  end

  # get or create a molecule using the given molfile
  # @return [Molecule, nil]
  def get_or_create_molecule(molfile)
    molfile = infer_attribute(molfile, :molfile)
    Molecule.find_or_create_by_molfile(molfile)
  rescue StandardError => e
    logger.error "Failed to create molecule with molfile: #{molfile.inspect}, error: #{e.message}"
    nil
  end

  # molfile from smiles using rdkit
  # @param [String, Molecule, Sample] input
  # @return [String, nil]
  def get_rdkit_ctab_by_smiles(input)
    smiles = infer_attribute(input, :cano_smiles)
    ctab = RdkitExtensionService.smiles_to_ctab(smiles)
    raise 'conversion failed' if ctab.blank?

    ctab
  rescue StandardError => e
    logger.error "Failed to convert smiles #{smiles} to molfile using rdkit, error: #{e.message}"
    nil
  end

  # molfile from smiles using OpenBabelService
  # @param [String, Molecule, Sample] input
  # @return [String, nil]
  def get_openbabel_ctab_by_smiles(input)
    smiles = infer_attribute(input, :cano_smiles)
    Chemotion::OpenBabelService.smiles_to_molfile(smiles)
  rescue StandardError => e
    logger.error "Failed to convert smiles #{smiles} to molfile, error: #{e.message}"
    nil
  end

  # Molfile from smiles using rdkit or OpenBabelService
  # @param [String, Molecule, Sample] input
  # @return [String, nil]
  def get_ctab_by_smiles(input)
    smiles = infer_attribute(input, :cano_smiles)
    ctab = get_rdkit_ctab_by_smiles(smiles) || get_openbabel_ctab_by_smiles(smiles)
    logger.info("Failed to convert smiles to molfile, smiles: #{smiles}") if ctab.blank?
    ctab
  end

  # calculate inchikey from a molfile from a sample or molecule or string
  # @return [String, nil]
  def get_inchikey(obj)
    molfile = obj.is_a?(String) ? obj : obj.molfile
    # this use Inchi gem
    Chemotion::OpenBabelService.inchi_info(molfile)&.fetch(:inchikey, nil)
  rescue StandardError => e
    logger.error "Failed to calculate inchikey from molfile: #{molfile.inspect}, error: #{e.message}"
    nil
  end

  # try to really destroy the given molecule
  # @param [Molecule, Integer, String]
  def destroy(molecule)
    id = infer_attribute(molecule, :id)
    logger.info "Destroying molecule with id: #{id}"
    Molecule.with_deleted.find(id).really_destroy!
  rescue StandardError => e
    if e.is_a?(ActiveRecord::RecordNotFound)
      logger.info "Molecule with id: #{id} not found"
      return nil
    end
    logger.error "Failed to destroy molecule with id: #{id}, error: #{e.message}"
    false
  end

  # destroy the given molecule and create a new one using the molecule cano_smiles
  # assume the molecule molfile is invalid
  # @param [Molecule]
  # return [Molecule, nil]
  # notes: return nil if the rdkit extension is not installed
  def get_new_molecule(molecule)
    molfile = get_ctab_by_smiles(molecule)
    if molfile.blank?
      logger.info "Failed to create new molecule by molfile from smiles for molecule with id: #{molecule.id}"
      return nil
    end
    Molecule.transaction do
      destroy(molecule)
      new_molecule = get_or_create_molecule(molfile)
      raise ActiveRecord::Rollback if new_molecule.blank? || new_molecule.id == molecule.id

      logger.info "Created new molecule with id: #{new_molecule.id} for molecule with id: #{molecule.id}"
      new_molecule
    end
  rescue ActiveRecord::Rollback
    false
  end
end
