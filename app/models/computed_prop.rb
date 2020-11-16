# frozen_string_literal: true

# == Schema Information
#
# Table name: computed_props
#
#  id                 :integer          not null, primary key
#  molecule_id        :integer
#  max_potential      :float            default(0.0)
#  min_potential      :float            default(0.0)
#  mean_potential     :float            default(0.0)
#  lumo               :float            default(0.0)
#  homo               :float            default(0.0)
#  ip                 :float            default(0.0)
#  ea                 :float            default(0.0)
#  dipol_debye        :float            default(0.0)
#  status             :integer          default(0)
#  data               :jsonb
#  created_at         :datetime
#  updated_at         :datetime
#  mean_abs_potential :float            default(0.0)
#  creator            :integer          default(0)
#  sample_id          :integer          default(0)
#  tddft              :jsonb
#  task_id            :string
#  deleted_at         :datetime
#
# Indexes
#
#  index_computed_props_on_deleted_at  (deleted_at)
#

# ComputedProp, Molecule computed properties via OpenMOPAC and TURBOMOLE
class ComputedProp < ApplicationRecord
  acts_as_paranoid

  belongs_to :molecule
  belongs_to :user

  enum status: %w[
    pending
    started
    success
    failure
    retry
    revoked
  ]

  def self.parse_single(line_arr, target_str)
    matches = parse_data(line_arr, target_str)
    matches.first[1].to_f
  end

  def self.parse_multiple(line_arr, target_str)
    matches = parse_data(line_arr, target_str)
    matches.map { |m| m[1].to_f }
  end

  def self.parse_data(line_arr, target_str)
    line = line_arr.select { |l| l.include?(target_str) }.first
    line.scan(/([^\w])(-?(\d+\.)?(\d+))/)
  end

  def self.from_raw(compute_id, data)
    return if data.nil? || data.empty?

    cp = ComputedProp.find(compute_id)
    return if cp.nil?

    data_arr = data.split("\n").map do |x|
      x.gsub('   ---   ', '').gsub('   ###   ', '')
    end

    cp.max_potential = parse_single(data_arr, 'maximum potential')
    cp.min_potential = parse_single(data_arr, 'minimum potential')
    cp.mean_potential = parse_single(data_arr, 'mean potential')
    cp.mean_abs_potential = parse_single(data_arr, 'mean absolute potential')
    cp.lumo = parse_single(data_arr, 'LUMO')
    cp.homo = parse_single(data_arr, 'HOMO')
    cp.ip = parse_single(data_arr, 'ionization potential (IP)')
    cp.ea = parse_single(data_arr, 'electron affinity (EA)')
    cp.dipol_debye = parse_single(data_arr, 'Dipol in Debye')
    cp.data = { raw: data }

    # TDDFT information
    s1_energy = parse_single(data_arr, 'S1 excited energy')
    t1_energy = parse_single(data_arr, 'T1 excited energy')
    singlet_oscilator_strg = parse_single(data_arr, 'S1 oscillator strengths in length')
    delta_est = s1_energy - t1_energy
    cp.tddft = {
      s1_energy: s1_energy,
      s1_osc: singlet_oscilator_strg,
      s1_dipole: parse_multiple(data_arr, 'S1 electric transition dipole moment in length').join(' '),
      t1_energy: t1_energy,
      t1_osc: parse_single(data_arr, 'T1 oscillator strengths in length'),
      t1_dipole: parse_multiple(data_arr, 'T1 electric transition dipole moment in length').join(' '),
      delta_est: delta_est,
      tadf_rate: tadf_rate(1, singlet_oscilator_strg, s1_energy, delta_est)
    }

    cp.status = 'completed'
    cp.save!
  end

  def self.wavelength(excited_energy)
    1239.84193 / excited_energy
  end

  def self.tadf_rate(iterate_num, singlet_oscilator_strg, s1_energy, delta_est)
    k_bt = 0.025 # eV because dE is in eV
    l = wavelength(s1_energy) # in nm
    # l = S1_exp(wavelength(S1)) # in nm

    pre = 2.0 * Math::PI * 1.6e-19**2.0 / (8.85e-12 * 9.1e-31 * 3.0e8) # all SI
    post = 1.0 / (1.0 + 3.0 * Math.exp(delta_est / k_bt))
    pre * iterate_num**3.0 * singlet_oscilator_strg / (1e-18 * l**2.0) * post
  end
end
