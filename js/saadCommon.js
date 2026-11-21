/*
   4. SMALL VALIDATION HELPERS Each returns true or false, so they can be used inside if ( ... ) */

// true when the user typed nothing (or only spaces)
function isEmpty(value) {
  return value.trim() === '';
}

// A simple e-mail check: something@something.something
function isValidEmail(email) {
  let atPosition = email.indexOf('@');
  let dotPosition = email.indexOf('.', atPosition);

  if (atPosition < 1) {
    return false;
  }
  if (dotPosition < atPosition + 2) {
    return false;
  }
  if (dotPosition === email.length - 1) {
    return false;
  }
  return true;
}

// true when every character of text is a digit 0-9
function isDigitsOnly(text) {
  if (text.length === 0) {
    return false;
  }
  let digits = '0123456789';
  for (let i = 0; i < text.length; i++) {
    if (digits.indexOf(text[i]) === -1) {
      return false;
    }
  }
  return true;
}

// A phone number here is 11 digits and starts with 01 (e.g. 01711000001)
function isValidPhone(phone) {
  return (
    isDigitsOnly(phone) && phone.length === 11 && phone.slice(0, 2) === '01'
  );
}

// Returns the value of the ticked radio button in a group, or "" if none
function getRadioValue(groupName) {
  let radios = document.getElementsByName(groupName);
  for (let i = 0; i < radios.length; i++) {
    if (radios[i].checked) {
      return radios[i].value;
    }
  }
  return '';
}

// Returns an array with the values of all ticked checkboxes in a group
function getCheckedValues(groupName) {
  let boxes = document.getElementsByName(groupName);
  let selected = [];
  for (let i = 0; i < boxes.length; i++) {
    if (boxes[i].checked) {
      selected.push(boxes[i].value);
    }
  }
  return selected;
}

/* 11. PROFILE (same form ids on every dashboard)profileName, profileEmail, profilePhone are editable;profileUsername and profileRole are read only. */

function renderProfile() {
  document.getElementById('profileName').value = currentUser.name;
  document.getElementById('profileEmail').value = currentUser.email;
  document.getElementById('profilePhone').value = currentUser.phone;
  document.getElementById('profileUsername').value = currentUser.username;
  document.getElementById('profileRole').value = currentUser.role;

  // Extra details that depend on the role
  let details =
    '<strong>Account id:</strong> ' +
    currentUser.id +
    ' &middot; <strong>Status:</strong> ' +
    currentUser.status;
  if (currentUser.role === 'Doctor') {
    let doctor = findById(doctors, currentUser.doctorId);
    details +=
      '<br><strong>Specialization:</strong> ' +
      doctor.specialization +
      ' &middot; <strong>Department:</strong> ' +
      doctor.department +
      ' &middot; <strong>Room:</strong> ' +
      doctor.room;
  } else if (currentUser.role === 'Patient') {
    let patient = findById(patients, currentUser.patientId);
    details +=
      '<br><strong>Patient id:</strong> ' +
      patient.id +
      ' &middot; <strong>Blood group:</strong> ' +
      patient.bloodGroup +
      ' &middot; <strong>Date of birth:</strong> ' +
      patient.dob;
  } else if (currentUser.role === 'Receptionist') {
    details +=
      '<br><strong>Employee id:</strong> ' +
      currentUser.employeeId +
      ' &middot; <strong>Shift:</strong> ' +
      currentUser.shift;
  }
  document.getElementById('profileDetails').innerHTML = details;
}

function saveProfile() {
  let name = document.getElementById('profileName').value.trim();
  let email = document.getElementById('profileEmail').value.trim();
  let phone = document.getElementById('profilePhone').value.trim();
  let isValid = true;

  clearErrors(['profileName', 'profileEmail', 'profilePhone']);

  if (name.length < 3) {
    showError('profileName', 'Name must be at least 3 characters.');
    isValid = false;
  }
  if (isValidEmail(email) === false) {
    showError('profileEmail', 'Please enter a valid email address.');
    isValid = false;
  }
  if (isValidPhone(phone) === false) {
    showError('profilePhone', 'Phone must be 11 digits and start with 01.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  // Update the account, then the doctor / patient record that belongs to it
  currentUser.name = name;
  currentUser.email = email;
  currentUser.phone = phone;

  if (currentUser.role === 'Doctor') {
    let doctor = findById(doctors, currentUser.doctorId);
    doctor.name = name;
  } else if (currentUser.role === 'Patient') {
    let patient = findById(patients, currentUser.patientId);
    patient.name = name;
    patient.email = email;
    patient.phone = phone;
  }

  document.getElementById('welcomeName').innerHTML = name;
  addLog(
    'Account',
    currentUser.role + ' ' + currentUser.username + ' updated the profile',
  );
  renderProfile();
  showMessage('profileMessage', 'Your profile was saved.', 'success');
  return false;
}
