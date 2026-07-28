# frozen_string_literal: true

require 'rails_helper'


describe Export::ExportResearchPlan do
  describe '#to_relative_html' do
    let(:user) { create(:person) }
    let(:research_plan) { create(:research_plan, creator: user) }
    let(:attachment) do
      create(
        :attachment,
        bucket: 1,
        filename: 'upload.jpg',
        created_by: research_plan.creator.id,
        attachable: research_plan,
      )
    end
    let(:exporter) do
      described_class.new(
        research_plan.creator,
        research_plan,
        'irrelevant_export_format',
      )
    end

    before do
      research_plan.body = [
        {
          id: 'entry-003',
          type: 'image',
          value: {
            file_name: 'xyz.png',
            public_name: attachment.identifier,
          },
        },
      ]
      research_plan.save!
    end

    it 'exports images in body' do
      generated_html = exporter.to_relative_html

      expect(generated_html).to include(attachment.attachment_data['id'])
    end
  end

  describe '#to_png' do
    let(:user) { create(:person) }
    let(:research_plan) { create(:research_plan, creator: user) }
    let(:exporter) do
      described_class.new(user, research_plan, 'docx')
    end

    it 'passes aspect-ratio-preserving dimensions to Inkscape (not the reaction-scheme default)' do
      svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
      # molecule.svg is 200×200 with viewBox 0 0 100 100 → export_size uses viewBox
      expected_w, expected_h = Reporter::Img::Conv.export_size_for(
        svg_path,
        max_width: described_class::STRUCTURE_EXPORT_MAX,
        max_height: described_class::STRUCTURE_EXPORT_MAX,
      )

      expect(Reporter::Img::Conv).to receive(:by_inkscape)
        .with(svg_path, kind_of(String), 'png', width: expected_w, height: expected_h)

      exporter.to_png(svg_path)
    end

    it 'does not force a square molecule through the 1550×440 reaction-scheme canvas' do
      svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')
      allow(Reporter::Img::Conv).to receive(:by_inkscape)

      exporter.to_png(svg_path)

      expect(Reporter::Img::Conv).to have_received(:by_inkscape) do |_input, _output, _ext, kwargs|
        # Square page → square PNG; must not use the reaction-scheme 1550×440 pair
        expect(kwargs[:width]).to eq(kwargs[:height])
        expect([kwargs[:width], kwargs[:height]]).not_to eq([1550, 440])
      end
    end

    it 'returns nil when the SVG path is missing' do
      expect(exporter.to_png(nil)).to be_nil
      expect(exporter.to_png('/no/such/file.svg')).to be_nil
    end
  end

  describe 'structure field width hints' do
    let(:user) { create(:person) }
    let(:research_plan) { create(:research_plan, creator: user) }
    let(:svg_fixture) { Rails.root.join('spec/fixtures/images/molecule.svg') }
    let(:ketcher_name) { 'ketcher_export_test.svg' }
    let(:ketcher_path) { Rails.public_path.join('images/research_plans', ketcher_name) }

    before do
      FileUtils.mkdir_p(ketcher_path.dirname)
      FileUtils.cp(svg_fixture, ketcher_path)
      allow(Reporter::Img::Conv).to receive(:by_inkscape)

      research_plan.body = [
        {
          id: 'entry-ketcher',
          type: 'ketcher',
          value: { svg_file: ketcher_name, thumb_svg: '' },
        },
      ]
      research_plan.save!
    end

    after do
      FileUtils.rm_f(ketcher_path)
    end

    it 'embeds structure images with a display width for Pandoc' do
      html = described_class.new(user, research_plan, 'docx').to_html
      expect(html).to include("width='#{described_class::STRUCTURE_DISPLAY_WIDTH}'")
        .or include("width=\"#{described_class::STRUCTURE_DISPLAY_WIDTH}\"")
    end
  end
end
