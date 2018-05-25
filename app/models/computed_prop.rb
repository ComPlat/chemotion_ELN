# frozen_string_literal: true

# ComputedProp, Molecule computed properties via OpenMOPAC and TURBOMOLE
class ComputedProp < ActiveRecord::Base
  belongs_to :molecule

  enum status: { not_computed: 0, in_progress: 1, completed: 2 }

  def self.parse_data(line_arr, target_str)
    line = line_arr.select { |l| l.include?(target_str) }.first
    matches = line.match(/(-?(\d+\.)?(\d+))/)
    return nil if matches.nil?

    matches.captures.first.to_f
  end

  def self.from_raw(name, data)
    sample = Sample.where(short_label: name).first
    return if sample.nil?

    cp = sample.molecule_computed_prop
    data_arr = data.split("\n").map { |x|
      x.gsub('   ---   ', '').gsub('   ###   ', '')
    }

    cp.max_potential = parse_data(data_arr, 'maximum potential')
    cp.min_potential = parse_data(data_arr, 'minimum potential')
    cp.mean_potential = parse_data(data_arr, 'mean potential')
    cp.mean_abs_potential = parse_data(data_arr, 'mean absolute potential')
    cp.lumo = parse_data(data_arr, 'LUMO')
    cp.homo = parse_data(data_arr, 'HOMO')
    cp.ip = parse_data(data_arr, 'ionization potential (IP)')
    cp.ea = parse_data(data_arr, 'electron affinity (EA)')
    cp.dipol_debye = parse_data(data_arr, 'Dipol in Debye')
    cp.data = { raw: data }
    cp.status = 'completed'
    cp.save!
  end
end
