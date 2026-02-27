# frozen_string_literal: true

class TransferSampleDataToChemical < ApplicationJob
  include ActiveJob::Status

  queue_as :transfer_sample_data_to_chemical

  # script for complat
  def perform
    log_information = {
      updated_samples: [],
      could_not_transfer_external_label: [],
      could_not_transfer_local__to_chemical_data: [],
    }

    @cabinet_room_mapping = {
      '1' => 400,
      '2' => 400,
      '18' => 400,
      '19' => 400,
      'freezer 4' => 400,
      '3' => 405,
      '4' => 405,
      '5' => 405,
      '6' => 405,
      '8' => 405,
      '13' => 405,
      '20' => 405,
      '21' => 405,
      '23' => 405,
      '24' => 405,
      'freezer 3' => 405,
      'freezer 5' => 405,
      'fridge 4' => 405,
      'fridge 5' => 405,
      '7' => 410,
      '8 solvents' => 410,
      '9' => 410,
      '10' => 410,
      '14 acids' => 410,
      '15' => 410,
      '16' => 410,
      '17' => 410,
      '22' => 410,
      'freezer 6' => 410,
      'freezer 7' => 410,
      'freezer 8' => 410,
      'fridge 6' => 410,
      'fridge 7' => 410,
      '11' => 416,
      '12' => 416,
      'freezer 1' => 446,
      'freezer 2' => 446,
      'fridge 1' => 446,
      'fridge 2' => 446,
      'fridge 3' => 446,
    }

    begin
      samples_with_labels = Sample.where.not(external_label: nil)
      transfer_external_label(samples_with_labels, log_information)
      samples_with_location = Sample.where.not(location: nil)
      process_chemical(samples_with_location, log_information)

      Rails.logger.info(log_information)
    rescue StandardError => e
      Rails.logger.error("Error transferring data: #{e.message}")
    end
  end

  private

  def log_sample_update(sample, log_information)
    log_information[:updated_samples] << sample.id unless log_information[:updated_samples].include?(sample.id)
  end

  def transfer_external_label(samples, log_information)
    samples.find_in_batches(batch_size: 100) do |batch|
      batch.each do |sample|
        sample['xref']['inventory_label'] = sample['external_label']
        sample.inventory_sample = true if sample.inventory_sample == false
        sample.save!
        log_sample_update(sample, log_information)
      rescue StandardError => e
        log_information[:could_not_transfer_external_label] << { sample_id: sample.id, error: e.message }
      end
    end
  end

  def extraxt_cabinet_number(string)
    string.first.downcase.gsub(/cabinet\s*/, '').strip
  end

  def get_room_from_cabinet(string)
    cabinet_fridge_or_freezer = string.scan(/(?:\b\w+\s\d+|\b(?:freezer|fridge)\s\d+)/)
    cabinet_number = extraxt_cabinet_number(cabinet_fridge_or_freezer) if cabinet_fridge_or_freezer.any?

    cabinet, freezer, fridge = cabinet_fridge_or_freezer.map(&:strip)
    add_cabinet_string = "cabinet #{cabinet_number}"
    map_cabinet_to_room = @cabinet_room_mapping[cabinet] ||
                          @cabinet_room_mapping[cabinet_number] || @cabinet_room_mapping[add_cabinet_string]
    map_frige_or_freezer_to_room = @cabinet_room_mapping[freezer] || @cabinet_room_mapping[fridge]

    map_cabinet_to_room || map_frige_or_freezer_to_room || @cabinet_room_mapping[cabinet]
  end

  def update_chemical_data(chemical_data, sample)
    chemical_data[0]['host_building'] = 319
    if sample.location.strip.present?
      chemical_data[0]['host_room'] = get_room_from_cabinet(sample.location.strip)
      chemical_data[0]['host_cabinet'] = sample.location.strip
    end
    chemical_data[0]['host_group'] = 'Bräse / ComPlat'
  end

  def initialize_chemical_data(chemical_entry)
    ## Initialize chemical_data as an array with at least one hash to avoid nil errors
    chemical_data = chemical_entry.chemical_data || []
    chemical_data[0] ||= {}
    chemical_data
  end
 
  def handle_chemical_data(sample, log_information)
    chemical_entry = Chemical.find_or_initialize_by(sample_id: sample.id)
    chemical_data = initialize_chemical_data(chemical_entry)

    update_chemical_data(chemical_data, sample)
    chemical_entry.chemical_data = chemical_data
    chemical_entry.save!
    log_sample_update(sample, log_information)
  end

  def process_chemical(samples, log_information)
    samples.find_in_batches(batch_size: 100) do |batch|
      batch.each do |sample|
        handle_chemical_data(sample, log_information)
      rescue ActiveRecord::RecordInvalid => e
        log_information[:could_not_transfer_location_data] << { sample_id: sample.id,
                                                                chemical_id: chemical_entry.id,
                                                                error: "Record Invalid: #{e.message}" }
      rescue StandardError => e
        log_information[:could_not_transfer_location_data] << { sample_id: sample.id,
                                                                chemical_id: chemical_entry.id,
                                                                error: e.message }
      end
    end
  end
end
