# frozen_string_literal: true

# == Schema Information
#
# Table name: nmr_sim_nmr_simulations
#
#  id          :integer          not null, primary key
#  molecule_id :integer
#  path_1h     :text
#  path_13c    :text
#  source      :text
#  deleted_at  :datetime
#  created_at  :datetime         not null
#  updated_at  :datetime         not null
#
# Indexes
#
#  index_nmr_sim_nmr_simulations_on_deleted_at              (deleted_at)
#  index_nmr_sim_nmr_simulations_on_molecule_id_and_source  (molecule_id,source) UNIQUE
#


# NMR Simulation
class NmrSimulation < ApplicationRecord
  self.table_name = 'nmr_sim_nmr_simulations'
  acts_as_paranoid
  belongs_to :molecule

  before_validation :path_valid_or_to_fetch
  validates :molecule_id, uniqueness: { scope: :source }

  def result
    { response_1h: read(path_1h), response_13c: read(path_13c) }
  end

  def invalid_file
    !valid_file(path_1h) || !valid_file(path_13c)
  end

  private

  def grasp_1h
    self.path_1h = compose_and_save('1h', data[:response_1h]) if data[:response_1h]
  end

  def grasp_13c
    self.path_13c = compose_and_save('13c', data[:response_13c]) if data[:response_13c]
  end

  def data
    send(source)
  end

  def nmrdb
    @nmrdb ||= Simulation::Nmrdb.new(molfile: molecule.molfile).fetch
  end

  def compose_and_save(type, json)
    file_path = generate_filepath(type)
    File.open(file_dir + '/' + file_path, 'w') { |file| file.write(json) }
    file_path
  end

  def generate_filepath(type)
    filepaths = { source: source, type: type, molfile: molecule.molfile, time: Time.current }
    key_base = "#{filepaths.to_a.flatten.join}"
    Digest::SHA256.hexdigest(key_base) + '.json'
  end

  def file_dir
    File.join(Rails.root, 'public', 'simulations', "#{source}")
  end

  def read(path)
    valid_file(path) ? File.open(file_dir + '/' + path) : nil
  end

  def valid_file(path)
    path && File.file?(file_dir + '/' + path)
  end

  def path_valid_or_to_fetch
    grasp_1h unless valid_file(path_1h)
    grasp_13c unless valid_file(path_13c)
  end
end
