
const patientFields = ['bloodGroup', 'address', 'emergencyContact'];
const doctorFields = [
  'specialization',
  'qualification',
  'doctorDepartment',
  'fee',
  'day',
];
const receptionistFields = ['employeeId', 'shift'];

const allRegisterFields = [
  'userType',
  'fullName',
  'email',
  'phone',
  'gender',
  'dob',
  'newUsername',
  'newPassword',
  'confirmPassword',
];

/* SHOW THE RIGHT FIELDS FOR THE CHOSEN TYPE */
function showTypeFields() {
  let type = getRadioValue('userType');

  // The common part of the form appears once any type is chosen
  document.getElementById('formBody').style.display =
    type === '' ? 'none' : 'block';

  // Show one type fieldset, hide the other two
  document.getElementById('patientFields').style.display =
    type === 'Patient' ? 'block' : 'none';
  document.getElementById('doctorFields').style.display =
    type === 'Doctor' ? 'block' : 'none';
  document.getElementById('receptionistFields').style.display =
    type === 'Receptionist' ? 'block' : 'none';

  // Highlight the chosen card (className changes which CSS rule applies)
  document.getElementById('typeCardPatient').className =
    type === 'Patient' ? 'type-option selected' : 'type-option';
  document.getElementById('typeCardDoctor').className =
    type === 'Doctor' ? 'type-option selected' : 'type-option';
  document.getElementById('typeCardReceptionist').className =
    type === 'Receptionist' ? 'type-option selected' : 'type-option';

  // The button text tells the user what will be created
  if (type !== '') {
    document.getElementById('registerButton').value =
      'Create ' + type + ' Account';
  }

  clearAllRegisterErrors();
}

/* VALIDATION */
function validateRegister() {
  let type = getRadioValue('userType');
  clearAllRegisterErrors();

  if (type === '') {
    showError('userType', 'Please choose the type of account.');
    return false;
  }

  // Run the common checks and the checks for this type
  let commonOk = validateCommon(type);
  let typeOk;

  switch (type) {
    case 'Patient':
      typeOk = validatePatient();
      break;
    case 'Doctor':
      typeOk = validateDoctor();
      break;
    case 'Receptionist':
      typeOk = validateReceptionist();
      break;
  }

  if (!(commonOk && typeOk)) {
    showMessage(
      'registerMessage',
      'Please fix the fields marked in red.',
      'error',
    );
    return false;
  }

  // Everything is valid: build the new user object
  let newUser = {
    id: nextId('U', users),
    name: document.getElementById('fullName').value.trim(),
    username: document.getElementById('newUsername').value.trim(),
    password: document.getElementById('newPassword').value,
    email: document.getElementById('email').value.trim(),
    phone: document.getElementById('phone').value.trim(),
    role: type,
    status: 'Active',
  };

  // Add the records that belong to this type
  if (type === 'Patient') {
    let newPatient = {
      id: nextId('P', patients),
      name: newUser.name,
      dob: document.getElementById('dob').value,
      gender: getRadioValue('gender'),
      phone: newUser.phone,
      email: newUser.email,
      address: document.getElementById('address').value.trim(),
      bloodGroup: document.getElementById('bloodGroup').value,
      emergencyContact: document
        .getElementById('emergencyContact')
        .value.trim(),
      userId: newUser.id,
    };
    newUser.patientId = newPatient.id;
    patients.push(newPatient);
  } else if (type === 'Doctor') {
    let newDoctor = {
      id: nextId('D', doctors),
      name: newUser.name,
      specialization: document.getElementById('specialization').value.trim(),
      qualification: document.getElementById('qualification').value.trim(),
      department: document.getElementById('doctorDepartment').value,
      fee: Number(document.getElementById('fee').value),
      days: getCheckedValues('day').join(', '),
      room: 'Room to be assigned',
      status: 'Pending',
      userId: newUser.id,
    };
    newUser.doctorId = newDoctor.id;
    newUser.status = 'Pending';
    doctors.push(newDoctor);
  } else {
    newUser.employeeId = document
      .getElementById('employeeId')
      .value.trim()
      .toUpperCase();
    newUser.shift = getRadioValue('shift');
    newUser.status = 'Pending';
  }

  users.push(newUser);
  console.log('New user:', newUser);

  let text =
    'Welcome, <strong>' +
    newUser.name +
    '</strong>! Your ' +
    type.toLowerCase() +
    ' account was created (user id ' +
    newUser.id +
    '). ';
  if (newUser.status === 'Pending') {
    text += 'An admin will check your details; you can log in after approval.';
  } else {
    text += "<a href='login.html'>Log in now</a>.";
  }
  text +=
    "<br><span class='hint'>Frontend version: the account is kept only until this page reloads. " +
    'A backend and database will save it permanently later.</span>';
  showMessage('registerMessage', text, 'success');

  document.getElementById('registerForm').reset();
  resetRegisterForm();
  return false;
}

