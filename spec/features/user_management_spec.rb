# frozen_string_literal: true

require 'rails_helper'
require 'csv'

class UserFile
  def initialize
    @header = ['email', 'password', 'firstname', 'lastname', 'nameabbr', 'type'].freeze
    @users = [['complat.user1ATeln.edu', 'password1', 'User', 'Doe', 'U1', 'Person'], # invalid email
              ['complat.user2@eln.edu', 'pass2', 'User2', 'Doe', 'U2', 'Person'], # invalid password
              ['complat.user3@eln.edu', 'password3', '', 'Doe', 'U3', 'Person'], # invalid firstname
              ['complat.user4@eln.edu', 'password4', 'User4', '', 'U4', 'Person'], # invalid lastname
              ['complat.user5@eln.edu', 'password5', 'User5', 'Doe', 'USD5', 'Person'], # invalid nameabbr
              ['complat.user6@eln.edu', 'password6', 'User6', 'Doe', 'U6', 'Person'],
              ['complat.user7@eln.edu', 'password7', 'User7', 'Doe', 'U7', 'Person']].freeze
  end

  def write(header, users)
    user_file = Tempfile.new(['user_file', '.csv'])
    CSV.open(user_file.path, 'w') do |csv|
      csv << header
      users.each { |user| csv << user }
    end
    user_file.close
    user_file
  end

  def write_valid
    write(@header, @users)
  end

  def write_invalid_header
    invalid_header = @header.dup
    invalid_header[rand(invalid_header.size)] = 'foo'
    write(invalid_header, @users)
  end

  def write_invalid_user_type
    invalid_users = @users.dup
    invalid_users[rand(invalid_users.size)][5] = 'EmperorTamarin'
    write(@header, invalid_users)
  end

  def write_n_users(n_users)
    return if n_users < 1

    users = Range.new(1, n_users).map { |i| ["complat.user#{i}@eln.edu", "password#{i}", "User#{i}", 'Doe', "U#{i}", 'Person'] }
    write(@header, users)
  end

  def write_empty
    invalid_users = []
    write(@header, invalid_users)
  end

  def write_duplicate_users
    duplicate_users = @users.dup
    duplicate_users.push(duplicate_users.last)
    write(@header, duplicate_users)
  end

  def write_missing_cell
    invalid_users = @users.dup
    invalid_users[rand(invalid_users.size)].pop
    write(@header, invalid_users)
  end
end

PROCESSING_SUMMARY =
  <<~HEREDOC.squish
    Row 1: Failed to create user; Validation failed: Email is invalid, Email from throwable email providers not accepted.
    Row 2: Failed to create user; Validation failed: Password is too short (minimum is 8 characters).
    Row 3: Failed to create user; Validation failed: First name can't be blank.
    Row 4: Failed to create user; Validation failed: Last name can't be blank.
    Row 5: Failed to create user; Validation failed: Name abbreviation has to be 2 to 3 characters long.
    Row 6: Failed to create user; Validation failed: Email has already been taken, Name abbreviation is already in use..
    Row 7: Successfully created new user.
  HEREDOC

describe 'create multiple users from file' do
  let!(:admin) { create(:admin) }

  def process_user_file(file_path, expected_processing_summary)
    find_link('User Management').click
    find_button('New User').click
    find_link('Multiple users from file').click
    within('div#createUserTabs-pane-multiUser') do
      page.attach_file(file_path) do
        page.find('#userFileDragAndDrop').click
      end
      find_button('Create users').click
      expect(find('#processingSummary')).to have_content(:all, expected_processing_summary)
    end
    expect(page).to have_field('formControlMessage', with: 'Finished processing user file.')
  end

  before do
    admin.update!(confirmed_at: Time.now, account_active: true)
    sign_in(admin)
  end

  context 'with invalid user-file' do
    let(:user_file_invalid_header) { UserFile.new.write_invalid_header }
    let(:user_file_invalid_user_type) { UserFile.new.write_invalid_user_type }
    let(:user_file_too_many_users) { UserFile.new.write_n_users(101) }
    let(:user_file_empty) { UserFile.new.write_empty }
    let(:user_file_duplicate_users) { UserFile.new.write_duplicate_users }
    let(:user_file_missing_cell) { UserFile.new.write_missing_cell }

    after do
      user_file_invalid_header.unlink
      user_file_invalid_user_type.unlink
      user_file_too_many_users.unlink
      user_file_empty.unlink
      user_file_duplicate_users.unlink
      user_file_missing_cell.unlink
    end

    it 'rejects user-file with invalid header', js: true do
      process_user_file(user_file_invalid_header.path,
        'The file contains an invalid header')
    end

    it 'rejects user-file with invalid user type', js: true do
      process_user_file(user_file_invalid_user_type.path,
        'Please select a valid type from Person,Device,Admin.')
    end

    it 'rejects user-file with > 100 users', js: true do
      process_user_file(user_file_too_many_users.path,
        'The file contains too many users.')
    end

    it 'rejects empty user-file', js: true do
      process_user_file(user_file_empty.path,
        'The file is empty.')
    end

    it 'rejects user-file with duplicate users', js: true do
      process_user_file(user_file_duplicate_users.path,
        'The file contains duplicate user emails:')
    end

    it 'rejects user-file with missing cells', js: true do
      process_user_file(user_file_missing_cell.path,
        'The user could not be parsed correctly;')
    end
  end

  context 'with valid user-file' do
    let!(:u6) { create(:user, email: 'complat.user6@eln.edu', name_abbreviation: 'U6') }
    let(:user_file_valid) { UserFile.new.write_valid }
    let(:processing_summary) { PROCESSING_SUMMARY }

    after do
      user_file_valid.unlink
    end

    it 'creates valid users and rejects invalid users', js: true do
      process_user_file(user_file_valid.path, processing_summary)
    end
  end
end
