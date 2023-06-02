# frozen_string_literal: true

require 'roo'

module Import
  class ImportSamples
    attr_reader :xlsx, :sheet, :header, :mandatory_check, :rows, :unprocessable,
                :processed, :file_path, :collection_id, :current_user_id

    include ImportSamplesMethods

    def initialize(file_path, collection_id, user_id)
      @rows = []
      @unprocessable = []
      @processed = []
      @file_path = file_path
      @collection_id = collection_id
      @current_user_id = user_id
    end

    def read_file
      @xlsx = Roo::Spreadsheet.open(file_path)
    end

    def check_required_fields
      @sheet = xlsx.sheet(0)
      @header = sheet.row(1)
      @mandatory_check = {}
      ['molfile', 'smiles', 'cano_smiles', 'canonical smiles'].each do |check|
        @mandatory_check[check] = true if header.find { |e| /^\s*#{check}?/i =~ e }
      end

      message = 'Column headers should have: molfile, or Smiles (or cano_smiles, canonical smiles)'
      raise message if mandatory_check.empty?
    end

    def process_row(data)
      row = [header, xlsx.row(data)].transpose.to_h

      return unless has_structure(row) || row['decoupled'] == 'Yes'

      rows << row.each_pair { |k, v| v && row[k] = v.to_s }
    end

    def process_all_rows
      (2..xlsx.last_row).each do |data|
        process_row(data)
      end
      begin
        write_to_db
        if processed.empty?
          no_success
        else
          @unprocessable.empty? ? success : warning
        end
      rescue StandardError => e
        warning(e.message)
      end
    end

    def process_batch
      batch_size = 100
      (2..xlsx.last_row).each_slice(batch_size) do |batch|
        batch.each do |row_data|
          begin
            process_row(row_data)
            write_to_db
            rows.clear
          rescue => e
            puts "Error processing row: #{row_data}. Error: #{e.message}"
            @unprocessable << { row: row_data }
          end
        end
        if processed.empty?
          no_success
        else
          @unprocessable.empty? ? success : warning
        end
      end
    end

    def write_to_db
      unprocessable_count = 0
      begin
        ActiveRecord::Base.transaction do
          rows.map.with_index do |row, i|
            begin
              if row['decoupled'] == 'Yes' && !has_structure(row)
                molecule = Molecule.find_or_create_dummy
              else
              # If molfile and smiles (Canonical smiles) is both present
              #  Double check the rows
                if has_molfile(row) && has_smiles(row)
                  molfile, go_to_next = get_data_from_molfile_and_smiles(row)
                  next if go_to_next
                end

                if has_molfile(row)
                  molfile, molecule = get_data_from_molfile(row)
                elsif has_smiles(row)
                  molfile, molecule, go_to_next = get_data_from_smiles(row)
                  next if go_to_next
                end
                if molecule_not_exist(molecule)
                  unprocessable_count += 1
                  next
                end
              end
              sample_save(row, molfile, molecule)
            rescue
              unprocessable_count += 1
              @unprocessable << { row: row, index: i }
            end
          end
        end
      rescue => e
        raise 'More than 1 row can not be processed' if unprocessable_count.positive?
      end
    end

    def process(delayed_job: false)
      begin
        read_file
      rescue StandardError => e
        return error_process_file(e.message)
      end

      begin
        check_required_fields
      rescue StandardError => e
        return error_required_fields(e.message)
      end

      begin
        delayed_job ? process_batch : process_all_rows
      rescue StandardError => e
        return error_process(e.message)
      end
    end
  end
end
