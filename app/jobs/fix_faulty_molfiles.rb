# frozen_string_literal: true

class FixFaultyMolfiles < ApplicationJob
  include ActiveJob::Status
  queue_as :fix_faulty_molfiles

  def perform
    log_information = {
      faulty_molecules: [],
      updated_molecules: [],
      updated_samples: [],
      could_not_update_molecules: [],
      could_not_find_valid_molfile: [],
      could_not_update_samples: [],
    }

    molecules_with_invalid_molfiles = Molecule
                                      .where('molfile LIKE ?', 'Status:%')
                                      .select { |m| Chemotion::MolfileValidation.invalid_molfile?(m.molfile) }

    log_information[:faulty_molecules] = molecules_with_invalid_molfiles.map(&:id)

    molecules_with_invalid_molfiles.each do |molecule|
      process_molecule(molecule, log_information)
    end

    Rails.logger.info(log_information)
  rescue StandardError => e
    Rails.logger.error("Error processing data: #{e.message}, log_information: #{log_information}")
  end

  private

  def process_molecule(molecule, log_information)
    new_molfile = generate_valid_molfile(molecule, log_information)
    log_information[:could_not_find_valid_molfile] << molecule.id if new_molfile.blank?
    return if new_molfile.blank?

    molecule.update!(molfile: new_molfile)
    log_information[:updated_molecules] << molecule.id

    update_samples(molecule.id, new_molfile, log_information)
  rescue StandardError => e
    Rails.logger.error("Failed to update molecule #{molecule.id}: #{e.message}")
    log_information[:could_not_update_molecules] << molecule.id
  end

  def generate_valid_molfile(molecule, log_information)
    molfile = Chemotion::OpenBabelService.smiles_to_molfile(molecule[:cano_smiles])
    Chemotion::MolfileValidation.validate_and_clear_molfile(molfile)
  rescue StandardError => e
    Rails.logger.error("Failed to generate valid molfile for molecule #{molecule.id}: #{e.message}")
    log_information[:could_not_update_molecules] << molecule.id
    nil
  end

  def update_samples(molecule_id, molfile, log_information)
    Sample.where(molecule_id: molecule_id).find_each do |sample|
      begin
        sample.update!(molfile: molfile)
        log_information[:updated_samples] << sample.id
      rescue StandardError => e
        Rails.logger.error("Failed to update sample #{sample.id} for molecule #{molecule_id}: #{e.message}")
        log_information[:could_not_update_samples] << sample.id
      end
    end
  end
end
