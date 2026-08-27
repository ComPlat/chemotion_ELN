# frozen_string_literal: true

require 'rails_helper'

# interpret_record's nil-hash-on-Fault contract was previously asserted only in a comment
# (app/models/molecule.rb:473-477), with no spec exercising it directly.
RSpec.describe Chemotion::PubchemService do
  describe '.interpret_record' do
    let(:empty_result) { { cid: nil, iupac_name: nil, names: [], topological: nil, log_p: nil } }

    it 'returns the nil-filled hash for a Fault body' do
      fault_record = { 'Fault' => { 'Code' => 'PUGREST.NotFound', 'Message' => 'No CID found' } }

      expect(described_class.interpret_record(fault_record)).to eq(empty_result)
    end

    it 'returns the nil-filled hash for a nil record' do
      expect(described_class.interpret_record(nil)).to eq(empty_result)
    end

    it 'parses a record given as a JSON string' do
      record = { 'PC_Compounds' => [{ 'id' => { 'id' => { 'cid' => 42 } }, 'props' => [] }] }.to_json

      expect(described_class.interpret_record(record)[:cid]).to eq(42)
    end

    # A malformed PC_Compounds entry (missing id, or props not an array) must degrade to the
    # same nil-filled shape a Fault produces, not raise NoMethodError up through
    # PubchemLookupJob -- exactly the realistic failure mode for a record that does resolve but
    # is shaped unexpectedly.
    it 'does not raise on a record with an empty id' do
      malformed = { 'PC_Compounds' => [{ 'id' => {}, 'props' => [] }] }

      expect { described_class.interpret_record(malformed) }.not_to raise_error
      expect(described_class.interpret_record(malformed)[:cid]).to be_nil
    end

    it 'does not raise on a record with no props at all' do
      malformed = { 'PC_Compounds' => [{ 'id' => { 'id' => { 'cid' => 1 } } }] }

      expect { described_class.interpret_record(malformed) }.not_to raise_error
      expect(described_class.interpret_record(malformed)[:cid]).to eq(1)
    end

    it 'extracts cid, iupac_name, names and inchikey from a well-formed record', :aggregate_failures do
      record = {
        'PC_Compounds' => [{
          'id' => { 'id' => { 'cid' => 962 } },
          'props' => [
            { 'urn' => { 'label' => 'IUPAC Name', 'name' => 'Preferred' }, 'value' => { 'sval' => 'water' } },
            { 'urn' => { 'label' => 'InChIKey' }, 'value' => { 'sval' => 'XLYOFNOQVPJJNP-UHFFFAOYSA-N' } },
          ],
        }],
      }

      result = described_class.interpret_record(record)

      expect(result[:cid]).to eq(962)
      expect(result[:iupac_name]).to eq('water')
      expect(result[:names]).to eq(['water'])
      expect(result[:inchikey]).to eq('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
    end

    it 'returns an empty array for a Fault body when as_array is true' do
      fault_record = { 'Fault' => { 'Code' => 'PUGREST.NotFound' } }

      expect(described_class.interpret_record(fault_record, true)).to eq([])
    end

    # Hash#dig guards a missing key but still raises TypeError on an intermediate value that is
    # present and not diggable, so the id is type-checked and not merely dug.
    it 'does not raise on a record whose id is not a hash' do
      malformed = { 'PC_Compounds' => [{ 'id' => 'unknown', 'props' => [] }] }

      expect { described_class.interpret_record(malformed) }.not_to raise_error
      expect(described_class.interpret_record(malformed)[:cid]).to be_nil
    end

    # The realistic malformed shape: the record resolves, but one property carries no urn.
    it 'skips a props entry with no urn instead of raising' do
      malformed = {
        'PC_Compounds' => [{
          'id' => { 'id' => { 'cid' => 962 } },
          'props' => [
            { 'value' => { 'sval' => 'orphan' } },
            { 'urn' => { 'label' => 'InChIKey' }, 'value' => { 'sval' => 'XLYOFNOQVPJJNP-UHFFFAOYSA-N' } },
          ],
        }],
      }

      result = described_class.interpret_record(malformed)

      expect(result[:inchikey]).to eq('XLYOFNOQVPJJNP-UHFFFAOYSA-N')
    end

    it 'reads a labelled props entry with no value as an empty string rather than raising' do
      malformed = {
        'PC_Compounds' => [{
          'id' => { 'id' => { 'cid' => 962 } },
          'props' => [{ 'urn' => { 'label' => 'IUPAC Name', 'name' => 'Preferred' } }],
        }],
      }

      expect(described_class.interpret_record(malformed)[:iupac_name]).to eq('')
    end

    it 'skips a PC_Compounds entry that is not a hash' do
      malformed = { 'PC_Compounds' => ['nonsense', { 'id' => { 'id' => { 'cid' => 7 } }, 'props' => [] }] }

      expect(described_class.interpret_record(malformed, true).map { |r| r[:cid] }).to eq([7])
    end
  end
end
