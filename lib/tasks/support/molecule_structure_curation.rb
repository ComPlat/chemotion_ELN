# frozen_string_literal: true

require 'logger'

# MoleculeStructureCurationError is a custom error class for molecule structure curation errors.
class MoleculeStructureCurationError < StandardError
  def initialize(message = nil)
    super(message || 'Molecule structure curation error')
  end
end

# MoleculeStructureCuration is responsible for finding and fixing problematic molecules
# It will find all molecules that have a corrupted molfile due to wrong parsing of pubchem response
# and try to create correct molecules anew and update associated samples.
# @example: MoleculeStructureCuration.new.process

class MoleculeStructureCuration
  LOGFILE = Rails.root.join('log/data_curation.log')
  PATTERN = 'Status: '

  attr_reader :logger, :pattern, :responsible

  def initialize(logfile: LOGFILE, logger: nil, pattern: PATTERN, responsible: User.default_admin)
    @logger = logger || Logger.new(logfile)
    @pattern = pattern
    @responsible = case responsible
                   when User
                     responsible.id
                   when Integer
                     User.find_by(id: responsible)&.id
                   end
  end

  # Main function to process the molecules
  # @note It logs the processing steps in log/data_curation.log.
  # @note: process
  #   faulty_molecules - find all molecules with faulty molfile and loop through them
  #     reindex_molecule - update inchikey column to avoid index collision
  #     samples_empty? - check if associated samples present and destroy molecule if not
  #     process_by_sample_molfile - try to create new molecules using each sample molfile
  #                                 and update the sample with the new molecule if any
  #     samples_empty? - check if associated samples present and destroy molecule if not
  #
  #     process_by_molecule_smiles - try to create a new molecule using the molecule cano_smiles
  #                            and update the remaining samples with the new molecule
  #     samples_empty? - check if associated samples present and destroy molecule if not
  def process
    Logidze.with_responsible!(responsible) if responsible
    logger.info '############ MoleculeStructureCuration: process STARTS ############'
    faulty_molecules.find_each do |molecule|
      # scratch the molecule inchikey to avoid index collision
      reindex_molecule(molecule)
      # if no associated samples,  destroy the molecule
      next if samples_empty?(molecule)

      # try to create a new molecule using the sample molfile
      process_by_sample_molfile(molecule)
      # if no associated samples remaining, destroy the molecule
      next if samples_empty?(molecule)

      # try to create a new molecule using the molecule cano_smiles and update the remaining samples
      process_by_molecule_smiles(molecule)
      # if no associated samples remaining, destroy the molecule
      next if samples_empty?(molecule)

      # TODO: convert samples to decoupled samples
      # set the mw

      logger.info "Molecule #{molecule&.id}: Failed to create new molecule (#{__method__})"
    end
    logger.info '############ MoleculeStructureCuration: process ENDS   ############'
  ensure
    Logidze.clear_responsible!
  end

  # Find all Samples with faulty molfile
  # @return [ActiveRecord::Relation]
  # @note: this will log the count in @LOGFILE
  def faulty_samples
    faulty_elements(Sample)
  end

  # Find all Molecules with faulty Molfile
  # @return [ActiveRecord::Relation]
  # @note: this will log the count in log/LOGFILE
  def faulty_molecules
    faulty_elements(Molecule)
  end

  private

  # Find or create a molecule for each sample from sample.molfile for all samples
  # associated with the given molecule and update the sample with the molecule if new.
  # @param [Molecule]
  # @return [void]
  def process_by_sample_molfile(molecule) # rubocop:disable Metrics/AbcSize
    get_samples(molecule).each do |sample|
      header = "Molecule #{molecule.id}: Sample #{sample.id} (#{__method__})"
      molfile = sample.molfile
      next logger.info("#{header}: skipped: decoupled") if decoupled?(sample)
      next logger.info("#{header}: skipped: faulty molfile") if faulty_molfile?(molfile)
      next logger.info("#{header}: skipped: molfile to inchikey failed") if get_inchikey(molfile).blank?

      new_molecule = get_or_create_molecule(molfile, molecule)
      next logger.info("#{header}: skipped: no molecule found or created") if new_molecule.blank?
      next logger.info("#{header}: skipped: same molecule found") if new_molecule.id == sample.molecule_id

      update_sample(sample, new_molecule, molecule, method: __method__)
    end
  end

  def log_update(sample: nil, before: nil, after: nil, method: nil)
    message = "Molecule #{before[:id]}: replaced by #{after[:id]}"
    # {message} (#{method})"
    if sample.nil?
      logger.info "#{message} (#{method})"
      %i[cano_smiles sum_formular inchikey].each do |key|
        logger.info "#{message}: changed #{key} from #{before[key]} to #{after[key]}" if before[key] != after[key]
      end
    else
      logger.info "#{message}: for Sample #{sample} (#{method})"
    end
  end

  # try to create a new molecule using the molecule cano_smiles
  # the remaining samples will be updated with the new molecule
  # @param [Molecule]
  # @return [void]
  def process_by_molecule_smiles(molecule)
    molfile = get_ctab_by_smiles(molecule)
    new_molecule = get_or_create_molecule(molfile, molecule)
    if new_molecule.blank? || new_molecule.id == molecule.id
      return logger.info("Molecule #{molecule.id}: skip: no new molecule found")
    end

    get_samples(molecule).each { |sample| update_sample(sample, new_molecule, molecule, method: __method__) }
  end

  # update the given sample with the new Molecule
  # @note: callback are skipped
  # @param [Sample]
  # @param [Molecule]
  # @return [void]
  def update_sample(sample, molecule, previous_molecule, method: nil)
    id = molecule.id
    attributes = { molecule_id: id }
    attributes[:molfile] = molecule.molfile if faulty_molfile?(sample.molfile)
    # update the sample's molecule_id and molfile
    if sample.deleted? || sample.collections.empty?
      method = "#{method} (orphaned)"
      sample.update_columns(**attributes) # rubocop:disable Rails/SkipsModelValidations
      sample.send(:assign_molecule_name)
      sample.update_columns(molecule_name_id: sample.molecule_name_id) if sample.molecule_name_id_changed? # rubocop:disable Rails/SkipsModelValidations
    else
      method = "#{method} (validated)"
      sample.update!(**attributes)
    end
    log_update(sample: sample.id, method: method, before: previous_molecule, after: molecule)
  rescue ActiveRecord::RecordInvalid => e
    logger.error(
      "Molecule #{previous_molecule.id}: Failed updating sample #{sample.id} with molecule #{id}: #{e.message}",
    )
  end

  # check if the given molecule has no samples associated left
  # @note: this method will destroy the molecule if it has no samples left
  # @param [Molecule, Integer, String]
  # @return [Boolean]
  def samples_empty?(molecule)
    molecule_id = infer_attribute(molecule, :id)
    return false if get_samples(molecule_id).any?

    destroy(molecule_id)
    true
  end

  # Find problematic molecules
  # @note: this method will find all molecules that have a corrupted molfile due to
  #  wrong parsing of pubchem response
  # @return [ActiveRecord::Relation]
  def faulty_elements(klass = Molecule)
    relation = klass.with_deleted.where('molfile LIKE ?', "#{pattern}%")
  ensure
    count = relation.count
    logger.info "Found #{count} #{klass}#{count.zero? ? '' : 's'} with molfile starting with 'Status:%'"
  end

  # check if the given molfile is faulty due to wrong parsing of pubchem response
  # @param [String]
  # @return [Boolean]
  def faulty_molfile?(molfile)
    molfile.starts_with?('Status: 400')
  end

  def decoupled?(sample)
    sample.decoupled
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
    logger.info "Molecule #{id}: Found #{samples.count} associated samples"
    samples
  end

  # get or create a molecule using the given molfile
  # @return [Molecule, nil]
  def get_or_create_molecule(molfile, molecule = nil)
    molfile = infer_attribute(molfile, :molfile)
    inchikey = get_inchikey(molfile)

    existings = inchikey ? Molecule.where(inchikey: inchikey).pluck(:id) : []
    new = Molecule.find_or_create_by_molfile(molfile)
    log_update(before: molecule, after: new) if new && !new.id.in?(existings)
    new
  rescue StandardError => e
    logger.error "Failed to create molecule with molfile: #{molfile.inspect}, error: #{e.message}"
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
    logger.info "Failed to convert smiles #{smiles} to molfile using rdkit, error: #{e.message}"
    nil
  end

  # molfile from smiles using OpenBabelService
  # @param [String, Molecule, Sample] input
  # @return [String, nil]
  def get_openbabel_ctab_by_smiles(input)
    smiles = infer_attribute(input, :cano_smiles)
    Chemotion::OpenBabelService.smiles_to_molfile(smiles)
  rescue StandardError => e
    logger.info "Failed to convert smiles #{smiles} to molfile, error: #{e.message}"
    nil
  end

  # Molfile from smiles using rdkit or OpenBabelService
  # @param [String, Molecule, Sample] input
  # @return [String, nil]
  def get_ctab_by_smiles(input)
    smiles = infer_attribute(input, :cano_smiles)
    ctab = get_rdkit_ctab_by_smiles(smiles) || get_openbabel_ctab_by_smiles(smiles)
    logger.error("Failed to convert smiles to molfile, smiles: #{smiles}") if ctab.blank?
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

  # Modify the molecule inchikey to include the molecule id
  # so that it cannot be identify by the inchikey index
  def reindex_molecule(molecule)
    id = infer_attribute(molecule, :id)
    m = Molecule.with_deleted.find(id)
    return if m.inchikey.starts_with?("#{id}_")

    m.update_columns(inchikey: "#{id}_#{m.inchikey}") # rubocop:disable Rails/SkipsModelValidations
    logger.info "Molecule #{id}: RE-INDEXED to #{m.inchikey}"
  end

  # try to really destroy the given molecule
  # @param [Molecule, Integer, String]
  def destroy(molecule)
    id = infer_attribute(molecule, :id)
    m = Molecule.with_deleted.find(id)
    m.update_columns(molfile: '') # rubocop:disable Rails/SkipsModelValidations
    m.destroy!
    logger.info "Molecule #{id}: DELETED (soft-deleted with molfile blanked)"
  rescue StandardError => e
    return nil if e.is_a?(ActiveRecord::RecordNotFound)

    logger.error "Molecule #{id}: Failed to destroy: #{e.message}"
  end
end
