# frozen_string_literal: true

require 'rails_helper'

RSpec.describe Attachment, type: :model do
  let(:attachment) { create(:attachment) }

  describe '#extname' do
    it 'returns filename extension' do
      expect(attachment.extname).to eq('.txt')
    end
  end

  describe '#read_file' do
    it 'returns content of file' do
      expect(attachment.read_file).to eq("Hello world\n")
    end
  end

  describe '#read_thumbnail' do
    context 'when no thumbnail exists' do
      it 'returns nil' do
        expect(attachment.read_thumbnail).to be_nil
      end
    end

    context 'when thumbnail exists' do
      let(:attachment) { create(:attachment, :with_image) }

      it 'returns content of thumbnail file' do
        expect(attachment.read_thumbnail).not_to be_nil
      end
    end
  end

  describe '#abs_path' do
    it 'returns the absolute path of file' do
      expected_path = Rails.root.join("uploads/test/1/#{attachment.identifier}").to_s
      expect(attachment.abs_path).to eq(expected_path)
    end
  end

  describe '#add_checksum' do
    it 'returns a MD5 checksum' do
      expect(attachment.add_checksum).to be_present
      expect(attachment['checksum']).to be_present
    end
  end

  describe '#for_research_plan?' do
    subject { attachment.for_research_plan? }

    context 'when not attached to research_plan' do
      let(:attachment) { create(:attachment, :attached_to_container) }

      it 'returns false' do
        expect(subject).to be(false)
      end
    end

    context 'when attached to research_plan' do
      let(:attachment) { create(:attachment, :attached_to_research_plan) }

      it 'returns true' do
        expect(subject).to be(true)
      end
    end
  end

  describe '#for_container?' do
    subject { attachment.for_container? }

    context 'when not attached to container' do
      let(:attachment) { create(:attachment, :attached_to_research_plan) }

      it 'returns false' do
        expect(subject).to be(false)
      end
    end

    context 'when attached to container' do
      let(:attachment) { create(:attachment, :attached_to_container) }

      it 'returns true' do
        expect(subject).to be(true)
      end
    end
  end

  describe '#research_plan_id' do
    let(:attachment) { build(:attachment, attachable_type: attachable_type, attachable_id: attachable_id) }
    let(:attachable_id) { 666 }

    context 'when attached to a research plan' do
      let(:attachable_type) { 'ResearchPlan' }

      it 'returns the id of the research plan' do
        expect(attachment.research_plan_id).to eq attachable_id
      end
    end

    context 'when not attached to a research_plan' do
      let(:attachable_type) { 'Container' }

      it 'returns nil' do
        expect(attachment.research_plan_id).to be_nil
      end
    end
  end

  describe '#container_id' do
    let(:attachment) { build(:attachment, attachable_type: attachable_type, attachable_id: attachable_id) }
    let(:attachable_id) { 666 }

    context 'when attached to a container' do
      let(:attachable_type) { 'Container' }

      it 'returns the id of the container' do
        expect(attachment.container_id).to eq attachable_id
      end
    end

    context 'when not attached to a container' do
      let(:attachable_type) { 'ResearchPlan' }

      it 'returns nil' do
        expect(attachment.container_id).to be_nil
      end
    end
  end

  describe '#research_plan' do
    let(:attachment) { build(:attachment, attachable: attachable) }

    context 'when attached to a research plan' do
      let(:attachable) { build(:research_plan) }

      it 'returns the research plan' do
        expect(attachment.research_plan).to eq attachable
      end
    end

    context 'when not attached to a research_plan' do
      let(:attachable) { build(:container) }

      it 'returns nil' do
        expect(attachment.research_plan).to be_nil
      end
    end
  end

  describe '#container' do
    let(:attachment) { build(:attachment, attachable: attachable) }

    context 'when attached to a container' do
      let(:attachable) { build(:container) }

      it 'returns the container' do
        expect(attachment.container).to eq attachable
      end
    end

    context 'when not attached to a container' do
      let(:attachable) { build(:research_plan) }

      it 'returns nil' do
        expect(attachment.container).to be_nil
      end
    end
  end

  describe '#update_research_plan!' do
    before do
      attachment.update_research_plan!(666)
    end

    it 'assigns the provided id as attachable_id and sets the attachable_type to "ResearchPlan"' do
      expect(attachment).to have_attributes(attachable_id: 666, attachable_type: 'ResearchPlan')
    end
  end

  describe '#rewrite_file_data!' do
    context 'when file_path leads to an existing file' do
      let(:old_file_content) { 'Foo Bar' }
      let(:attachment) { create(:attachment, file_data: old_file_content) }

      let(:new_file_path) { File.join("#{Rails.root}/spec/fixtures/upload.txt") }
      let(:new_file_content) { IO.binread(new_file_path) }

      it 'overwrites the attachment file with the new file' do
        attachment.file_path = new_file_path
        attachment.rewrite_file_data!

        expect(attachment.read_file).to eq new_file_content
      end
    end
  end

  #  describe '#update_filesize' do
  #    before do
  #      # this is just to have an easier base to compare from
  #      attachment.filesize = 0
  #    end
  #
  #    context 'when attachment has file_path set' do
  #      let(:expected_filesize) { File.size(attachment.file_path) }
  #
  #      before do
  #        attachment.file_path = File.join("#{Rails.root}/spec/fixtures/upload.txt")
  #      end
  #
  #      it 'sets the filesize attributes to the filesize of the pointed file' do
  #        expect { attachment.update_filesize }.to change(attachment, :filesize).from(0).to(expected_filesize)
  #      end
  #    end
  #
  #
  #    context 'when attachment has file_data set' do
  #      let(:file_data) { 'Foo Bar' }
  #      let(:expected_filesize) { file_data.bytesize }
  #
  #      before do
  #        attachment.file_data = file_data
  #        attachment.file_path = nil
  #      end
  #
  #      it 'sets the filesize attribute to the size of the file_data accessor\'s content' do
  #        expect { attachment.update_filesize }.to change(attachment, :filesize).from(0).to(expected_filesize)
  #      end
  #    end
  #
  #    context 'when attachment has both file_path and file_data set' do
  #      let(:new_file_data) { 'Foo Bar' }
  #      let(:file_path) { File.join("#{Rails.root}/spec/fixtures/upload.txt") }
  #      let(:expected_filesize) { File.size(file_path) }
  #
  #      # this has to match the logic in attachment.store.write_file, so the correct filesize is used
  #      it 'sets the filesize to the size of the file pointed at by file_path' do
  #        expect { attachment.update_filesize }.to change(attachment, :filesize).from(0).to(expected_filesize)
  #      end
  #    end
  #
  #    context 'when attachment has neither file nor file_data' do
  #      before do
  #        attachment.file_path = nil
  #        attachment.file_data = nil
  #      end
  #
  #      it 'does not change the filesize attribute' do
  #        expect { attachment.update_filesize }.not_to change(attachment, :filesize)
  #      end
  #    end
  #  end
  #
  #  describe '#add_content_type' do
  #    context 'when content_type is present' do
  #      before do
  #        attachment.content_type = 'foobar'
  #      end
  #
  #      it 'does not change the content_type field' do
  #        attachment.add_content_type
  #
  #        expect(attachment.content_type).to eq 'foobar'
  #      end
  #    end
  #
  #    context 'when content_type is missing' do
  #      before do
  #        attachment.content_type = nil
  #      end
  #
  #      it 'guesses the content_type based on the file extension' do
  #        attachment.add_content_type
  #
  #        expect(attachment.content_type).to eql 'text/plain'
  #      end
  #    end
  #  end

  describe 'type_image?' do
    let(:image_attachment) { create(:attachment, :with_image) }
    let(:text_attachment) { create(:attachment) }

    it 'returns true if the attachment is an image, or false if not' do
      expect(image_attachment.type_image?).to be true
      expect(text_attachment.type_image?).to be false
    end
  end

  describe 'type_image_tiff?' do
    let(:image_attachment) { create(:attachment, :with_tif_file) }

    it 'returns true if the attachment is a tiff image, or false if not' do
      expect(image_attachment.type_image_tiff?).to be true
      expect(attachment.type_image_tiff?).to be false
    end
  end

  describe 'type_pdf?' do
    let(:pdf_attachment) { create(:attachment, :with_pdf) }

    it 'returns true if the attachment is a pdf image, or false if not' do
      expect(pdf_attachment.type_pdf?).to be true
      expect(attachment.type_pdf?).to be false
    end
  end

  # TODO: fix with_annotation factory: currently this test deletes the attached file
  describe 'annotated?' do
    let(:annotated_attachment) { create(:attachment, :with_annotation) }
    let(:unannotated_attachment) { create(:attachment) }

    xit 'returns true if the attachment is annotated, or false if not' do
      expect(puts(annotated_attachment.attachment_attacher.derivatives) && annotated_attachment.annotated?).to be true
      expect(unannotated_attachment.annotated?).to be false
    end
  end

  describe '.create' do
    # Callbacks from attachment model
    it 'generates a key' do
      expect(attachment.key).to be_present
    end

    context 'when attachment is a new upload' do
      # Thumbnails are only generated when a file is attached, having file_data does not suffice

      context 'when the file is not thumbnailable' do
        let(:attachment) { create(:attachment, file_path: Rails.root.join('spec', 'fixtures', 'upload.txt')) }

        it 'saves the file' do
          expect(attachment.read_file).not_to be_nil
        end

        it 'sets the thumbnail field to false' do
          expect(attachment.thumb).to be false
        end

        it 'does not save a thumbnail' do
          expect(attachment.read_thumbnail).to be_nil
        end
      end

      context 'when the file is thumbnailable' do
        let(:attachment) { create(:attachment, :with_image) }

        it 'saves the file' do
          expect(attachment.read_file).not_to be_nil
        end

        it 'sets the thumbnail field to true' do
          expect(attachment.thumb).to be true
        end

        it 'saves the thumbnail' do
          expect(attachment.read_thumbnail).not_to be_nil
        end
      end

      it 'generates a checksum of the file content' do
        expect(attachment.checksum).to be_present
      end
    end

    it 'determines the content type of the file' do
      expect(attachment.attachment['mime_type']).to eq 'text/plain'
      # expect(attachment.content_type).to eq 'text/plain'
    end

    it 'fetches the generated identifier from the db' do
      expect(attachment.identifier).to be_present
    end

    context 'when duplicated accessor is set' do
      pending 'check if the copy method and the duplicated accessor are still used'
      # it 'duplicates the file and thumbnail' do
      # end
    end

    # callbacks from the AttachmentJcampAasm concern
    context 'when AttachmentJcampAasm concern is included' do
      let(:attachment) { build(:attachment) }

      it 'calls init_aasm' do
        expect(attachment).to receive(:init_aasm)

        attachment.save
      end
    end
  end

  describe '#save' do
    # callbacks from AttachmentJcampAasm concern
    context 'when AttachmentJcampAasm concern is included' do
      it 'calls require_peaks_generation?' do
        expect(attachment).to receive(:require_peaks_generation?)
        attachment.update(key: 'uuid')
      end
    end
  end

  describe '#destroy' do
    # use image file to have a
    let(:attachment) { create(:attachment, :with_image) }

    it 'deletes the attached file' do
      attachment.destroy
      expect(File.exist?(attachment.attachment_attacher.file.url)).to be false
    end

    it 'deletes the thumbnail' do
      attachment.destroy
      expect(File.exist?(attachment.attachment(:thumbnail).url)).to be false
    end
  end

  # Methods from AttachmentJcampAasm concern
  describe '#filename_parts' do
    it 'returns the filename parts when split by .' do
      expect(attachment.filename_parts).to eq %w[upload txt]
    end
  end

  describe '#extension_parts' do
    it 'returns the last two filename parts' do
      expect(attachment.extension_parts).to eq %w[upload txt]
    end
  end

  describe '#init_aasm' do
    let(:attachment) { build(:attachment) }

    context 'with transferred accessor present' do
      before do
        attachment.transferred = true
      end

      it 'returns nil' do
        expect(attachment.init_aasm).to be_nil
      end

      it 'does not change the aasm_state' do
        expect(attachment.idle?).to be true
      end
    end

    context 'with aasm_state other than idle' do
      before do
        attachment.aasm_state = :csv
      end

      it 'returns nil' do
        expect(attachment.init_aasm).to be_nil
      end

      it 'does not change the aasm_state' do
        expect(attachment.csv?).to be true
      end
    end

    context 'when filename has a spectra file extension' do
      it 'sets the aasm_state to queueing' do
        attachment.filename = 'whatever.jdx'
        attachment.init_aasm

        expect(attachment.queueing?).to be true
      end
    end

    context 'when filename has a non-spectra file extension' do
      it 'sets the aasm_state to non_jcamp' do
        attachment.init_aasm

        expect(attachment.non_jcamp?).to be true
      end
    end
  end

  describe '#require_peaks_generation?' do
    context 'when transferred accessor is present' do
      it 'returns nil' do
        attachment.transferred = true

        expect(attachment.require_peaks_generation?).to be_nil
      end
    end

    context 'when attachable is not an analysis subcontainer' do
      it 'returns nil' do
        expect(attachment.require_peaks_generation?).to be_nil
      end
    end

    context 'when attachable is an analysis subcontainer' do
      before do
        allow(attachment).to receive(:belong_to_analysis?).and_return(true)
      end

      context 'when aasm_state is peaked' do
        it 'returns nil' do
          attachment.aasm_state = :peaked

          expect(attachment.require_peaks_generation?).to be_nil
        end
      end

      context 'when aasm_state is edited' do
        it 'returns nil' do
          attachment.aasm_state = :edited

          expect(attachment.require_peaks_generation?).to be_nil
        end
      end

      context 'when filename has no spectra file extension' do
        it 'returns nil' do
          expect(attachment.require_peaks_generation?).to be_nil
        end
      end

      context 'when filename has a spectra file extension with a .peak. prefix' do
        before do
          attachment.filename = 'whatever.peak.jdx'
        end

        it 'generates only an image' do
          expect(attachment).to receive(:generate_img_only).with('peak')

          attachment.require_peaks_generation?
        end
      end

      context 'when filename has a spectra file extension with a .edit. prefix' do
        before do
          attachment.filename = 'whatever.edit.jdx'
        end

        it 'generates only an image' do
          expect(attachment).to receive(:generate_img_only).with('edit')

          attachment.require_peaks_generation?
        end
      end

      context 'when filename has a spectra file extension without special prefixes' do
        before do
          attachment.filename = 'whatever.jdx'
        end

        context 'when the file is still in Tmp storage' do
          it 'returns nil' do
            attachment.storage = 'tmp'

            expect(attachment.require_peaks_generation?).to be_nil
          end
        end

        context 'when the file is no longer in Tmp storage' do
          before do
            attachment.storage = 'some_other_storage'
          end

          context 'when aasm_state = queueing' do
            it 'generates a spectrum' do
              attachment.aasm_state = :queueing
              expect(attachment).to receive(:generate_spectrum).with(true, false)

              attachment.require_peaks_generation?
            end
          end

          context 'when aasm_state = regenerating' do
            it 'regenerates the spectrum' do
              attachment.aasm_state = :regenerating
              expect(attachment).to receive(:generate_spectrum).with(true, true)

              expect(attachment.regenerating?).to be true
              attachment.require_peaks_generation?
            end
          end
        end
      end
    end
  end

  describe '#belong_to_analysis?' do
    context 'when attachable is not a container' do
      it 'returns false' do
        expect(attachment.belong_to_analysis?).to be false
      end
    end

    context 'when attachment is attached to a direct subcontainer with container_type analysis' do
      let(:attachment) { create(:attachment, attachable: analysis_subcontainer) }
      let(:analysis_subcontainer) { create(:container, parent: analysis_container) }
      let(:analysis_container) { create(:container, container_type: 'analysis') }

      it 'returns true' do
        expect(attachment.belong_to_analysis?).to be true
      end
    end
  end

  # Methods from AttachmentJcampProcess concern
  describe '#generate_att' do
    let(:attachment) { build(:attachment) }
    let(:ext) { 'jpg' }
    let(:new_attachment) { attachment.generate_att(tempfile, addon = 'foo', to_edit = false, ext) }

    context 'without tempfile' do
      let(:tempfile) { nil }

      it 'does not create a new attachment' do
        expect { attachment.generate_att(nil, false) }.not_to change(Attachment, :count)
      end

      it 'returns nil' do
        expect(attachment.generate_att(nil, false)).to be_nil
      end
    end

    context 'with tempfile' do
      let(:tempfile) { Tempfile.new(attachment.filename) }
      let(:attachment) { create(:attachment) }

      it 'creates a new attachment' do
        expect { new_attachment }.to change(described_class, :count).by(2)
      end

      it 'saves the new attachment to the primary storage' do
        # TODO: klären ob das sinnvoll ist oder ob die Storage explizit geprüft werden soll statt relativ zur Config
        expect(new_attachment.storage).to eq Rails.configuration.storage.primary_store
      end

      # TOFIX: broken test: mime type is not set by ext name only and the test file should have some content
      #      it 'sets new new attachment\'s content_type to application/octet-stream' do
      #        expect(new_attachment.content_type).to eq 'application/octet-stream'
      #      end

      it 'attaches the new attachment to the current attachment\'s attachable' do
        # needs to be persisted so the attachable is persisted as well
        attachment.save!

        expect(new_attachment.attachable).to eq attachment.attachable
      end

      context 'with spectra file and to_edit = true' do
        let(:attachment) { create(:attachment, :with_spectra_file) }
        let(:new_attachment) { attachment.generate_att(tempfile, addon = nil, to_edit = true) }

        it 'sets the new attachment\'s aasm_state to edited' do
          expect(new_attachment.edited?).to be true
        end
      end

      context 'with ext = png' do
        let(:attachment) { create(:attachment, :with_png_image) }
        let(:ext) { 'png' }

        it 'sets the new attachment\'s aasm_state to :image' do
          expect(new_attachment.image?).to be true
        end

        # TOFIX or rm: broken test: mime type is not set by ext name only and the test file should have some content
        #        it 'sets the new attachment\'s content_type to image/png' do
        #          expect(new_attachment.content_type).to eq 'image/png'
        #        end
      end

      context 'with ext = json' do
        let(:attachment) { create(:attachment, :with_json_file) }
        let(:ext) { 'json' }

        it 'sets the new attachment\'s aasm_state to :json' do
          expect(new_attachment.json?).to be true
        end
      end

      context 'with ext = csv' do
        let(:attachment) { create(:attachment, :with_csv_file) }
        let(:ext) { 'csv' }

        it 'sets the new attachment\'s aasm_state to :csv' do
          expect(new_attachment.csv?).to be true
        end
      end

      context 'with ext = nmrium' do
        let(:attachment) { create(:attachment, :with_nmrium_file) }
        let(:ext) { 'nmrium' }

        it 'sets the new attachment\'s aasm_state to :nmrium' do
          expect(new_attachment.nmrium?).to be true
        end
      end
    end
  end

  describe '#generate_img_att' do
    it 'calls #generate_att with ext = png and all other parameters verbatim' do
      expect(attachment).to receive(:generate_att).with('somethingThatGetsPassed', 'foo', false, 'png')

      attachment.generate_img_att('somethingThatGetsPassed', 'foo')
    end
  end

  describe '#generate_jcamp_att' do
    it 'calls #generate_att with ext = jdx and all other parameters verbatim' do
      expect(attachment).to receive(:generate_att).with('somethingThatGetsPassed', 'foo', false, 'jdx')

      attachment.generate_jcamp_att('somethingThatGetsPassed', 'foo')
    end
  end

  describe '#generate_json_att' do
    it 'calls #generate_att with ext = json and all other parameters verbatim' do
      expect(attachment).to receive(:generate_att).with('somethingThatGetsPassed', 'foo', false, 'json')

      attachment.generate_json_att('somethingThatGetsPassed', 'foo')
    end
  end

  describe '#generate_csv_att' do
    it 'calls #generate_att with ext = csv and all other parameters verbatim' do
      expect(attachment).to receive(:generate_att).with('somethingThatGetsPassed', 'foo', false, 'csv')

      attachment.generate_csv_att('somethingThatGetsPassed', 'foo')
    end
  end

  describe '#generate_nmrium_att' do
    it 'calls #generate_att with ext = nmrium and all other parameters verbatim' do
      expect(attachment).to receive(:generate_att).with('somethingThatGetsPassed', 'foo', false, 'nmrium')

      attachment.generate_nmrium_att('somethingThatGetsPassed', 'foo')
    end
  end

  describe '#build_params' do
    it 'returns a hash with :mass 0.0' do
      expect(attachment.build_params[:mass]).to eq 0.0
    end

    context 'when attachable\'s root element is a sample with a related molecule attached' do
      let(:attachment) do
        create(
          :attachment,
          attachable: build(
            :container,
            name: 'blakeks',
            container_type: 'foobar',
            containable: build(
              :valid_sample,
              molecule: build(
                :molecule,
                exact_molecular_weight: 6.66,
              ),
            ),
          ),
        )
      end

      it 'returns a hash with the exact molecular weight of the molecule' do
        expect(attachment.build_params[:mass]).to eq 6.66
      end
    end

    it 'returns a hash with :ext set to the file extension of the attachment\'s filename' do
      expect(attachment.build_params[:fname]).to eq 'upload.txt'
    end

    context 'with a hash of other params' do
      it 'returns an enriched hash with mass, ext and fname' do
        expected_result = {
          foo: :bar,
          mass: 0.0,
          ext: 'txt',
          fname: 'upload.txt',
        }

        expect(attachment.build_params({ foo: :bar })).to eq(expected_result)
      end
    end
  end

  describe '#get_infer_json_content' do
    context 'when there are no json attachments for this attachment\'s attachable' do
      it 'returns an empty json string' do
        expect(attachment.get_infer_json_content).to eq '{}'
      end
    end

    context 'when the attachable has json attachments with "infer" as extension part' do
      let(:json_attachment) do
        create(
          :attachment,
          :with_json_file,
          filename: 'foobar.infer.json',
          attachable: attachment.attachable,
        )
      end

      before { json_attachment.set_json! }

      it 'returns the content of the infer attachment' do
        expect(attachment.get_infer_json_content).to eq json_attachment.read_file
      end
    end
  end

  describe '#update_prediction' do
    context 'with spc_type = MS' do
      it 'returns the result of #auto_infer_n_clear_json' do
        expect(attachment).to receive(:auto_infer_n_clear_json).with('MS', false)

        attachment.update_prediction(params = { foo: :bar }, spc_type = 'MS', is_regen = false)
      end
    end

    context 'with keep_pred in params hash' do
      pending 'not yet implemented'
    end

    context 'without keep_pred in params hash' do
      it 'calls #write_infer_to_file with the value of params["predict"]' do
        expect(attachment).to receive(:write_infer_to_file).with('foobar')

        attachment.update_prediction(params = { 'predict' => 'foobar' }, spc_type = 'foo', is_regen = false)
      end
    end
  end

  describe '#create_process' do
    pending 'not yet implemented'
  end

  describe '#upload_file' do
    context 'when no file is attached' do
      let(:attachment) { create(:attachment, file_path: nil) }

      it 'no attachment_data should be present' do
        expect(attachment.attachment_data).to be_nil
      end
    end

    context 'when file is attached by filepath' do
      let(:attachment) { create(:attachment) }

      it 'attachment_data should be present' do
        expect(attachment.attachment_data).not_to be_nil
      end
    end
  end
end
