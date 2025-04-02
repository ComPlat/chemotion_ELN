# frozen_string_literal: true

require Rails.root.join('lib/tasks/support/molecule_structure_curation.rb')

namespace :data do
  namespace :molfile do
    desc 'Fix faulty molecules and reassign samples'
    task fix: :environment do
      puts 'Running Molecule Structures Curation process...'
      MoleculeStructureCuration.new.process
      puts 'Done.'
    end

    task count: :environment do
      new_task = MoleculeStructureCuration.new
      molecules = new_task.faulty_molecules
      sample_count = molecules.filter_map { |m| m&.samples&.count }.sum

      puts "Found #{molecules.count} problematic molecules"
      puts "Associated_with #{sample_count} samples"
      puts "Found #{new_task.faulty_samples.count} samples with problematic molfile"

      puts 'Done.'
    end
  end
end
