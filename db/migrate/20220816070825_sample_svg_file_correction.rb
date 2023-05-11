# frozen_string_literal: true

class SampleSvgFileCorrection < ActiveRecord::Migration[5.2]
  class ReactionsSample < ApplicationRecord
    self.table_name = 'reactions_samples'
    belongs_to :reaction, optional: true, class_name: 'Reaction'
    belongs_to :sample, optional: true, class_name: 'Sample'
  end

  def change
    date = Time.zone.local(2022, 6, 28)
    Sample.where('created_at > :date or updated_at > :date',
                 date: date).where("sample_svg_file like '%<svg%'").find_each do |sample|
      sample.attach_svg
      sample.update_columns(sample_svg_file: sample.sample_svg_file)
    end

    molecules = Molecule.where('created_at > :date or updated_at > :date', date: date)
    molecules.find_each do |molecule|
      svg_file = molecule.send(:full_svg_path)

      next unless svg_file.present? && File.file?(svg_file)

      svg = File.read(svg_file)
      molecule.attach_svg(svg)
      molecule.update_columns(molecule_svg_file: molecule.molecule_svg_file)
    end

    samples = Sample.where(molecule: molecules)
    samples.find_each do |sample|
      next if sample.sample_svg_file.nil?

      svg_file = sample.send(:full_svg_path)
      next unless svg_file.present? && File.file?(svg_file)

      svg = File.read(svg_file)
      sample.sample_svg_file = svg
      sample.attach_svg
      sample.update_columns(sample_svg_file: sample.sample_svg_file)
    end

    reaction_samples = ReactionsSample.where(sample: samples)
    Reaction.where(id: reaction_samples.pluck(:id)).each do |reaction|
      reaction_svg_file = reaction.update_svg_file!
      reaction.update_columns(reaction_svg_file: reaction_svg_file)
    end
  end
end
