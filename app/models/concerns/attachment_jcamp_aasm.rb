# frozen_string_literal: true

# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# State machine for attachment Jcamp handle
module AttachmentJcampAasm
  FILE_EXT_SPECTRA = %w[dx jdx jcamp mzml raw]

  extend ActiveSupport::Concern

  included do
    include AASM
    before_create :init_aasm
    before_update :require_peaks_generation?

    aasm do
      state :idle, initial: true
      state :queueing, :regenerating, :done
      state :peaked, :edited, :backup, :image, :json
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

      event :set_json do
        transitions from: %i[idle peaked non_jcamp], to: :json
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
    %w[dx jdx jcamp mzml raw].include?(extname.downcase) ? set_queueing : set_non_jcamp
  end

  def require_peaks_generation? # rubocop:disable all
    return unless belong_to_analysis?
    typname, extname = extension_parts
    return if peaked? || edited?
    return unless %w[dx jdx jcamp mzml raw].include?(extname.downcase)
    is_peak_edit = %w[peak edit].include?(typname)
    return generate_img_only(typname) if is_peak_edit
    generate_spectrum(true, false) if queueing? && !new_upload
    generate_spectrum(true, true) if regenerating? && !new_upload
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
    return unless meta_tmp

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
    att.set_json if ext == 'json'
    att.update!(attachable_id: attachable_id, attachable_type: 'Container')
    att.update!(storage: Rails.configuration.storage.primary_store)
    att
  end

  def generate_img_att(img_tmp, addon, toEdit = false)
    ext = 'png'
    generate_att(img_tmp, addon, toEdit, ext)
  end

  def generate_jcamp_att(jcamp_tmp, addon, toEdit = false)
    generate_att(jcamp_tmp, addon, toEdit, 'jdx')
  end

  def generate_json_att(json_tmp, addon, toEdit = false)
    generate_att(json_tmp, addon, toEdit, 'json')
  end

  def build_params(params = {})
    _, extname = extension_parts
    params[:mass] = attachable.root_element.molecule.exact_molecular_weight || 0.0
    params[:ext] = extname.downcase
    params
  end

  def get_infer_json_content()
    atts = Attachment.where(attachable_id: attachable_id)

    infers = atts.map do |att|
      keyword, extname = att.extension_parts
      keep = att.json? && keyword == 'infer'
      keep ? att : nil
    end.select(&:present?)
    infers.length > 0 ? infers[0].read_file : '{}'
  end

  def update_prediction(params, spc_type, is_regen)
    return auto_infer_n_clear_json(spc_type, is_regen) if spc_type == 'MS'
    ori_infer = get_infer_json_content()
    decision = params[:keep_pred] ? ori_infer : params['predict']
    write_infer_to_file(decision)
  end

  def create_process(is_regen)
    params = build_params
    tmp_jcamp, tmp_img, spc_type = Chemotion::Jcamp::Create.spectrum(
      abs_path, is_regen, params
    )
    jcamp_att = generate_jcamp_att(tmp_jcamp, 'peak')
    jcamp_att.auto_infer_n_clear_json(spc_type, is_regen)
    img_att = generate_img_att(tmp_img, 'peak')
    set_done
    delete_tmps([tmp_jcamp, tmp_img])
    delete_related_imgs(img_att)
    delete_edit_peak_after_done
    jcamp_att
  end

  def edit_process(is_regen, orig_params)
    params = build_params(orig_params)
    tmp_jcamp, tmp_img, spc_type = Chemotion::Jcamp::Create.spectrum(
      abs_path, is_regen, params
    )
    jcamp_att = generate_jcamp_att(tmp_jcamp, 'edit', true)
    jcamp_att.update_prediction(params, spc_type, is_regen)
    img_att = generate_img_att(tmp_img, 'edit', true)
    set_backup
    delete_tmps([tmp_jcamp, tmp_img])
    delete_related_imgs(img_att)
    delete_edit_peak_after_done
    jcamp_att
  end

  def generate_spectrum(is_create = false, is_regen = false, params = {})
    is_create ? create_process(is_regen) : edit_process(is_regen, params)
  rescue StandardError => e
    set_failure
    Rails.logger.info('**** Jcamp Peaks Generation fails ***')
    Rails.logger.error(e)
  end

  def delete_tmps(tmp_arr)
    tmp_arr.each do |tmp|
      next unless tmp
      tmp.close
      tmp.unlink
    end
  end

  def delete_edit_peak_after_done
    typname = extension_parts[0]
    destroy if %w[edit peak].include?(typname)
  end

  def fname_wo_ext(target)
    parts = target.filename_parts
    ending = parts.length == 2 ? -2 : -3
    parts[0..ending].join('_')
  end

  def delete_related_imgs(img_att)
    return unless img_att

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
  rescue StandardError => e
    set_failure
    Rails.logger.info('**** Jcamp Image Generation fails ***')
    Rails.logger.error(e)
  end

  def infer_base_on_type(t_molfile, params)
    case params[:layout]
    when 'IR'
      spectrum = read_file
      Tempfile.create('spectrum') do |t_spectrum|
        t_spectrum.write(spectrum)
        t_spectrum.rewind
        Chemotion::Jcamp::Predict::Ir.exec(
          t_molfile, t_spectrum
        )
      end
    when 'MS'
      spectrum = read_file
      Tempfile.create('spectrum') do |t_spectrum|
        t_spectrum.write(spectrum)
        t_spectrum.rewind
        Chemotion::Jcamp::Predict::MS.exec(
          t_molfile, t_spectrum
        )
      end
    else
      Chemotion::Jcamp::Predict::NmrPeaksForm.exec(
        t_molfile, params[:layout], params[:peaks], params[:shift]
      )
    end
  end

  def infer_with_molfile(params)
    molfile = attachable.root_element.molecule.molfile
    Tempfile.create('molfile') do |t_molfile|
      t_molfile.write(molfile)
      t_molfile.rewind
      infer_base_on_type(t_molfile, params)
    end
  end

  def delete_related_jsons(target, is_reg = false)
    return unless target

    atts = Attachment.where(attachable_id: attachable_id)

    atts.each do |att|
      is_delete = (
        att.json? &&
          att.id != target.id &&
          (att.filename == target.filename || is_reg)
      )
      att.delete if is_delete
    end
  end

  def write_infer_to_file(content)
    Tempfile.create('json') do |t_json|
      t_json.write(content)
      t_json.rewind
      json_att = generate_json_att(t_json, 'infer')
      delete_related_jsons(json_att)
    end
  end

  def infer_spectrum(params)
    decision = infer_with_molfile(params)
    return until decision
    write_infer_to_file(decision.to_json)
    decision
  end

  def auto_infer_n_clear_json(spc_type, is_regen)
    case spc_type
    when 'INFRARED'
      infer_spectrum({ layout: 'IR' })
    when 'MS'
      infer_spectrum({ layout: 'MS' })
    else # NMR just clear when regenerating
      delete_related_jsons(self, is_regen) if is_regen
    end
  end
end
