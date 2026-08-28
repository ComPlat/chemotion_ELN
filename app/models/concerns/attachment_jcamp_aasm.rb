# frozen_string_literal: true

# Whole-file directives rather than per-method disable/enable pairs, deliberately: this repo's
# pinned rubocop (1.78.0, see Gemfile.lock) predates the disable-next directive (added in
# 1.90.0), so a newer rubocop run locally or in CI can flag narrow pairs with
# Style/DirectiveScope and suggest disable-next syntax that the pinned version can't parse -
# see this file's PR history for the version-mismatch discussion.
# rubocop:disable Metrics/AbcSize, Metrics/BlockLength, Metrics/CyclomaticComplexity
# rubocop:disable Metrics/MethodLength, Metrics/ModuleLength, Metrics/ParameterLists
# rubocop:disable Metrics/PerceivedComplexity, Naming/AccessorMethodName, Style/GuardClause
# rubocop:disable Style/IfInsideElse, Style/OptionalBooleanParameter
# rubocop:disable Style/ReturnNilInPredicateMethodDefinition
# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# State machine for attachment Jcamp handle
module AttachmentJcampAasm
  FILE_EXT_SPECTRA = %w[dx jdx jcamp mzml mzxml raw cdf zip gz tar nmrium].freeze
  LCMS_UVVIS_JDX_REGEX = /lcms.*[._]uvvis(\.(peak|edit))?\.jdx$/i.freeze

  # Set by generate_att right before it re-saves a reused row with fresh content pending
  # attachment (see require_peaks_generation? below) - not a stand-in for "file_path is
  # set", since file_path stays populated on the in-memory object long after its original
  # attach, independent of any later, unrelated save.
  attr_accessor :reattaching_derivative

  extend ActiveSupport::Concern

  included do
    before_create :init_aasm
    before_update :require_peaks_generation?

    # failure is included in every terminal event's from: list below (matching set_queueing/
    # set_regenerating/set_backup, which already treated it as recoverable): generate_att's
    # may_set_*? guards mean a row stuck in failure would otherwise silently stay there even
    # after a save that just replaced its content with fresh, correct data - state and content
    # would disagree, and the frontend filters failure out of the viewer, reproducing this
    # PR's own "edited spectrum disappeared" symptom via the recovery path instead of the
    # duplication path it was written to fix.
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
        transitions from: %i[idle queueing regenerating nmrium peaked failure], to: :peaked
      end

      event :set_edited do
        transitions from: %i[peaked queueing regenerating nmrium edited failure], to: :edited
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
        transitions from: %i[idle peaked non_jcamp image failure], to: :image
      end

      event :set_json do
        transitions from: %i[idle peaked non_jcamp json failure], to: :json
      end

      event :set_csv do
        transitions from: %i[idle peaked non_jcamp csv failure], to: :csv
      end

      event :set_nmrium do
        transitions from: %i[idle peaked edited non_jcamp queueing regenerating nmrium failure], to: :nmrium
      end

      event :set_failure do
        transitions from: %i[idle queueing regenerating failure nmrium], to: :failure
      end
    end
  end

  def filename_parts
    @filename_parts = filename.to_s.split('.')
  end

  def extension_parts
    parts = filename_parts
    @extension_parts = [parts[-2].to_s, parts[-1].to_s]
  end

  def init_aasm
    return if transferred?

    return unless idle?

    _, extname = extension_parts
    return set_non_jcamp unless FILE_EXT_SPECTRA.include?(extname.downcase)

    filename_lower = filename.to_s.downcase

    if lcms_uvvis_raw?(filename_lower)
      set_non_jcamp
    else
      set_queueing
    end
  end

  def require_peaks_generation?
    return if transferred?
    # generate_att reusing an existing row: the new blob only lands in after_save
    # :attach_file, which hasn't run yet, so any content-dependent processing here (e.g.
    # generate_img_only reading abs_path) would render from the stale, pre-save file.
    # generate_att drives its own state transition right after this save completes, so
    # there's nothing for this callback to do.
    return if reattaching_derivative
    return unless belong_to_analysis?

    filename_lower = filename.to_s.downcase
    return if lcms_uvvis_raw?(filename_lower)

    typname, extname = extension_parts
    # :backup and :done are terminal for this callback. Since #3494 a reused row can be
    # resolved in either state, and no AASM event fires for it in generate_att's dispatch
    # block, so the trailing save! re-enters here. A peak/edit row would then fall through
    # to generate_img_only, whose set_force_peaked is illegal from both states - and whose
    # rescue calls set_failure, which is *also* illegal from them. The rescue would raise,
    # aborting the save and rolling back the enclosing transaction. Return early instead.
    return if peaked? || edited? || backup? || done?
    return unless FILE_EXT_SPECTRA.include?(extname.downcase)

    is_peak_edit = %w[peak edit].include?(typname)
    return generate_img_only(typname) if is_peak_edit

    if queueing? && filename.to_s.downcase.match?(/lcms.*\.jdx$/i)
      is_uvvis_raw = lcms_uvvis_raw?(filename.to_s.downcase)
      return if is_uvvis_raw

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
      filename_lower.exclude?('peak') &&
      filename_lower.exclude?('edit')
  end
