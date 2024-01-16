# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Samples::BuildEmptyAnnotation do
  include_context 'sample annotation context'

  let(:dimensions) do
    MiniMagickImageAnalyser.new.get_image_dimensions(
      Rails.public_path.join('images', 'samples', seeded_sample_svg_file),
    )
  end

  describe '#generate!' do
    let(:expected_result) do
      <<~ENDOFSTRING
        <?xml version="1.0" encoding="UTF-8"?>
        <svg
          width="#{dimensions[:width]}"
          height="#{dimensions[:height]}"
          xmlns="http://www.w3.org/2000/svg"
          xmlns:svg="http://www.w3.org/2000/svg"
          xmlns:xlink="http://www.w3.org/1999/xlink"
        >
          <g
            class="layer"
            id="background"
          >
            <title>Image</title>
            <image
              height="#{dimensions[:height]}"
              width="#{dimensions[:width]}"
              id="original_image"
              xlink:href="/images/samples/#{seeded_sample_svg_file}"
            />
          </g>
          <g
            class="layer"
            id="annotation"
          >
            <title>Annotation</title>
          </g>
        </svg>
      ENDOFSTRING
    end

    it 'generates a svg string based on the sample svg file' do
      result = described_class.new(sample: sample).generate!

      expect(result).to eq expected_result
    end
  end
end
