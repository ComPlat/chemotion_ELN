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

  describe 'richtext field with inline Quill attachment ops' do
    # Regression guard for the RP export path's handling of the
    # `attachment-image` / `attachment-file` Quill Embed ops introduced with the
    # drop-into-richtext feature. Without materialize_richtext_attachments,
    # QuillUtils#filter_image strips both shapes and the exported document
    # loses everything the user dropped into the editor.
    let(:user) { create(:person) }
    let(:research_plan) { create(:research_plan, creator: user) }
    let(:image_attachment) do
      create(
        :attachment,
        bucket: 1,
        filename: 'inline.png',
        created_by: user.id,
        attachable: research_plan,
      )
    end
    let(:exporter) { described_class.new(user, research_plan, 'html') }

    def richtext_body(ops)
      [{ id: 'e-rt', type: 'richtext', value: { 'ops' => ops } }]
    end

    it 'rewrites attachment-image ops to an <img> Pandoc can bundle' do
      ops = [
        { 'insert' => 'Before ' },
        { 'insert' => { 'attachment-image' => {
          'attachment_identifier' => image_attachment.identifier, 'filename' => 'inline.png'
        } } },
        { 'insert' => " after\n" },
      ]
      research_plan.update!(body: richtext_body(ops))

      html = exporter.to_html

      aggregate_failures do
        expect(html).to include('Before')
        expect(html).to include('after')
        expect(html).to match(/<img[^>]+src=['"][^'"]+\.png['"]/)
        expect(html).not_to include('attachment-image')
        expect(html).not_to include('attachment_identifier')
      end
    end

    it 'renders attachment-file ops as plain-text labels when the format cannot bundle files' do
      # Single-file formats (docx/pdf/odt/...) can't carry a companion folder,
      # so we fall back to a `[filename]` label instead of a broken relative
      # link. The identifier is intentionally unresolvable here to also cover
      # the orphan-file case.
      ops = [
        { 'insert' => 'Attached: ' },
        { 'insert' => { 'attachment-file' => {
          'attachment_identifier' => 'anything', 'filename' => 'report.pdf', 'filesize' => 42
        } } },
        { 'insert' => "\n" },
      ]
      research_plan.update!(body: richtext_body(ops))
      # Instantiate AFTER updating the body — the exporter walks fields in #initialize.
      exporter_docx = described_class.new(user, research_plan, 'docx')

      html = exporter_docx.to_html

      aggregate_failures do
        expect(html).to include('Attached:')
        expect(html).to include('[report.pdf]')
        expect(html).not_to include('attachment-file')
        expect(html).not_to include('attachment_identifier')
      end
    end

    it 'bundles attachment-file ops into the ZIP under files/ for zip-producing formats' do
      file_attachment = create(
        :attachment,
        bucket: 1,
        filename: 'report.pdf',
        created_by: user.id,
        attachable: research_plan,
      )
      ops = [
        { 'insert' => 'See ' },
        { 'insert' => { 'attachment-file' => {
          'attachment_identifier' => file_attachment.identifier, 'filename' => 'report.pdf'
        } } },
        { 'insert' => "\n" },
      ]
      research_plan.update!(body: richtext_body(ops))

      # to_html surfaces the anchor + hits the strip_unsafe_bundled_link_prefix
      # workaround (quill-delta-to-html tags relative URLs `unsafe:` by default).
      html = exporter.to_html
      zip_bytes = exporter.to_zip
      entries = []
      Zip::InputStream.open(StringIO.new(zip_bytes)) { |io| while (e = io.get_next_entry); entries << e.name; end }

      aggregate_failures do
        expect(html).to match(%r{<a[^>]+href=['"]files/[^'"]+\.pdf['"]})
        expect(html).not_to include('unsafe:')
        expect(html).not_to include('[report.pdf]')
        expect(entries).to include('document.html')
        expect(entries.any? { |n| n.start_with?('files/') && n.end_with?('.pdf') }).to be true
      end
    end

    it 'drops attachment-image ops whose identifier does not resolve to a file' do
      ops = [
        { 'insert' => 'Only text ' },
        { 'insert' => { 'attachment-image' => {
          'attachment_identifier' => 'orphan-that-does-not-exist', 'filename' => 'gone.png'
        } } },
        { 'insert' => "kept\n" },
      ]
      research_plan.update!(body: richtext_body(ops))

      html = exporter.to_html

      aggregate_failures do
        expect(html).to include('Only text')
        expect(html).to include('kept')
        expect(html).not_to include('<img')
        expect(html).not_to include('attachment-image')
      end
    end
  end

  describe 'PNG tempfile lifecycle' do
    let(:user) { create(:person) }
    let(:research_plan) { create(:research_plan, creator: user) }
    let(:svg_fixture) { Rails.root.join('spec/fixtures/images/molecule.svg') }
    let(:ketcher_name) { 'ketcher_lifecycle_test.svg' }
    let(:ketcher_path) { Rails.public_path.join('images/research_plans', ketcher_name) }
    let(:exporter) { described_class.new(user, research_plan, 'docx') }

    before do
      FileUtils.mkdir_p(ketcher_path.dirname)
      FileUtils.cp(svg_fixture, ketcher_path)
      allow(Reporter::Img::Conv).to receive(:by_inkscape)
      research_plan.update!(
        body: [{ id: 'e-k', type: 'ketcher', value: { svg_file: ketcher_name, thumb_svg: '' } }],
      )
    end

    after { FileUtils.rm_f(ketcher_path) }

    def retained_tempfiles
      exporter.instance_variable_get(:@png_tempfiles)
    end

    # Regression: to_html must NOT clean up the PNGs — to_relative_html feeds that
    # same HTML to Pandoc, which reads the <img> paths only inside to_file/to_zip.
    it 'keeps the rendered PNGs on disk through to_html so Pandoc can still read them' do
      exporter.to_html

      paths = retained_tempfiles.map(&:path)
      expect(paths).not_to be_empty
      expect(paths.select { |path| File.file?(path) }).to eq(paths)
    end

    it 'releases the PNGs only after to_file hands the HTML to Pandoc' do
      readable_at_convert = []
      allow(PandocRuby).to receive(:convert) do
        readable_at_convert = retained_tempfiles.map(&:path).select { |path| File.file?(path) }
        'converted'
      end

      exporter.to_file

      expect(readable_at_convert).not_to be_empty
      expect(retained_tempfiles).to be_empty
    end
  end
end