end

# - - - - - - - - - - - - - - - - - - - - - - - - - - - -
# Process for attachment Jcamp handle
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

  # edited/peaked AASM transitions apply only to JCamp outputs (ext nil legacy calls or jdx).
  def spectrum_jcamp_aasm_ext?(ext)
    ext.nil? || ext == 'jdx'
  end

  def jcamp_edit_addon?(addon, to_edit)
    to_edit || addon == 'edit' || (addon.is_a?(String) && addon.include?('edit'))
  end

  def jcamp_peak_addon?(addon)
    addon == 'peak' || (addon.is_a?(String) && addon.include?('peak'))
  end

  def generate_att(meta_tmp, addon, to_edit = false, ext = nil)
    return unless meta_tmp
    # generate_att only makes sense for dataset (Container) attachments; require_peaks_generation?
    # already guarantees this for the callback path (belong_to_analysis? is false otherwise), but
    # save_spectrum lets a caller pass an arbitrary attachment_id, so guard here too - otherwise
    # the dataset-wide lookup below could pair a foreign attachable_id with the literal 'Container'
    # and match a wholly unrelated Container's row. attachable_id.nil? is guarded separately:
    # where(attachable_id: nil, ...) is a real "IS NULL" match, not a no-op, so a nil id here
    # would let the lookup (and the write below) pair with - or create - an orphaned row sharing
    # that same nil id, the same confusable-pairing class of bug with a different trigger.
    return if attachable_id.nil? || attachable_type != 'Container'

    meta_filename = Chemotion::Jcamp::Gen.filename(filename_parts, addon, ext)
    # Look up the canonical row for this filename within self's own lineage (not just self's own
    # direct children): re-editing an already-edited file, or editing a curve whose dataset still
    # holds both a .peak. and .edit. lineage, must reuse that single row - scoping to
    # children_of(self) would miss it (self isn't its own child) and mint a duplicate .edit.jdx
    # attachment on every save. Narrowed to self's ancestry root so two independently uploaded
    # curves that happen to derive the same target filename (e.g. foo.dx and foo.jdx both ->
    # foo.peak.jdx) don't collapse onto each other.
    lineage_root = root_id || id
    # Descending so that, if a dataset still holds duplicate rows from before this fix,
    # the row picked matches the one handleLoadSpectra already showed the user (it sorts
    # descending by id too - SpectraStore.js) rather than an arbitrary/older duplicate.
    att = Attachment.where_container(attachable_id)
                    .where(filename: meta_filename)
                    .order(id: :desc)
                    .detect { |candidate| (candidate.root_id || candidate.id) == lineage_root }
    # Re-parent a reused row onto self: the lookup above is identity by (lineage, filename),
    # decoupled from ancestry, but children_of(self[:id]) below is still how a freshly-created
    # row gets parented - without this, a row reused from a different lineage member keeps
    # its stale parent, and ancestry-based cleanup (e.g. remove_generated_children in
    # attachment_api.rb) stops finding it on later regenerate_spectrum calls. Guarded against
    # the reverse direction: the lookup matches by (lineage, filename) alone, so when self is a
    # non-root member and the derived filename happens to collide with an ancestor's own (e.g.
    # an nmrium re-edit deriving the root's own '<base>.nmrium' filename), att can resolve to
    # that ancestor. Reparenting an ancestor onto its own descendant is a cycle - ancestry's
    # ancestry_exclude_self validation would reject the save - so skip it in that direction;
    # the two rows are already correctly related the other way.
    att.parent = self if att && att.id != id && !att.ancestor_of?(self)

    att ||= Attachment.children_of(self[:id]).new(
      filename: meta_filename,
      con_state: Labimotion::ConState::READ,
      created_by: created_by,
      created_for: created_for,
      key: SecureRandom.uuid,
    )
    att.attachable_id = attachable_id
    att.attachable_type = attachable_type
    att.file_path = meta_tmp.path
    # See require_peaks_generation? - only matters when att is a found, persisted row (an
    # update); harmless to set on a freshly-built one, which goes through before_create
    # :init_aasm instead.
    att.reattaching_derivative = true
    att.save!
    # after_save :attach_file just uploaded meta_tmp's content; file_path is a plain
    # attr_accessor that stays set on the object otherwise, so every subsequent save below
    # (each AASM set_* event call persists itself, plus the final save for att.thumb) would
    # re-run the full attach/create_derivatives/update_column pipeline and re-upload the
    # same blob - clear it so those saves are plain state/column updates instead.
    att.file_path = nil
    # Same reason, same scope: the flag guarded *this* save only. It is a plain
    # attr_accessor, so leaving it set would suppress require_peaks_generation? for every
    # later save on this object too - including the final save! below, which is exactly
    # where a freshly derived jcamp (a bagit curve, say) transitions out of :queueing and
    # asks for its peak table. Left set, such a curve keeps the content it was created
    # with, stays in :queueing, and is filtered out of the viewer entirely.
    att.reattaching_derivative = false

    if ext == 'png'
      att.set_image if att.may_set_image?
    elsif spectrum_jcamp_aasm_ext?(ext) && jcamp_edit_addon?(addon, to_edit)
      att.set_edited if att.may_set_edited?
    elsif spectrum_jcamp_aasm_ext?(ext) && jcamp_peak_addon?(addon)
      att.set_force_peaked if att.may_set_force_peaked?
    else
      filename_lower = att.filename.to_s.downcase
      if filename_lower.match?(/lcms.*[._]uvvis\.(peak|edit)\.jdx$/i) && filename_lower.include?('.edit.')
        att.set_edited if att.may_set_edited?
      elsif filename_lower.match?(/lcms.*[._]uvvis\.(peak|edit)\.jdx$/i)
        att.set_force_peaked if att.may_set_force_peaked?
      elsif filename_lower.match?(/lcms.*\.jdx$/i) || filename_lower.match?(/.*[._](tic|mz|uvvis).*\.jdx$/i)
        if lcms_uvvis_raw?(filename_lower)
          att.set_non_jcamp if att.may_set_non_jcamp?
        else
          att.set_force_peaked if att.may_set_force_peaked?
        end
      end
    end
    att.set_json  if ext == 'json' && att.may_set_json?
    att.set_csv   if ext == 'csv' && att.may_set_csv?
    att.set_nmrium if ext == 'nmrium' && att.may_set_nmrium?
    att.thumb = false if ext == 'json'
    att.save!
    att
  end

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

  def generate_csv_att(csv_tmp, addon, to_edit = false, params = {})
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
    re = attachable&.root_element
    if re.is_a?(Sample)
      mol_w = re.molecule&.exact_molecular_weight
      params[:mass] = mol_w || 0.0
      params[:sample_id] = re.id
      attachable.ancestors.each { |a| params[:analysis_id] = a.id if a.container_type == 'analysis' }
    end

    params[:ext] = extname.downcase
    params[:fname] = filename.to_s

    params
  end

  # TODO: Fix bugs and improve code
  def get_infer_json_content
    atts = Attachment.where(attachable_id: attachable_id)

    infers = atts.map do |att|
      keyword, _extname = att.extension_parts
      keep = att.json? && keyword == 'infer'
      keep ? att : nil
    end.compact_blank
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

    return generate_spectrum_from_nmrium if params[:ext] == 'nmrium'

    spectrum_data = generate_spectrum_data(params, is_regen)
    tmp_jcamp, tmp_img, arr_jcamp, arr_img, arr_csv, _arr_nmrium, spc_type, invalid_molfile = spectrum_data

    check_invalid_molfile(invalid_molfile)

    # spc_type is the archive's specific spectrum type (e.g. "CYCLIC VOLTAMMETRY")
    # whenever every curve shares one, only falling back to "bagit" for mixed
    # archives - so `== 'bagit'` alone missed same-type multi-curve archives
    # (CV, multi-run NMR). Those need read_bagit_data's "N_bagit" filenames,
    # which ContainerDatasetModalContent#classifyAttachments groups into one
    # series; otherwise they land as ungrouped standalone attachments. A bagit
    # archive can itself hold just one curve, so keep routing spc_type ==
    # 'bagit' there regardless of arr_jcamp.length.
    if spc_type == 'lcms'
      read_processed_data(arr_jcamp, arr_img, spc_type, is_regen)
    elsif spc_type == 'bagit' || arr_jcamp.length > 1
      read_bagit_data(arr_jcamp, arr_img, arr_csv, spc_type, is_regen, params)
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
    data = generate_spectrum_data(params, is_regen)
    tmp_jcamp, tmp_img, arr_jcamp, _arr_img, arr_csv, arr_nmrium, spc_type, invalid_molfile = data

    check_invalid_molfile(invalid_molfile)

    tmp_jcamp ||= arr_jcamp&.first
    jcamp_att = generate_jcamp_att(tmp_jcamp, 'edit', true)
    new_jcamp_created = !jcamp_att.nil?
    jcamp_att&.update_prediction(params, spc_type, is_regen)
    img_att = generate_img_att(tmp_img, 'edit', true) if tmp_img

    tmp_files_to_be_deleted = [tmp_jcamp, tmp_img]

    if arr_csv.present?
      curr_tmp_csv = arr_csv[0]
      csv_att = generate_csv_att(curr_tmp_csv, 'edit', false, params)
      tmp_files_to_be_deleted.push(*arr_csv)
      delete_related_csv(csv_att)
    end

    # set_backup
    if arr_nmrium.present?
      curr_tmp_nmrium = arr_nmrium[0]
      nmrium_att = generate_nmrium_att(curr_tmp_nmrium, '', false)
      tmp_files_to_be_deleted.push(*arr_nmrium)
      delete_related_nmrium(nmrium_att)
    end

    # Skip when jcamp_att is this same row (self re-edited in place, reused by generate_att's
    # lineage lookup): self and jcamp_att are two AR instances of one record, and jcamp_att's
    # own save already persisted it as :edited. AASM's non-bang event is persist: false, so
    # marking self :backup here is inert today (nothing saves self afterwards) - but it would
    # leave self's in-memory state wrongly claiming :backup, ready to overwrite the correct
    # :edited state on any future self.save/touch/autosave, which extractJcampFiles.js filters
    # out of the viewer: the exact "spectrum disappeared" symptom this PR set out to fix.
    set_backup unless jcamp_att&.id == id
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
    return if params[:ext] == 'nmrium'

    Tempfile.create('molfile') do |t_molfile|
      if attachable&.root_element.is_a?(Sample)
        t_molfile.write(attachable.root_element.molecule.molfile)
        t_molfile.rewind
      end
      lcms_mz = params[:lcms_mz_page_data].present? || params['lcms_mz_page_data'].present?
      related_paths = lcms_related_file_paths
      file_paths = if !lcms_mz && related_paths.present?
                     related_paths
                   else
                     abs_path
                   end
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
    nil
  end

  def file_match(attachments, num)
    attachments.select do |att|
      if num
        att.filename == filename || ["#{filename[0..-2]}#{num}_bagit.peak.jdx",
                                     "#{filename[0..-2]}#{num}_bagit.edit.jdx"].include?(att.filename)
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
      addon = stem.sub(/^#{base}_/, '')

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
      if curr_tmp_csv
        generate_csv_att(curr_tmp_csv, "#{idx + 1}_bagit", false, params)
        tmp_to_be_deleted.push(curr_tmp_csv)
      end
      jcamp_att = curr_jcamp_att if idx.zero?
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
      att.delete if related_edit_peak_to_delete?(att, attachment, valid_name)
    end
  end

  def related_edit_peak_to_delete?(att, keep_attachment, valid_name)
    return false unless att.edited? || att.peaked? || att.image?
    return false if att.id == keep_attachment.id

    edit_jdx = File.basename(att.filename, '.edit.jdx')
    peak_jdx = File.basename(att.filename, '.peak.jdx')
    edit_img = File.basename(att.filename, '.edit.png')
    peak_img = File.basename(att.filename, '.peak.png')
    [edit_jdx, peak_jdx, edit_img, peak_img].include?(valid_name)
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

    # Restricted to self's own lineage (see generate_att) - matching by filename stem alone,
    # across the whole dataset, would also catch an independently-uploaded curve that happens
    # to derive the same target name, deleting it as collateral of an unrelated edit.
    lineage_root = root_id || id
    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_peak_file = att.filename_parts.include?('peak')
      should_del = (att.edited? || att.peaked? || is_peak_file) &&
                   att.id != jcamp_att.id &&
                   valid_name == fname_wo_ext(att) &&
                   (att.root_id || att.id) == lineage_root
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

    lineage_root = root_id || id
    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_delete = att.image? &&
                  att.id != img_att.id &&
                  valid_name == fname_wo_ext(att) &&
                  (att.root_id || att.id) == lineage_root
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
        att.delete if related_arr_img_to_delete?(att, img_att, valid_name)
      end
    end
  end

  def related_arr_img_to_delete?(att, keep_img_att, valid_name)
    att.image? &&
      att.id != keep_img_att.id &&
      valid_name == fname_wo_ext(att)
  end

  def delete_related_csv(csv_att)
    return unless csv_att

    lineage_root = root_id || id
    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_delete = att.csv? &&
                  att.id != csv_att.id &&
                  valid_name == fname_wo_ext(att) &&
                  (att.root_id || att.id) == lineage_root
      att.delete if is_delete
    end
  end

  def delete_related_nmrium(nmrium_att)
    return unless nmrium_att

    lineage_root = root_id || id
    atts = Attachment.where(attachable_id: attachable_id)
    valid_name = filename_parts[0]
    atts.each do |att|
      is_delete = att.nmrium? &&
                  att.id != nmrium_att.id &&
                  (valid_name == fname_wo_ext(att) || fname_wo_ext(self) == fname_wo_ext(att)) &&
                  (att.root_id || att.id) == lineage_root
      att.delete if is_delete
    end
  end

  def delete_related_edited_jcamp(jcamp_att)
    return unless jcamp_att

    atts = Attachment.where(attachable_id: jcamp_att.attachable_id)
    valid_name = fname_wo_ext(self)
    atts.each do |att|
      is_delete = att.edited? &&
                  att.id != jcamp_att.id &&
                  valid_name == att.filename_parts[0]
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
      is_delete = att.json? &&
                  att.id != target.id &&
                  (att.filename == target.filename || is_reg)
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
    return unless decision

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
# rubocop:enable Metrics/AbcSize, Metrics/BlockLength, Metrics/CyclomaticComplexity
# rubocop:enable Metrics/MethodLength, Metrics/ModuleLength, Metrics/ParameterLists
# rubocop:enable Metrics/PerceivedComplexity, Naming/AccessorMethodName, Style/GuardClause
# rubocop:enable Style/IfInsideElse, Style/OptionalBooleanParameter
# rubocop:enable Style/ReturnNilInPredicateMethodDefinition
