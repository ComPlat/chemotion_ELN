# frozen_string_literal: true

# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# State machine for attachment Jcamp handle
module AttachmentJcampAasm
  extend ActiveSupport::Concern

  included do # rubocop:disable BlockLength
    include AASM
    before_create :init_aasm
    before_update :require_peaks_generation?

    aasm do # rubocop:disable BlockLength
      state :idle, initial: true
      state :queueing, :regenerating, :done
      state :peaked, :edited, :backup, :image
      state :failure
      state :non_jcamp
      state :oo_editing

      event :oo_editing_start do
        transitions from: %i[oo_editing non_jcamp idle], to: :oo_editing
      end

      event :oo_editing_end do
        transitions from: :oo_editing, to: :non_jcamp
      end

      event :set_queueing do
        transitions from: %i[idle done backup failure non_jcamp queueing regenerating],
                    to: :queueing
      end

      event :set_regenerating do
        transitions from: %i[idle done backup failure non_jcamp queueing regenerating],
                    to: :regenerating
      end

      event :set_force_peaked do
        transitions from: %i[queueing regenerating], to: :peaked
      end

      event :set_edited do
        transitions from: %i[peaked queueing regenerating], to: :edited
      end

      event :set_backup do
        transitions from: %i[peaked edited failure], to: :backup
      end

      event :set_non_jcamp do
        transitions from: :idle, to: :non_jcamp
      end

      event :set_done do
        transitions from: %i[queueing regenerating], to: :done
      end

      event :set_image do
        transitions from: %i[idle peaked non_jcamp], to: :image
      end

      event :set_failure do
        transitions from: %i[idle queueing regenerating peaked edited failure], to: :failure
      end
    end
  end

  def filename_parts
    @filename_parts = filename.to_s.split('.')
  end

  def extension_parts
    parts = filename_parts
    @extension_parts = [parts[-2], parts[-1]]
  end

  def init_aasm
    return unless idle?
    _, extname = extension_parts
    %w[dx jdx jcamp].include?(extname.downcase) ? set_queueing : set_non_jcamp
  end

  def require_peaks_generation? # rubocop:disable all
    return unless belong_to_analysis?
    typname, extname = extension_parts
    return if peaked? || edited?
    return unless %w[dx jdx jcamp].include?(extname.downcase)
    is_peak_edit = %w[peak edit].include?(typname)
    return generate_img_only(typname) if is_peak_edit
    generate_spectrum(true, false, false, false) if queueing? && !new_upload
    generate_spectrum(true, true, false, false) if regenerating? && !new_upload
  end

  def belong_to_analysis?
    container &&
      container.parent &&
      container.parent.container_type == 'analysis'
  end
end

# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Process for attachment Jcamp handle
module AttachmentJcampProcess
  extend ActiveSupport::Concern

  def generate_att(meta_tmp, addon, toEdit = false, ext = nil) # rubocop:disable AbcSize
    meta_filename = Chemotion::Jcamp::Gen.filename(filename_parts, addon, ext)
    content_type = ext == 'png' ? 'image/png' : 'application/octet-stream'
    att = Attachment.new(
      filename: meta_filename,
      file_path: meta_tmp.path,
      created_by: created_by,
      created_for: created_for,
      content_type: content_type
    )
    att.save!
    att.set_edited if ext != 'png' && toEdit
    att.set_image if ext == 'png'
    att.update_container!(attachable_id)
    att.update!(storage: Rails.configuration.storage.primary_store)
    att
  end

  def generate_img_att(img_tmp, addon, toEdit = false)
    ext = 'png'
    generate_att(img_tmp, addon, toEdit, ext)
  end

  def generate_jcamp_att(jcamp_tmp, addon, toEdit = false)
    use_default_ext = nil
    generate_att(jcamp_tmp, addon, toEdit, use_default_ext)
  end

  def create_process(is_regen)
    tmp_jcamp, tmp_img = Chemotion::Jcamp::Create.spectrum(abs_path, is_regen)
    generate_jcamp_att(tmp_jcamp, 'peak')
    img_att = generate_img_att(tmp_img, 'peak')
    set_done
    delete_tmps([tmp_jcamp, tmp_img])
    delete_related_imgs(img_att)
    delete_edit_peak_after_done
  end

  def edit_process(is_regen, peaks, shift)
    tmp_jcamp, tmp_img = Chemotion::Jcamp::Create.spectrum(
      abs_path, is_regen, peaks, shift
    )
    generate_jcamp_att(tmp_jcamp, 'edit', true)
    img_att = generate_img_att(tmp_img, 'edit', true)
    set_backup
    delete_tmps([tmp_jcamp, tmp_img])
    delete_related_imgs(img_att)
    delete_edit_peak_after_done
  end

  def generate_spectrum(
    is_create = false, is_regen = false, peaks = false, shift = false
  )
    is_create ? create_process(is_regen) : edit_process(is_regen, peaks, shift)
  rescue
    set_failure
    Rails.logger.info('**** Jcamp Peaks Generation fails ***')
  end

  def delete_tmps(tmp_arr)
    tmp_arr.each do |tmp|
      tmp.close
      tmp.unlink
    end
  end

  def delete_edit_peak_after_done
    typname = extension_parts[0]
    delete if %w[edit peak].include?(typname)
  end

  def fname_wo_ext(target)
    parts = target.filename_parts
    ending = parts.length == 2 ? -2 : -3
    parts[0..ending].join('_')
  end

  def delete_related_imgs(img_att)
    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_delete = (
        att.image? &&
          att.id != img_att.id &&
          valid_name == fname_wo_ext(att)
      )
      att.delete if is_delete
    end
  end

  def generate_img_only(typname)
    _, tmp_img = Chemotion::Jcamp::CreateImg.spectrum_img_gene(abs_path)
    img_att = generate_img_att(tmp_img, typname)
    typname == 'edit' ? set_edited : set_force_peaked
    delete_related_imgs(img_att)
    delete_tmps([tmp_img])
  rescue
    set_failure
    Rails.logger.info('**** Jcamp Image Generation fails ***')
  end
end
