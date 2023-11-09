# frozen_string_literal: true

require 'rails_helper'

describe Usecases::Samples::BuildEmptyAnnotation do
  let(:seeded_sample_svg_file) do
    Dir
      .children(Rails.public_path.join('images', 'samples'))
      .select { |filename| filename.ends_with?('.svg') }
      .first
  end
  let(:sample) do
    create(:sample, sample_svg_file: seeded_sample_svg_file)
  end

  let(:dimensions) do
    MiniMagickImageAnalyser.new.get_image_dimensions(Rails.public_path.join('images', 'samples', seeded_sample_svg_file))
  end

  describe '#generate!' do
    it 'generates a svg string based on the sample svg file' do
      result = Usecases::Samples::BuildEmptyAnnotation.new(sample: sample).generate!

      expect(result).to eq(
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
      )
    end
  end
end
