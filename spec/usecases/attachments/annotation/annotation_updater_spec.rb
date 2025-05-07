# frozen_string_literal: true

describe Usecases::Attachments::Annotation::AnnotationUpdater do
  let(:svg_string) { Rails.root.join("spec/fixtures/annotations/#{svg_filename}").read }
  let(:svg_string2) { Rails.root.join("spec/fixtures/annotations/#{svg_filename2}").read }

  describe '.update_annotation()' do
    let(:update_process) { described_class.new.update_annotation('', attachment_id) }

    context 'when attachment does not exist' do
      let(:attachment_id) { -1 }

      it 'raises an error' do
        expect { update_process }.to raise_error(
          "Couldn't find Attachment with 'id'=#{attachment_id} [WHERE \"attachments\".\"deleted_at\" IS NULL]",
        )
      end
    end

    context 'when attachment does exist' do
      context 'when annotation is valide' do # rubocop:disable RSpec/NestedGroups
        let(:svg_filename) { '20221207_valide_annotation.svg' }
        let(:svg_filename2) { '20221207_valide_annotation_edited.svg' }
        let(:attachment) { create(:attachment, :with_png_image) }

        it 'updated annotation' do
          updater = described_class.new(ThumbnailerMock.new)
          updater.update_annotation(svg_string2, attachment.id)

          annotation = File.read(attachment.attachment(:annotation).url)

          expect(Loofah.xml_fragment(svg_string2).to_s).to eq Loofah.xml_fragment(annotation).to_s
        end
      end
    end

    context 'when annotation is undefined' do
      let(:svg_filename) { '20230111_invalide_annotation_undefined.svg' }
      let(:attachment) { create(:attachment, :with_png_image) }
      let(:original_annotation) { File.read(attachment.attachment(:annotation).url) }

      it 'annotation was not changed' do
        updater = described_class.new(ThumbnailerMock.new)
        updater.update_annotation(svg_string, attachment.id)
        annotation = File.read(attachment.attachment(:annotation).url)

        expect(Loofah.xml_fragment(original_annotation).to_s).to eq Loofah.xml_fragment(annotation).to_s
      end
    end
  end

  describe '.sanitize_svg_string()' do
    let(:sanitized_svg_string) { described_class.new.sanitize_svg_string(svg_string) }

    context 'when svg is valide' do
      let(:svg_filename) { '20221207_valide_annotation.svg' }

      it 'svg string was not changed' do
        expect(Loofah.xml_fragment(sanitized_svg_string).to_s).to eq Loofah.xml_fragment(svg_string).to_s
      end
    end

    context 'when svg has script tag' do
      let(:svg_filename) { '20221207_valide_annotation_script.svg' }
      let(:svg_filename2) { '20221207_valide_annotation_script_sanitized.svg' }

      it 'svg string was sanitized' do
        expect(Loofah.xml_fragment(sanitized_svg_string).to_s).to eq Loofah.xml_fragment(svg_string2).to_s
      end
    end

    context 'when svg has corrupted REST call' do
      let(:svg_filename) { '20221207_valide_annotation_rest_api_corrupted.svg' }

      it 'raises an "corrupted REST call error"' do
        expect { sanitized_svg_string }.to raise_exception 'Link to image not valid'
      end
    end
  end
end

class ThumbnailerMock
  def create_thumbnail(tmp_path)
    tmp_path
  end
end
