# frozen_string_literal: true

require 'rails_helper'

describe CodePdf do
  let(:config) do
    build(:attributes_set, from: 'json/printingConfig/defaultConfig',
                           fixtures_dir: Rails.public_path)
  end
  let(:sample) { build(:sample) }
  let(:code_log) { build(:code_log, source: 'sample', source_id: sample.id) }
  let(:instance) { described_class.allocate }
  let(:valid_svg_path) { Rails.root.join('spec/fixtures/svg/cyclo.test.svg') }

  describe '#image_data_getter' do
    before do
      allow(sample).to receive_messages(
        full_svg_path: valid_svg_path,
        code_log: code_log,
      )
      allow(instance).to receive_messages(
        iterate: nil,
      )
    end

    it 'returns the image data size' do
      result = nil
      allow(instance).to receive(:image_data_getter).and_wrap_original do |original_method|
        result = original_method.call
      end
      instance.send(:initialize, [sample], element_type: 'sample', display_sample: true, **config['Data Matrix code'])
      expect(instance).to have_received :image_data_getter

      expect(result).to include('94pt', '107pt', valid_svg_path)
    end

    it 'returns the dummy image set' do
      result = nil
      allow(sample).to receive_messages(
        full_svg_path: nil,
      )
      allow(instance).to receive(:image_data_getter).and_wrap_original do |original_method|
        result = original_method.call
      end
      instance.send(:initialize, [sample], element_type: 'sample', display_sample: true, **config['Data Matrix code'])
      expect(result).to include('180', '180')
    end
  end
end
