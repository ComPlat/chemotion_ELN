# frozen_string_literal: true

RSpec.shared_context 'sample annotation context' do
  let(:seeded_sample_svg_file) do
    Rails
      .public_path
      .join('images', 'samples')
      .children
      .find { |file_as_pathname| file_as_pathname.extname == '.svg' }
      .basename
      .to_s
  end

  let(:sample) do
    create(:sample, sample_svg_file: seeded_sample_svg_file)
  end

  let(:sample_with_annotation) do
    sample.tap do |s|
      s.sample_svg_annotation = '<?xml version="1.0" encoding="UTF-8"?><svg></svg>'
      s.save
    end
  end

  def path_to_annotation_file(filename)
    Rails.public_path.join('images', 'samples', filename)
  end
end