// Checks shared by every type. "type" decides the minimum age.
function validateCommon(type) {
  let isValid = true;

  let fullName = document.getElementById('fullName').value.trim();
  let email = document.getElementById('email').value.trim();
  let phone = document.getElementById('phone').value.trim();
  let dob = document.getElementById('dob').value;
  let username = document.getElementById('newUsername').value.trim();
  let password = document.getElementById('newPassword').value;
  let confirmPassword = document.getElementById('confirmPassword').value;

  if (fullName.length < 3) {
    showError('fullName', 'Full name must be at least 3 characters.');
    isValid = false;
  }

  if (isEmpty(email)) {
    showError('email', 'Email is required.');
    isValid = false;
  } else if (isValidEmail(email) === false) {
    showError('email', 'Please enter a valid email address.');
    isValid = false;
  } else if (isTaken('email', email)) {
    showError('email', 'An account with this email already exists.');
    isValid = false;
  }

  if (isValidPhone(phone) === false) {
    showError('phone', 'Phone must be 11 digits and start with 01.');
    isValid = false;
  }

  if (getRadioValue('gender') === '') {
    showError('gender', 'Please select an option.');
    isValid = false;
  }

  // Date of birth: must be given, not in the future, and old enough for the type
  if (dob === '') {
    showError('dob', 'Please choose your date of birth.');
    isValid = false;
  } else if (daysBetween(dob, todayString()) < 0) {
    showError('dob', 'Date of birth cannot be in the future.');
    isValid = false;
  } else {
    let minimumAge = 0;
    if (type === 'Doctor') {
      minimumAge = 25;
    } else if (type === 'Receptionist') {
      minimumAge = 18;
    }
    let age = Math.floor(daysBetween(dob, todayString()) / 365.25);
    if (age < minimumAge) {
      showError(
        'dob',
        'A ' +
          type.toLowerCase() +
          ' must be at least ' +
          minimumAge +
          ' years old.',
      );
      isValid = false;
    }
  }

  if (username.length < 4) {
    showError('newUsername', 'Username must be at least 4 characters.');
    isValid = false;
  } else if (isTaken('username', username)) {
    showError('newUsername', 'This username is already taken.');
    isValid = false;
  }

  if (password.length < 8) {
    showError('newPassword', 'Password must be at least 8 characters.');
    isValid = false;
  }

  if (confirmPassword !== password) {
    showError('confirmPassword', 'The two passwords do not match.');
    isValid = false;
  }

  return isValid;
}

function validatePatient() {
  let isValid = true;

  if (document.getElementById('bloodGroup').value === '') {
    showError('bloodGroup', 'Please choose a blood group.');
    isValid = false;
  }
  if (document.getElementById('address').value.trim().length < 5) {
    showError('address', 'Please enter your address.');
    isValid = false;
  }
  if (document.getElementById('emergencyContact').value.trim().length < 5) {
    showError('emergencyContact', 'Please enter a name and phone number.');
    isValid = false;
  }
  return isValid;
}

function validateDoctor() {
  let isValid = true;
  let fee = document.getElementById('fee').value;

  if (document.getElementById('specialization').value.trim().length < 3) {
    showError('specialization', 'Please enter your specialization.');
    isValid = false;
  }
  if (document.getElementById('qualification').value.trim().length < 3) {
    showError('qualification', 'Please enter your qualification.');
    isValid = false;
  }
  if (document.getElementById('doctorDepartment').value === '') {
    showError('doctorDepartment', 'Please choose a department.');
    isValid = false;
  }
  if (fee === '' || Number(fee) < 100 || Number(fee) > 10000) {
    showError('fee', 'Fee must be between 100 and 10000 Tk.');
    isValid = false;
  }
  if (getCheckedValues('day').length === 0) {
    showError('day', 'Please tick at least one day.');
    isValid = false;
  }
  return isValid;
}

function validateReceptionist() {
  let isValid = true;
  let employeeId = document
    .getElementById('employeeId')
    .value.trim()
    .toUpperCase();

  // Pattern EMP-1234: "EMP-" followed by 4 digits
  if (
    employeeId.length !== 8 ||
    employeeId.slice(0, 4) !== 'EMP-' ||
    isDigitsOnly(employeeId.slice(4)) === false
  ) {
    showError('employeeId', 'Employee ID must look like EMP-1234.');
    isValid = false;
  }
  if (getRadioValue('shift') === '') {
    showError('shift', 'Please choose a shift.');
    isValid = false;
  }
  return isValid;
}

// true when another user already has this username or email
function isTaken(property, value) {
  for (const user of users) {
    if (user[property].toLowerCase() === value.toLowerCase()) {
      return true;
    }
  }
  return false;
}

/*CLEARING THE FORM */
function clearAllRegisterErrors() {
  clearErrors(allRegisterFields);
  clearErrors(patientFields);
  clearErrors(doctorFields);
  clearErrors(receptionistFields);
  hideMessage('registerMessage');
}

// commit7

// Fill the department list of the doctor fieldset from the departments array
for (const department of departments) {
  addOption(
    document.getElementById('doctorDepartment'),
    department.name,
    department.name,
  );
}
