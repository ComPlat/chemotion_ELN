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
#  status             :integer          default("pending")
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
require 'rails_helper'

RSpec.describe ComputedProp do
  let(:raw_output) do
    <<~OUTPUT
         ---   maximum potential: 12.5
         ---   minimum potential: -3.25
         ---   mean potential: 1.5
         ---   mean absolute potential: 2.75
         ###   LUMO: -1.2
         ###   HOMO: -5.4
      ionization potential (IP): 6.1
      electron affinity (EA): 0.9
      Dipol in Debye: 1.85
      S1 excited energy: 3.0
      T1 excited energy: 2.8
      S1 oscillator strengths in length: 0.12
      T1 oscillator strengths in length: 0.0
      S1 electric transition dipole moment in length: 0.1 -0.2 0.3
      T1 electric transition dipole moment in length: 0.0 0.5 0.0
    OUTPUT
  end

  describe 'associations' do
    it { is_expected.to belong_to(:molecule) }
    it { is_expected.to belong_to(:user).with_foreign_key(:creator).class_name('User') }
  end

  describe 'status enum' do
    it 'defaults to pending' do
      expect(described_class.new).to be_pending
    end

    it 'maps statuses to their integer positions' do
      expect(described_class.statuses).to include('pending' => 0, 'failure' => 3, 'completed' => 6)
    end
  end

  describe '.parse_data' do
    it 'returns the numeric matches of the first line containing the target' do
      matches = described_class.parse_data(['foo: 1', 'bar: 2.5 -3', 'bar: 9'], 'bar')

      expect(matches.map { |m| m[1] }).to eq %w[2.5 -3]
    end
  end

  describe '.parse_single' do
    it 'returns the first number of the matching line as float' do
      expect(described_class.parse_single(['LUMO: -1.25 eV 7'], 'LUMO')).to eq(-1.25)
    end

    it 'ignores digits that are part of a word' do
      expect(described_class.parse_single(['S1 excited energy: 3.5'], 'S1 excited energy')).to eq 3.5
    end

    it 'raises when no line contains the target' do
      expect { described_class.parse_single(['HOMO: 1'], 'LUMO') }.to raise_error(NoMethodError)
    end
  end

  describe '.parse_multiple' do
    it 'returns all numbers of the matching line as floats' do
      expect(described_class.parse_multiple(['dipole: 0.1 -0.2 3'], 'dipole')).to eq [0.1, -0.2, 3.0]
    end
  end

  describe '.wavelength' do
    it 'converts an energy in eV to a wavelength in nm' do
      expect(described_class.wavelength(3.0)).to be_within(1e-5).of(413.280643)
    end
  end

  describe '.tadf_rate' do
    it 'computes the rate for a reference input' do
      rate = described_class.tadf_rate(1, 1.0, 1239.84193, 0.0)

      expect(rate).to be_within(1e7).of(1.6643855e13)
    end

    it 'scales with the cube of the iteration number' do
      single = described_class.tadf_rate(1, 0.12, 3.0, 0.2)

      expect(described_class.tadf_rate(2, 0.12, 3.0, 0.2)).to be_within(single * 1e-9).of(single * 8)
    end

    it 'decreases with a growing singlet-triplet gap' do
      small_gap = described_class.tadf_rate(1, 0.12, 3.0, 0.05)

      expect(described_class.tadf_rate(1, 0.12, 3.0, 0.2)).to be < small_gap
    end
  end

  describe '.from_raw' do
    let(:computed_prop) { create(:computed_prop, status: 'started', tddft: nil) }

    context 'when data is blank' do
      it 'returns nil for nil data' do
        expect(described_class.from_raw(computed_prop.id, nil)).to be_nil
      end

      it 'leaves the record untouched for empty data' do
        described_class.from_raw(computed_prop.id, '')

        expect(computed_prop.reload).to be_started
      end
    end

    context 'when data contains all properties' do
      before { described_class.from_raw(computed_prop.id, raw_output) }

      it 'stores the electrostatic potentials' do
        expect(computed_prop.reload).to have_attributes(
          max_potential: 12.5, min_potential: -3.25, mean_potential: 1.5, mean_abs_potential: 2.75,
        )
      end

      it 'stores orbital energies, IP, EA and dipole' do
        expect(computed_prop.reload).to have_attributes(lumo: -1.2, homo: -5.4, ip: 6.1, ea: 0.9, dipol_debye: 1.85)
      end

      it 'marks the record as completed and keeps the raw output' do
        computed_prop.reload

        expect(computed_prop).to be_completed
        expect(computed_prop.data).to eq('raw' => raw_output)
      end

      it 'stores the TDDFT energies and oscillator strengths' do
        expect(computed_prop.reload.tddft).to include(
          's1_energy' => 3.0, 't1_energy' => 2.8, 's1_osc' => 0.12, 't1_osc' => 0.0,
        )
      end

      it 'stores the transition dipoles as space separated strings' do
        expect(computed_prop.reload.tddft).to include('s1_dipole' => '0.1 -0.2 0.3', 't1_dipole' => '0.0 0.5 0.0')
      end

      it 'derives delta EST and the TADF rate' do
        tddft = computed_prop.reload.tddft

        expect(tddft['delta_est']).to be_within(1e-9).of(0.2)
        expect(tddft['tadf_rate']).to be_within(1e-3).of(described_class.tadf_rate(1, 0.12, 3.0, 0.2))
      end
    end

    context 'when a property is missing from the output' do
      it 'raises and does not complete the record' do
        truncated = raw_output.lines.reject { |l| l.include?('HOMO') }.join

        expect { described_class.from_raw(computed_prop.id, truncated) }.to raise_error(NoMethodError)
        expect(computed_prop.reload).to be_started
      end
    end

    context 'when the record does not exist' do
      it 'raises RecordNotFound' do
        expect { described_class.from_raw(-1, raw_output) }.to raise_error(ActiveRecord::RecordNotFound)
      end
    end
  end

  describe '#destroy' do
    it 'soft deletes the record' do
      computed_prop = create(:computed_prop)
      computed_prop.destroy

      expect(described_class.find_by(id: computed_prop.id)).to be_nil
      expect(described_class.with_deleted.find(computed_prop.id)).to be_present
    end
  end
end
