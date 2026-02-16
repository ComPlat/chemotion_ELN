# frozen_string_literal: true

# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# State machine for attachment Jcamp handle
module AttachmentJcampAasm
  FILE_EXT_SPECTRA = %w[dx jdx jcamp mzml mzxml raw cdf zip gz tar nmrium].freeze
  LCMS_UVVIS_JDX_REGEX = /lcms.*[._]uvvis(\.(peak|edit))?\.jdx$/i.freeze

  extend ActiveSupport::Concern

  # rubocop:disable Metrics/BlockLength
  included do
    before_create :init_aasm
    before_update :require_peaks_generation?

    aasm do
      state :idle, initial: true
      state :queueing, :regenerating, :done
      state :peaked, :edited, :backup, :image, :json, :csv, :nmrium
      state :failure
      state :non_jcamp

      event :set_queueing do
        transitions from: %i[idle done backup failure non_jcamp queueing regenerating nmrium],
                    to: :queueing
      end

      event :set_regenerating do
        transitions from: %i[idle done backup failure non_jcamp queueing regenerating nmrium],
                    to: :regenerating
      end

      event :set_force_peaked do
        transitions from: %i[idle queueing regenerating nmrium], to: :peaked
      end

      event :set_edited do
        transitions from: %i[peaked queueing regenerating nmrium], to: :edited
      end

      event :set_backup do
        transitions from: %i[peaked edited failure nmrium], to: :backup
      end

      event :set_non_jcamp do
        transitions from: :idle, to: :non_jcamp
      end

      event :set_done do
        transitions from: %i[queueing regenerating nmrium], to: :done
      end

      event :set_image do
        transitions from: %i[idle peaked non_jcamp image], to: :image
      end

      event :set_json do
        transitions from: %i[idle peaked non_jcamp json], to: :json
      end

      event :set_csv do
        transitions from: %i[idle peaked non_jcamp], to: :csv
      end

      event :set_nmrium do
        transitions from: %i[idle peaked edited non_jcamp queueing regenerating], to: :nmrium
      end

      event :set_failure do
        transitions from: %i[idle queueing regenerating failure nmrium], to: :failure
      end
    end
  end
  # rubocop:enable Metrics/BlockLength

  def filename_parts
    @filename_parts = filename.to_s.split('.')
  end

  def extension_parts
    parts = filename_parts
    @extension_parts = [parts[-2], parts[-1]]
  end

  def init_aasm
    return if transferred?

    return unless idle?

    _, extname = extension_parts
    unless FILE_EXT_SPECTRA.include?(extname.downcase)
      return set_non_jcamp
    end

    filename_lower = filename.to_s.downcase

    if lcms_uvvis_raw?(filename_lower)
      set_non_jcamp
    else
      set_queueing
    end
  end

  def require_peaks_generation? # rubocop:disable all
    return if transferred?

    return unless belong_to_analysis?

    filename_lower = filename.to_s.downcase
    if lcms_uvvis_raw?(filename_lower)
      return
    end

    typname, extname = extension_parts
    return if peaked? || edited?

    return unless FILE_EXT_SPECTRA.include?(extname.downcase)

    is_peak_edit = %w[peak edit].include?(typname)
    return generate_img_only(typname) if is_peak_edit

    if queueing? && filename.to_s.downcase.match?(/lcms.*\.jdx$/i)
      filename_lower = filename.to_s.downcase

      is_uvvis_raw = lcms_uvvis_raw?(filename_lower)

      if is_uvvis_raw
        return
      end
      
      set_force_peaked
      return
    end

    generate_spectrum(true, false) if queueing?
    generate_spectrum(true, true) if regenerating?
  end

  def belong_to_analysis?
    container&.parent&.container_type == 'analysis'
  end

  def lcms_uvvis_raw?(filename_lower)
    filename_lower.match?(LCMS_UVVIS_JDX_REGEX) &&
      !filename_lower.include?('peak') &&
      !filename_lower.include?('edit')
  end
end

# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Process for attachment Jcamp handle
# rubocop:disable Metrics/ModuleLength
module AttachmentJcampProcess
  extend ActiveSupport::Concern

  def jcamp_files_already_present?
    _first_part, extname = extension_parts
    return true  if filename.include?('processed_')
    return false if extname.casecmp('nmrium').zero?

    attachments = Attachment.where(attachable_id: self[:attachable_id])
    num = filename.match(/\.(\d+)_/)&.[](1)&.to_i
    jcamp_attachments = file_match(attachments, num)
    jcamp_attachments.any?
  end

  # rubocop:disable Metrics/AbcSize
  # rubocop:disable Metrics/CyclomaticComplexity
  # rubocop:disable Metrics/PerceivedComplexity
  def generate_att(meta_tmp, addon, to_edit = false, ext = nil)
    return unless meta_tmp

    meta_filename = Chemotion::Jcamp::Gen.filename(filename_parts, addon, ext)
    att = Attachment.children_of(self[:id]).find_by(filename: meta_filename)

    att ||= Attachment.children_of(self[:id]).new(
      filename:   meta_filename,
      con_state:  Labimotion::ConState::READ,
      file_path:  meta_tmp.path,
      created_by: created_by,
      created_for: created_for,
      key:        SecureRandom.uuid,
    )
    att.save!
  
    if ext != 'png'
      if to_edit
        att.set_edited
      elsif addon == 'peak' || (addon.is_a?(String) && addon.include?('peak'))
        att.set_force_peaked
      elsif addon == 'edit' || (addon.is_a?(String) && addon.include?('edit'))
        att.set_edited
      else
        filename_lower = att.filename.to_s.downcase
        
        if filename_lower.match?(/lcms.*[._]uvvis\.(peak|edit)\.jdx$/i)
          if filename_lower.include?('.edit.')
            att.set_edited if att.may_set_edited?
          else
            att.set_force_peaked if att.may_set_force_peaked?
          end
        elsif filename_lower.match?(/lcms.*\.jdx$/i) || filename_lower.match?(/.*[._](tic|mz|uvvis).*\.jdx$/i)
          if lcms_uvvis_raw?(filename_lower)
            att.set_non_jcamp if att.may_set_non_jcamp?
          else
            att.set_force_peaked if att.may_set_force_peaked?
          end
        end
      end
    else
      att.set_image
    end
    att.set_json  if ext == 'json'
    att.set_csv   if ext == 'csv'
    att.set_nmrium if ext == 'nmrium'
    att.thumb = false if ext == 'json'
  
    att.update!(attachable_id: attachable_id, attachable_type: 'Container')
    att
  end
  # rubocop:enable Metrics/AbcSize
  # rubocop:enable Metrics/CyclomaticComplexity
  # rubocop:enable Metrics/PerceivedComplexity

  def generate_img_att(img_tmp, addon, to_edit = false)
    ext = 'png'
    generate_att(img_tmp, addon, to_edit, ext)
  end

  def generate_jcamp_att(jcamp_tmp, addon, to_edit = false)
    generate_att(jcamp_tmp, addon, to_edit, 'jdx')
  end

  def generate_json_att(json_tmp, addon, to_edit = false)
    generate_att(json_tmp, addon, to_edit, 'json')
  end

  def generate_csv_att(csv_tmp, addon, to_edit = false, params={})
    csv_reader = CSV.new(csv_tmp)
    csv_data = csv_reader.read
    sample_id_field = csv_data[2]
    sample_id_field[1] = params[:sample_id]
    analysis_id_field = csv_data[3]
    analysis_id_field[1] = params[:analysis_id]
    dataset_id_field = csv_data[4]
    dataset_id_field[1] = params[:dataset_id]
    dataset_name_field = csv_data[5]
    dataset_name_field[1] = params[:dataset_name]

    csv_data[2] = sample_id_field
    csv_data[3] = analysis_id_field
    csv_data[4] = dataset_id_field
    csv_data[5] = dataset_name_field
    Tempfile.create(['jcamp', '.csv']) do |new_csv_tmp|
      CSV.open(new_csv_tmp, 'wb') do |csv|
        csv_data.each do |row|
          csv << row
        end
      end
      new_csv_tmp.rewind
      generate_att(new_csv_tmp, addon, to_edit, 'csv')
    end
  end

  def generate_nmrium_att(nmrium_tmp, addon, to_edit = false)
    generate_att(nmrium_tmp, addon, to_edit, 'nmrium')
  end

  # app/models/concerns/attachment_jcamp_process.rb
  def build_params(params = {})
    _, extname = extension_parts
    params[:mass] = 0.0
    params[:dataset_id] = attachable.id
    params[:dataset_name] = attachable.name
    if attachable&.root_element.is_a?(Sample)
      params[:mass] = attachable&.root_element&.molecule&.exact_molecular_weight || 0.0
      params[:sample_id] = attachable&.root_element.id
      attachable.ancestors.each { |a| params[:analysis_id] = a.id if a.container_type == 'analysis' }
    end

    params[:ext]  = extname.downcase
    params[:fname] = filename.to_s

    params
  end

  # TODO: Fix bugs and improve code
  def get_infer_json_content
    atts = Attachment.where(attachable_id: attachable_id) # might break on multiple Attachments with the same ID but different types

    # shorten this whole block to a single find with '{}' fallback if none is found
    infers = atts.map do |att|
      keyword, _extname = att.extension_parts
      keep = att.json? && keyword == 'infer'
      keep ? att : nil
    end.select(&:present?)
    content = infers.empty? ? '{}' : infers[0].read_file
    content.presence || '{}'
  end

  def update_prediction(params, spc_type, is_regen)
    return auto_infer_n_clear_json(spc_type, is_regen) if ['MS', 'CYCLIC VOLTAMMETRY'].include?(spc_type)

    ori_infer = get_infer_json_content
    decision = params[:keep_pred] ? ori_infer : params['predict']
    write_infer_to_file(decision)
  end

  def create_process(is_regen)
    params = build_params

    if params[:ext] == 'nmrium'
      return generate_spectrum_from_nmrium
    end

    tmp_jcamp, tmp_img, arr_jcamp, arr_img, arr_csv, arr_nmrium, spc_type, invalid_molfile = generate_spectrum_data(params, is_regen)

    check_invalid_molfile(invalid_molfile)

    if spc_type == 'bagit'
      read_bagit_data(arr_jcamp, arr_img, arr_csv, spc_type, is_regen, params)
    elsif arr_jcamp.length > 1
      read_processed_data(arr_jcamp, arr_img, spc_type, is_regen)
    else
      img_att = generate_img_att(tmp_img, 'peak')
      jcamp_att = generate_jcamp_att(tmp_jcamp, 'peak')
      jcamp_att.auto_infer_n_clear_json(spc_type, is_regen)

      tmp_files_to_be_deleted = [tmp_jcamp, tmp_img]
      tmp_files_to_be_deleted.push(*arr_img)

      set_done
      delete_tmps(tmp_files_to_be_deleted)
      delete_related_imgs(img_att)
      delete_edit_peak_after_done

      jcamp_att
    end
  end

  def edit_process(is_regen, orig_params)
    params = build_params(orig_params)
    tmp_jcamp, tmp_img, arr_jcamp, _arr_img, arr_csv, arr_nmrium, spc_type, invalid_molfile = generate_spectrum_data(params, is_regen)

    check_invalid_molfile(invalid_molfile)

    tmp_jcamp ||= arr_jcamp&.first
    jcamp_att = generate_jcamp_att(tmp_jcamp, 'edit', true)
    new_jcamp_created = !jcamp_att.nil?
    jcamp_att.update_prediction(params, spc_type, is_regen) if jcamp_att
    img_att = generate_img_att(tmp_img, 'edit', true) if tmp_img

    tmp_files_to_be_deleted = [tmp_jcamp, tmp_img]

    unless arr_csv.nil? || arr_csv.length == 0
      curr_tmp_csv = arr_csv[0]
      csv_att = generate_csv_att(curr_tmp_csv, 'edit', false, params)
      tmp_files_to_be_deleted.push(*arr_csv)
      delete_related_csv(csv_att)
    end

    # set_backup
    unless arr_nmrium.nil? || arr_nmrium.length == 0
      curr_tmp_nmrium = arr_nmrium[0]
      nmrium_att = generate_nmrium_att(curr_tmp_nmrium, '', false)
      tmp_files_to_be_deleted.push(*arr_nmrium)
      delete_related_nmrium(nmrium_att)
    end

    set_backup
    delete_tmps(tmp_files_to_be_deleted)
    delete_related_imgs(img_att) if img_att
    delete_related_edit_peak(jcamp_att) if new_jcamp_created
    jcamp_att || self
  end

  def check_invalid_molfile(invalid_molfile = false)
    if invalid_molfile == true
      # add message when invalid molfile
      Message.create_msg_notification(
        channel_subject: Channel::CHEM_SPECTRA_NOTIFICATION,
        message_from: attachable.root_element.created_by,
        data_args: { msg: 'Invalid molfile' },
      )
    end
  end

  def generate_spectrum_data(params, is_regen)
    if params[:ext] == 'nmrium'
      return
    end

    tmp_jcamp, tmp_img, arr_jcamp, arr_img, arr_csv, arr_nmrium, spc_type, invalid_molfile = Tempfile.create('molfile') do |t_molfile|
      if attachable&.root_element.is_a?(Sample)
        t_molfile.write(attachable.root_element.molecule.molfile)
        t_molfile.rewind
      end
      file_paths = lcms_related_file_paths || abs_path
      Chemotion::Jcamp::Create.spectrum(
        file_paths, t_molfile.path, is_regen, params
      )
    end
  end

  def lcms_related_file_paths
    filename_lower = filename.to_s.downcase
    return nil unless filename_lower.match?(/\.(jdx|dx|jcamp)\z/)
    return nil unless filename_lower.match?(/(?:^|[._-])uvvis(?:[._-]|$)/)

    base_scope = Attachment.where(attachable_id: attachable_id)
    if respond_to?(:attachable_type) && attachable_type.present?
      base_scope = base_scope.where(attachable_type: attachable_type)
    end
    sibs = base_scope.where.not(id: id)

    tics = sibs.select do |a|
      name = a.filename.to_s.downcase
      name.match?(/\.(jdx|dx|jcamp)\z/) && name.match?(/(?:^|[._-])tic(?:[._-]|$)/)
    end

    mzs = sibs.select do |a|
      name = a.filename.to_s.downcase
      name.match?(/\.(jdx|dx|jcamp)\z/) && name.match?(/(?:^|[._-])(mz|ms)(?:[._-]|$)/)
    end

    return nil if tics.empty? || mzs.empty?

    file_paths = ([abs_path] + tics.map(&:abs_path) + mzs.map(&:abs_path)).compact.uniq
    return nil if file_paths.size < 3

    file_paths
  end

  def generate_spectrum(is_create = false, is_regen = false, params = {})
    return if is_create && !is_regen && jcamp_files_already_present?

    is_create ? create_process(is_regen) : edit_process(is_regen, params)
  rescue StandardError => e
    set_failure if may_set_failure?
    Rails.logger.info('**** Jcamp Peaks Generation fails ***')
    Rails.logger.error(e)
  end

  def file_match(attachments, num)
    attachments.select do |att|
      if num
        att.filename == filename || att.filename == "#{filename[0..-2]}#{num}_bagit.peak.jdx" ||
          att.filename == "#{filename[0..-2]}#{num}_bagit.edit.jdx"
      else
        att.extension_parts[-1] == 'jdx' || att.extension_parts[0] == 'peak' ||
          att.extension_parts[0] == 'edit'
      end
    end
  end

  def read_processed_data(arr_jcamp, arr_img, spc_type, is_regen)
    jcamp_att = nil
    tmp_to_be_deleted = []
    tmp_img_to_deleted = []
  
    base = filename_parts.first

    arr_jcamp.each_with_index do |jcamp, idx|
      stem = original_stem(jcamp, base) || "#{base}_processed_#{idx}"
      addon  = stem.sub(/^#{base}_/, '')
  
      curr_jcamp_att = generate_jcamp_att(jcamp, addon)
      curr_jcamp_att.update!(filename: "#{stem}.jdx")
      curr_jcamp_att.auto_infer_n_clear_json(spc_type, is_regen)
      jcamp_att ||= curr_jcamp_att
  
      curr_tmp_img = arr_img[idx]
      if curr_tmp_img
        img_stem = original_stem(curr_tmp_img, base) || stem
        img_att = generate_img_att(curr_tmp_img, addon)
        img_att.update!(filename: "#{img_stem}.png")
        tmp_img_to_deleted << img_att
        tmp_to_be_deleted << curr_tmp_img
      end
  
      tmp_to_be_deleted << jcamp
    end
    set_done
    delete_tmps(tmp_to_be_deleted)
    delete_related_arr_img(tmp_img_to_deleted)
    delete_edit_peak_after_done
    jcamp_att
  end

  def original_stem(tmp_file, base_prefix)
    return unless tmp_file.respond_to?(:original_filename)

    original = tmp_file.original_filename.to_s
    return if original.strip.empty?

    original_name = File.basename(original)
    ext = File.extname(original_name)
    stem = File.basename(original_name, ext)

    if base_prefix.present? && !stem.start_with?(base_prefix)
      suffix = stem[/_(?:lcms_)?(?:uvvis|tic|mz).*/i]
      return "#{base_prefix}#{suffix}" if suffix.present?
    end

    stem
  end

  def read_bagit_data(arr_jcamp, arr_img, arr_csv, spc_type, is_regen, params)
    jcamp_att = nil
    tmp_to_be_deleted = []
    tmp_img_to_deleted = []
    arr_jcamp.each_with_index do |jcamp, idx|
      curr_jcamp_att = generate_jcamp_att(jcamp, "#{idx + 1}_bagit")
      curr_jcamp_att.auto_infer_n_clear_json(spc_type, is_regen)
      curr_tmp_img = arr_img[idx]
      img_att = generate_img_att(curr_tmp_img, "#{idx + 1}_bagit")
      tmp_to_be_deleted.push(jcamp, curr_tmp_img)
      tmp_img_to_deleted.push(img_att)

      curr_tmp_csv = arr_csv[idx]
      if !curr_tmp_csv.nil?
        generate_csv_att(curr_tmp_csv, "#{idx + 1}_bagit", false, params)
        tmp_to_be_deleted.push(curr_tmp_csv)
      end
      jcamp_att = curr_jcamp_att if idx == 0
    end

    if arr_img.count > arr_jcamp.count
      curr_tmp_img = arr_img.last
      img_att = generate_img_att(curr_tmp_img, 'combined')
      tmp_to_be_deleted.push(curr_tmp_img)
      tmp_img_to_deleted.push(img_att)
    end

    delete_tmps(tmp_to_be_deleted)
    delete_related_arr_img(tmp_img_to_deleted)
    delete_edit_peak_after_done
    jcamp_att
  end

  def generate_spectrum_from_nmrium
    tmp_jcamp = Chemotion::Jcamp::CreateFromNMRium.jcamp_from_nmrium(abs_path)
    jcamp_att = generate_jcamp_att(tmp_jcamp, 'edit', true)

    set_nmrium

    tmp_files_to_be_deleted = [tmp_jcamp]
    delete_tmps(tmp_files_to_be_deleted)
    delete_related_edited_jcamp(jcamp_att)
    delete_related_edit_peak_with_att(jcamp_att)
    delete_related_nmrium(self)
    jcamp_att
  rescue StandardError => e
    set_failure
    Rails.logger.info('**** Jcamp Edit from NMRium Generation fails ***')
    Rails.logger.error(e)
  end

  def delete_related_edit_peak_with_att(attachment)
    return unless attachment

    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      edit_jdx_name = File.basename(att.filename, '.edit.jdx')
      peak_jdx_name = File.basename(att.filename, '.peak.jdx')
      edit_image_name = File.basename(att.filename, '.edit.png')
      peak_image_name = File.basename(att.filename, '.peak.png')
      array_valid_names = [edit_jdx_name, peak_jdx_name, edit_image_name, peak_image_name]

      is_delete = (
        (att.edited? || att.peaked? || att.image?) &&
          att.id != attachment.id &&
          (array_valid_names.include? valid_name)
      )
      att.delete if is_delete
    end
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

  def delete_related_edit_peak(jcamp_att)
    return unless jcamp_att

    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_peak_file = att.filename_parts.include?('peak')
      should_del   = (
        (att.edited? || att.peaked? || is_peak_file) &&
        att.id != jcamp_att.id &&
        valid_name == fname_wo_ext(att)
      )
      att.delete if should_del
    end
  end

  def fname_wo_ext(target)
    parts = target.filename_parts
    if parts.length >= 2
      parts[0..-2].join('.')
    else
      parts[0]
    end
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

  def delete_related_arr_img(arr_img)
    return unless arr_img

    arr_img.each do |img_att|
      next unless img_att

      atts = Attachment.where(attachable_id: attachable_id)
      valid_name = fname_wo_ext(img_att)
      atts.each do |att|
        is_delete = (
          att.image? &&
            att.id != img_att.id &&
            valid_name == fname_wo_ext(att)
        )
        att.delete if is_delete
      end
    end
  end

  def delete_related_csv(csv_att)
    return unless csv_att

    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_delete = (
        att.csv? &&
          att.id != csv_att.id &&
          valid_name == fname_wo_ext(att)
      )
      att.delete if is_delete
    end
  end

  def delete_related_nmrium(nmrium_att)
    return unless nmrium_att

    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = filename_parts[0]
    atts.each do |att|
      is_delete = att.nmrium? &&
                  att.id != nmrium_att.id &&
                  (valid_name == fname_wo_ext(att) || fname_wo_ext(self) == fname_wo_ext(att))
      att.delete if is_delete
    end
  end

  def delete_related_edited_jcamp(jcamp_att)
    return unless jcamp_att

    atts = Attachment.where(attachable_id: jcamp_att.attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_delete = (
        att.edited? &&
          att.id != jcamp_att.id &&
          valid_name == att.filename_parts[0]
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
    spectrum = read_file
    with_temp_spectrum(spectrum) do |t_spectrum|
      case params[:layout]
      when 'IR'
        Chemotion::Jcamp::Predict::Ir.exec(t_molfile, t_spectrum)
      when 'MS'
        Chemotion::Jcamp::Predict::MS.exec(t_molfile, t_spectrum)
      else
        Chemotion::Jcamp::Predict::NmrPeaksForm.exec(
          t_molfile,
          params[:layout],
          params[:peaks] || '[]',
          params[:shift] || '{}',
          t_spectrum,
        )
      end
    end
  end

  def with_temp_spectrum(spectrum)
    Tempfile.create('spectrum') do |t_spectrum|
      t_spectrum.binmode
      t_spectrum.write(spectrum)
      t_spectrum.rewind
      yield t_spectrum
    end
  end

  def infer_with_molfile(params)
    molfile = attachable.root_element.molfile || attachable.root_element.molecule.molfile
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
    # when '13C'
    #   infer_spectrum({ layout: '13C' })
    when 'INFRARED'
      infer_spectrum({ layout: 'IR' })
    when 'MS'
      infer_spectrum({ layout: 'MS' })
    else # NMR just clear when regenerating
      delete_related_jsons(self, is_regen) if is_regen
    end
  end
end
# rubocop:enable Metrics/ModuleLength
