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

    before { allow(Reporter::Img::Conv).to receive(:by_inkscape) }

    it 'rasterizes a square molecule to a square canvas, not the 1550x440 reaction default' do
      # molecule.svg declares width="200px" height="200px" (square; width/height
      # take precedence over its viewBox), so fitting it into STRUCTURE_EXPORT_MAX
      # yields exactly 1550x1550, never the reaction-scheme 1550x440.
      svg_path = Rails.root.join('spec/fixtures/images/molecule.svg')

      exporter.to_png(svg_path)

      expect(Reporter::Img::Conv).to have_received(:by_inkscape)
        .with(svg_path, kind_of(String), 'png', width: 1550, height: 1550)
    end

    it "preserves a wide SVG's aspect ratio instead of stretching it to a square" do
      Tempfile.open(['wide', '.svg']) do |f|
        f.write('<svg width="1560" height="440"></svg>')
        f.flush

        exporter.to_png(f.path)

        # 1560:440 fitted into 1550x1550 -> 1550x437: wide stays wide, not squashed.
        expect(Reporter::Img::Conv).to have_received(:by_inkscape)
          .with(f.path, kind_of(String), 'png', width: 1550, height: 437)
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
    let(:structure_width_regex) { width_regex(described_class::STRUCTURE_DISPLAY_WIDTH) }

    before { allow(Reporter::Img::Conv).to receive(:by_inkscape) }

    def width_regex(pixels)
      /width=['"]#{pixels}['"]/
    end

    def html_for(body)
      research_plan.update!(body: body)
      described_class.new(user, research_plan, 'docx').to_html
    end

    def readable_policy
      allow(ElementPolicy).to receive(:new).and_return(instance_double(ElementPolicy, read?: true))
    end

    context 'with a ketcher drawing' do
      let(:ketcher_name) { 'ketcher_export_test.svg' }
      let(:ketcher_path) { Rails.public_path.join('images/research_plans', ketcher_name) }

      before do
        FileUtils.mkdir_p(ketcher_path.dirname)
        FileUtils.cp(svg_fixture, ketcher_path)
      end

      after { FileUtils.rm_f(ketcher_path) }

      it 'embeds the drawing with the structure display width for Pandoc' do
        html = html_for([{ id: 'e-k', type: 'ketcher', value: { svg_file: ketcher_name, thumb_svg: '' } }])
        expect(html).to match(structure_width_regex)
      end

      it 'omits the width when the structure image is missing (no width-only broken img)' do
        body = [{ id: 'e-missing', type: 'ketcher', value: { svg_file: 'does_not_exist.svg', thumb_svg: '' } }]
        expect(html_for(body)).not_to match(structure_width_regex)
      end
    end

    context 'with a linked sample' do
      let(:sample) { create(:sample) }

      before do
        allow(Sample).to receive(:find_by).and_return(sample)
        allow(sample).to receive(:current_svg_full_path).and_return(svg_fixture.to_s)
        readable_policy
      end

      it 'embeds the sample structure with the structure display width for Pandoc' do
        html = html_for([{ id: 'e-s', type: 'sample', value: { sample_id: sample.id } }])
        expect(html).to match(structure_width_regex)
      end
    end

    context 'with a linked reaction' do
      let(:reaction) { create(:reaction) }

      before do
        allow(Reaction).to receive(:find_by).and_return(reaction)
        allow(reaction).to receive(:current_svg_full_path).and_return(svg_fixture.to_s)
        readable_policy
      end

      it 'embeds the reaction scheme with the wider reaction display width' do
        html = html_for([{ id: 'e-r', type: 'reaction', value: { reaction_id: reaction.id } }])
        expect(html).to match(width_regex(described_class::REACTION_DISPLAY_WIDTH))
        expect(html).not_to match(structure_width_regex)
      end
    end
  end
end
