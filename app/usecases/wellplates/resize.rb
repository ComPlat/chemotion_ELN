# frozen_string_literal: true

module Usecases
  module Wellplates
    # Changes a wellplate's grid dimensions and reconciles its {Well} rows.
    #
    # Growing is always allowed. Shrinking is refused when it would drop a well
    # that still holds data ({Well#content?}) — the caller is expected to clear
    # those wells and persist that first, making "empty the wells" and "resize"
    # two separate operations. That separation is what makes the invariant
    # checkable at all: a single request can change the grid or the wells, never
    # both.
    #
    # This is the only write path for +width+/+height+ on a persisted wellplate;
    # +PUT /api/v1/wellplates/:id+ deliberately does not accept them.
    class Resize
      # Number of blocking well positions named in the error message before it
      # is elided; the full count is always reported.
      POSITIONS_IN_ERROR = 5

      # Rows per INSERT when materialising the grid. A 100x100 plate is 10_000
      # wells; one statement per well would put 10_000 round trips (each firing
      # the logidze trigger) inside a single request.
      INSERT_BATCH_SIZE = 1_000

      attr_reader :wellplate, :width, :height

      # @param wellplate [Wellplate]
      # @param width [Integer] requested number of columns
      # @param height [Integer] requested number of rows
      def initialize(wellplate:, width:, height:)
        @wellplate = wellplate
        @width = width.to_i
        @height = height.to_i
      end

      # @return [Wellplate] the wellplate, reloaded when it changed
      # @raise [Usecases::Wellplates::Errors::InvalidDimensionsError] for an
      #   out-of-bounds size, or one dimension zero while the other is not
      # @raise [Usecases::Wellplates::Errors::ResizeNotAllowedError] when a well
      #   holding data lies outside the requested grid
      def execute!
        validate_dimensions!

        ActiveRecord::Base.transaction do
          # Serialise against a concurrent well edit. guard_occupied_wells!
          # decides what may be destroyed; without the lock a sample placed
          # between that check and the delete below would go with it.
          # Usecases::Wellplates::Update takes the same lock, which is what
          # makes that window closed rather than merely narrow.
          wellplate.lock!

          # Loaded once and reused: the no-op check, the guard and the delete
          # all ask the same question, and the rows carry the samples the guard
          # needs anyway.
          outside = wells_outside_new_grid.includes(:sample).to_a
          next if unchanged?(outside)

          guard_occupied_wells!(outside)
          outside.each(&:destroy)
          # The destroys leave the has_many cache holding the rows they just
          # removed, and a loaded association answers pluck from that cache.
          wellplate.wells.reset
          create_missing_wells
          # updated_at is set explicitly: a reconciliation that only repaired
          # drifted wells leaves width/height untouched, so Rails would skip the
          # UPDATE and no other client would ever learn the grid had changed.
          wellplate.update!(width: width, height: height, updated_at: Time.current)
        end

        wellplate.reload
      end

      private

      # Only a request that neither moves the grid nor leaves a well outside it
      # is a genuine no-op. Matching dimensions alone are not enough: a plate
      # whose rows drifted out of the grid (a null position, a row beyond the
      # edge) would otherwise be unrepairable, since no size can be asked for
      # that both reconciles it and differs from what it already claims.
      #
      # Note this covers drift *outside* the grid only. A plate short of wells
      # *inside* its grid still short-circuits here and is not repaired, because
      # create_missing_wells runs after this check.
      #
      # @param outside [Array<Well>] the wells the requested grid has no room for
      # @return [Boolean]
      def unchanged?(outside)
        wellplate.width == width && wellplate.height == height && outside.empty?
      end

      def validate_dimensions!
        Dimensions.validate!(width: width, height: height)
      end

      # Wells the requested grid has no room for. A null or below-one position
      # counts as outside: such a well cannot be placed on any grid, and the
      # designer indexes its row array by position, so a 0 would overwrite the
      # row header and a negative would land off the end.
      #
      # Ordered so the positions named in the error message are stable between
      # requests and read in the same order as the designer grid.
      #
      # @return [ActiveRecord::Relation]
      def wells_outside_new_grid
        wellplate.wells.where(
          'position_x IS NULL OR position_y IS NULL ' \
          'OR position_x < 1 OR position_y < 1 ' \
          'OR position_x > ? OR position_y > ?',
          width,
          height,
        ).order(:position_y, :position_x)
      end

      # @param outside [Array<Well>] the wells the requested grid has no room for
      # @raise [Usecases::Wellplates::Errors::ResizeNotAllowedError]
      def guard_occupied_wells!(outside)
        blocking = outside.select(&:content?)
        return if blocking.empty?

        raise Errors::ResizeNotAllowedError, blocking_message(blocking)
      end

      # @param blocking [Array<Well>]
      # @return [String]
      def blocking_message(blocking)
        positions = blocking.first(POSITIONS_IN_ERROR).map(&:alphanumeric_position)
        positions << "and #{blocking.size - POSITIONS_IN_ERROR} more" if blocking.size > POSITIONS_IN_ERROR

        "Cannot resize to #{width}x#{height}: #{blocking.size} " \
          "#{'well'.pluralize(blocking.size)} outside the new size still " \
          "#{blocking.size == 1 ? 'holds' : 'hold'} data (#{positions.join(', ')}). " \
          'Empty them and save before resizing.'
      end

      # Materialises the full grid. The designer tab builds its cells from the
      # well list, so positions without a row are simply not there to drop a
      # sample onto.
      #
      # Inserted in batches rather than one {Well} at a time: the largest grid
      # this allows is 100x100, and a row-at-a-time create would be 10_000
      # statements in one request.
      def create_missing_wells
        taken = wellplate.wells.pluck(:position_x, :position_y).to_set
        now = Time.current

        rows = WellPosition.from_dimension(width, height).filter_map do |position|
          next if taken.include?([position.x, position.y])

          {
            wellplate_id: wellplate.id,
            position_x: position.x,
            position_y: position.y,
            readouts: blank_readouts,
            created_at: now,
            updated_at: now,
          }
        end

        # Well's only validation is the hex format of color_code, which these
        # rows do not set; logidze is a database trigger and still fires.
        rows.each_slice(INSERT_BATCH_SIZE) do |batch|
          Well.insert_all(batch) # rubocop:disable Rails/SkipsModelValidations
        end
      end

      # One blank readout per readout title, matching what the wells already on
      # the plate carry — the list tab pairs +readout_titles[i]+ with
      # +readouts[i]+ and writes through without a bounds check, so a well that
      # is short of entries raises there. The +wells.readouts+ column default is
      # a single blank entry, which is only right for a plate with at most one
      # title.
      #
      # @return [Array<Hash>]
      def blank_readouts
        @blank_readouts ||= Array.new([Array(wellplate.readout_titles).size, 1].max) do
          { 'value' => '', 'unit' => '' }
        end
      end
    end
  end
end
