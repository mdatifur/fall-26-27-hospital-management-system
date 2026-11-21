

// The ids of the sections on this page (used by showSection in common.js)
const sections = [
  'checkinSection',
  'bookingSection',
  'registrationSection',
  'notificationsSection',
  'profileSection',
  'emergencySection',
];

// The receptionist who is logged in (null = wrong role, the page shows "Access denied")
const currentUser = getLoggedInUser('Receptionist');

// -1 means "booking a new appointment"; any other number is the index being edited
let editBookingIndex = -1;

/* UNIQUE FEATURE 3: PATIENT CHECK-IN AND TOKEN GENERATOR */

// Returns the queue token of an appointment, or null when the patient has not checked in
function findTokenOf(appointmentId) {
  for (const entry of queue) {
    if (entry.appointmentId === appointmentId) {
      return entry;
    }
  }
  return null;
}

// READ + SEARCH. With an empty search box only today's appointments are listed;
// with a keyword every appointment that matches is listed.
function renderCheckin() {
  let keyword = document.getElementById('checkinSearch').value.trim();
  let today = todayString();
  let rows = '';
  let shown = 0;

  for (let i = 0; i < appointments.length; i++) {
    let appointment = appointments[i];
    let patient = findById(patients, appointment.patientId);

    let matches;
    if (keyword === '') {
      matches = appointment.date === today;
    } else {
      matches =
        containsText(patient.name, keyword) ||
        containsText(patient.phone, keyword) ||
        containsText(appointment.id, keyword);
    }

    if (matches) {
      let token = findTokenOf(appointment.id);
      let tokenText =
        token === null ? '&mdash;' : '<strong>' + token.token + '</strong>';

      // The Check In button only works for a Pending appointment of today (verified again in checkInPatient)
      let action = '&mdash;';
      if (appointment.status === 'Pending') {
        action =
          "<button type='button' class='btn btn-small btn-success' onclick='checkInPatient(" +
          i +
          ")'>Check In</button>";
      } else if (token !== null) {
        action =
          "<button type='button' class='btn btn-small' onclick='showTokenSlip(" +
          i +
          ")'>Show token</button>";
      }

      rows +=
        '<tr>' +
        '<td>' +
        appointment.id +
        '</td>' +
        '<td><strong>' +
        patient.name +
        "</strong><br><span class='hint'>" +
        patient.phone +
        '</span></td>' +
        '<td>' +
        doctorName(appointment.doctorId) +
        '</td>' +
        '<td>' +
        appointment.date +
        '</td>' +
        '<td>' +
        appointment.time +
        '</td>' +
        "<td><span class='badge " +
        appointmentColor(appointment.status) +
        "'>" +
        appointment.status +
        '</span></td>' +
        '<td>' +
        tokenText +
        '</td>' +
        '<td>' +
        action +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='8' class='empty-row'>No appointments found.</td></tr>";
  }
  document.getElementById('checkinBody').innerHTML = rows;
  document.getElementById('checkinCount').innerHTML =
    keyword === ''
      ? shown + ' appointment(s) today'
      : shown + ' appointment(s) found';
}

// The check-in button: verify the appointment, make a token, show the slip
function checkInPatient(index) {
  let appointment = appointments[index];
  let today = todayString();

  // ----- Verify the appointment -----
  if (appointment.status !== 'Pending') {
    showMessage(
      'checkinMessage',
      'Appointment ' +
      appointment.id +
      ' is ' +
      appointment.status +
      ' and cannot be checked in.',
      'error',
    );
    return;
  }
  if (appointment.date !== today) {
    showMessage(
      'checkinMessage',
      'Appointment ' +
      appointment.id +
      ' is on ' +
      appointment.date +
      ', not today.',
      'error',
    );
    return;
  }

  // ----- Make the next token number for this doctor today -----
  let biggest = 0;
  for (const entry of queue) {
    if (
      entry.doctorId === appointment.doctorId &&
      entry.date === today &&
      entry.token > biggest
    ) {
      biggest = entry.token;
    }
  }
  let newToken = {
    id: nextId('Q', queue),
    token: biggest + 1,
    appointmentId: appointment.id,
    patientId: appointment.patientId,
    doctorId: appointment.doctorId,
    date: today,
    status: 'Waiting',
  };
  queue.push(newToken);

  appointment.status = 'Checked-in';

  addLog(
    'Appointment',
    'Checked in ' +
    patientName(appointment.patientId) +
    ', token ' +
    newToken.token,
  );
  addNotification(
    accountOfPatient(appointment.patientId),
    'Queue',
    'You are checked in. Your token is ' +
    newToken.token +
    ' for ' +
    doctorName(appointment.doctorId) +
    '.',
  );
  addNotification(
    accountOfDoctor(appointment.doctorId),
    'Queue',
    'Token ' +
    newToken.token +
    ' (' +
    patientName(appointment.patientId) +
    ') is waiting in your queue.',
  );

  showTokenSlip(index);
  renderCheckin();
  renderQueueTable();
  renderDashboard();
  renderAppointments();
  showMessage(
    'checkinMessage',
    patientName(appointment.patientId) +
    ' was checked in with token ' +
    newToken.token +
    '.',
    'success',
  );
}

// Shows the token, the token that is being served now and the patient's queue status
function showTokenSlip(index) {
  let appointment = appointments[index];
  let token = findTokenOf(appointment.id);
  if (token === null) {
    return;
  }

  // Which token is being served for this doctor, and how many are ahead?
  let servingText = 'nobody yet';
  let ahead = 0;
  for (const entry of queue) {
    if (entry.doctorId === token.doctorId && entry.date === token.date) {
      if (entry.status === 'Serving') {
        servingText =
          'token ' + entry.token + ' (' + patientName(entry.patientId) + ')';
      }
      if (
        (entry.status === 'Waiting' || entry.status === 'Serving') &&
        entry.token < token.token
      ) {
        ahead++;
      }
    }
  }

  let doctor = findById(doctors, token.doctorId);
  document.getElementById('tokenSlip').innerHTML =
    "<div class='result-box'>" +
    "<div class='hint'>Token number</div>" +
    "<div class='big'>" +
    token.token +
    '</div>' +
    '<p><strong>' +
    patientName(token.patientId) +
    '</strong></p>' +
    '<p>' +
    doctor.name +
    ' &middot; ' +
    doctor.room +
    '</p>' +
    '<p>Appointment time: ' +
    appointment.time +
    '</p>' +
    "<p>Queue status: <span class='badge " +
    appointmentColor(appointment.status) +
    "'>" +
    token.status +
    '</span></p>' +
    '<p>Now serving: ' +
    servingText +
    '</p>' +
    '<p>Patients ahead: ' +
    ahead +
    '</p>' +
    '</div>';
}

// All of today's tokens, for every doctor
function renderQueueTable() {
  let today = todayString();
  let rows = '';

  for (const entry of queue) {
    if (entry.date === today) {
      let color = 'orange';
      if (entry.status === 'Serving') {
        color = 'teal';
      } else if (entry.status === 'Completed') {
        color = 'green';
      } else if (entry.status === 'Skipped') {
        color = 'grey';
      }
      rows +=
        '<tr>' +
        '<td><strong>' +
        entry.token +
        '</strong></td>' +
        '<td>' +
        patientName(entry.patientId) +
        '</td>' +
        '<td>' +
        doctorName(entry.doctorId) +
        '</td>' +
        "<td><span class='badge " +
        color +
        "'>" +
        entry.status +
        '</span></td>' +
        '</tr>';
    }
  }
  if (rows === '') {
    rows =
      "<tr><td colspan='4' class='empty-row'>No tokens have been given today.</td></tr>";
  }
  document.getElementById('queueBody').innerHTML = rows;
}

// Dashboard statistics, counted from the arrays
function renderDashboard() {
  let today = todayString();
  let total = 0;
  let notArrived = 0;
  let completed = 0;
  let waiting = 0;

  for (const appointment of appointments) {
    if (appointment.date === today && appointment.status !== 'Cancelled') {
      total++;
      if (appointment.status === 'Pending') {
        notArrived++;
      } else if (appointment.status === 'Completed') {
        completed++;
      }
    }
  }
  for (const entry of queue) {
    if (entry.date === today && entry.status === 'Waiting') {
      waiting++;
    }
  }

  document.getElementById('dashToday').innerHTML = total;
  document.getElementById('dashNotArrived').innerHTML = notArrived;
  document.getElementById('dashWaiting').innerHTML = waiting;
  document.getElementById('dashCompleted').innerHTML = completed;
}

/* UNIQUE FEATURE 2: APPOINTMENT AND SLOT MANAGER */

// Fill the patient and department lists from the arrays (createElement + appendChild)
function fillBookingLists() {
  let patientSelect = document.getElementById('bookPatient');
  for (const patient of patients) {
    addOption(patientSelect, patient.id, patient.id + ' - ' + patient.name);
  }
  let departmentSelect = document.getElementById('bookDepartment');
  for (const department of departments) {
    addOption(departmentSelect, department.name, department.name);
  }
  fillDoctorOptions();
}

// Show only the doctors of the chosen department
function fillDoctorOptions() {
  fillDoctorSelect(
    'bookDoctor',
    document.getElementById('bookDepartment').value,
  );
  refreshBookingSlots();
}

// Show which time slots are free for the chosen doctor and date
function refreshBookingSlots() {
  let ignoreId = '';
  if (editBookingIndex !== -1) {
    ignoreId = appointments[editBookingIndex].id; // the appointment being edited does not block itself
  }
  fillTimeSlots(
    'bookTime',
    document.getElementById('bookDoctor').value,
    document.getElementById('bookDate').value,
    ignoreId,
  );
}

// READ + SEARCH
function renderAppointments() {
  let keyword = document.getElementById('bookingSearch').value;
  let statusFilter = document.getElementById('bookingStatusFilter').value;
  let rows = '';
  let shown = 0;

  for (let i = 0; i < appointments.length; i++) {
    let appointment = appointments[i];
    let pName = patientName(appointment.patientId);
    let dName = doctorName(appointment.doctorId);

    let matchesKeyword =
      containsText(pName, keyword) ||
      containsText(dName, keyword) ||
      containsText(appointment.id, keyword);
    let matchesStatus =
      statusFilter === 'All' || appointment.status === statusFilter;

    if (matchesKeyword && matchesStatus) {
      // Only a Pending appointment can be edited; Pending and Checked-in ones can be cancelled
      let actions = '&mdash;';
      if (appointment.status === 'Pending') {
        actions =
          "<button type='button' class='btn btn-small' onclick='editAppointment(" +
          i +
          ")'>Edit</button>" +
          "<button type='button' class='btn btn-small btn-danger' onclick='cancelAppointment(" +
          i +
          ")'>Cancel</button>";
      } else if (appointment.status === 'Checked-in') {
        actions =
          "<button type='button' class='btn btn-small btn-danger' onclick='cancelAppointment(" +
          i +
          ")'>Cancel</button>";
      }

      rows +=
        '<tr>' +
        '<td>' +
        appointment.id +
        '</td>' +
        '<td>' +
        pName +
        '</td>' +
        '<td>' +
        dName +
        '</td>' +
        '<td>' +
        appointment.date +
        '</td>' +
        '<td>' +
        appointment.time +
        '</td>' +
        "<td><span class='badge " +
        appointmentColor(appointment.status) +
        "'>" +
        appointment.status +
        '</span></td>' +
        '<td>' +
        actions +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='7' class='empty-row'>No appointments match your search.</td></tr>";
  }
  document.getElementById('bookingBody').innerHTML = rows;
  document.getElementById('bookingCount').innerHTML =
    'Showing ' + shown + ' of ' + appointments.length + ' appointments';
}

// CREATE or UPDATE: runs when the appointment form is submitted
function saveAppointment() {
  let patientId = document.getElementById('bookPatient').value;
  let department = document.getElementById('bookDepartment').value;
  let doctorId = document.getElementById('bookDoctor').value;
  let date = document.getElementById('bookDate').value;
  let time = document.getElementById('bookTime').value;
  let reason = document.getElementById('bookReason').value.trim();
  let status = document.getElementById('bookStatus').value;

  let ignoreId = '';
  if (editBookingIndex !== -1) {
    ignoreId = appointments[editBookingIndex].id;
  }

  // ----- Validation -----
  let isValid = true;
  clearErrors([
    'bookPatient',
    'bookDepartment',
    'bookDoctor',
    'bookDate',
    'bookTime',
    'bookReason',
  ]);

  if (patientId === '') {
    showError('bookPatient', 'Please choose a patient.');
    isValid = false;
  }
  if (department === '') {
    showError('bookDepartment', 'Please choose a department.');
    isValid = false;
  }
  if (doctorId === '') {
    showError('bookDoctor', 'Please choose a doctor.');
    isValid = false;
  } else {
    let problem = getDateProblem(findById(doctors, doctorId), date);
    if (problem !== '') {
      showError('bookDate', problem);
      isValid = false;
    }
  }
  if (time === '') {
    showError('bookTime', 'Please choose a free time.');
    isValid = false;
  } else if (doctorId !== '' && isSlotBooked(doctorId, date, time, ignoreId)) {
    // The same doctor cannot have two appointments at the same date and time
    showError(
      'bookTime',
      'This doctor is already booked at that date and time.',
    );
    isValid = false;
  }
  if (reason.length < 3) {
    showError('bookReason', 'Please write the reason for the visit.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  // ----- Save -----
  if (editBookingIndex === -1) {
    // CREATE: build a new object and push() it
    let newAppointment = {
      id: nextId('A', appointments),
      patientId: patientId,
      doctorId: doctorId,
      department: department,
      date: date,
      time: time,
      reason: reason,
      status: status,
    };
    appointments.push(newAppointment);
    addLog(
      'Appointment',
      'Booked appointment ' +
      newAppointment.id +
      ' for ' +
      patientName(patientId),
    );
    addNotification(
      accountOfPatient(patientId),
      'Appointment',
      'An appointment was booked for you on ' +
      date +
      ' at ' +
      time +
      ' with ' +
      doctorName(doctorId) +
      '.',
    );
    addNotification(
      accountOfDoctor(doctorId),
      'Appointment',
      'New appointment ' +
      newAppointment.id +
      ' on ' +
      date +
      ' at ' +
      time +
      ' (' +
      patientName(patientId) +
      ').',
    );
    showMessage(
      'bookingMessage',
      'Appointment <strong>' + newAppointment.id + '</strong> was booked.',
      'success',
    );
  } else {
    // UPDATE: change the properties of the object that is being edited
    let appointment = appointments[editBookingIndex];
    appointment.patientId = patientId;
    appointment.department = department;
    appointment.doctorId = doctorId;
    appointment.date = date;
    appointment.time = time;
    appointment.reason = reason;
    setAppointmentStatus(appointment, status);
    addLog('Appointment', 'Updated appointment ' + appointment.id);
    addNotification(
      accountOfPatient(patientId),
      'Appointment',
      'Your appointment ' +
      appointment.id +
      ' is now on ' +
      date +
      ' at ' +
      time +
      ' (' +
      status +
      ').',
    );
    showMessage(
      'bookingMessage',
      'Appointment <strong>' + appointment.id + '</strong> was updated.',
      'success',
    );
  }

  resetBookingForm();
  renderAppointments();
  renderCheckin();
  renderDashboard();
  return false;
}

// Copies the appointment into the form so it can be changed
function editAppointment(index) {
  let appointment = appointments[index];
  editBookingIndex = index;

  document.getElementById('bookPatient').value = appointment.patientId;
  document.getElementById('bookDepartment').value = appointment.department;
  fillDoctorOptions();
  document.getElementById('bookDoctor').value = appointment.doctorId;
  document.getElementById('bookDate').value = appointment.date;
  refreshBookingSlots();
  document.getElementById('bookTime').value = appointment.time;
  document.getElementById('bookReason').value = appointment.reason;
  document.getElementById('bookStatus').value = appointment.status;

  document.getElementById('bookingFormTitle').innerHTML =
    'Update Appointment ' + appointment.id;
  document.getElementById('bookingSaveButton').value = 'Save Changes';
  hideMessage('bookingMessage');
}

function cancelAppointment(index) {
  let appointment = appointments[index];
  if (confirm('Cancel appointment ' + appointment.id + '?')) {
    setAppointmentStatus(appointment, 'Cancelled'); // also marks the queue token as skipped
    addLog('Appointment', 'Cancelled appointment ' + appointment.id);
    addNotification(
      accountOfPatient(appointment.patientId),
      'Appointment',
      'Your appointment ' +
      appointment.id +
      ' on ' +
      appointment.date +
      ' was cancelled.',
    );
    resetBookingForm();
    renderAppointments();
    renderCheckin();
    renderQueueTable();
    renderDashboard();
    showMessage(
      'bookingMessage',
      'Appointment ' + appointment.id + ' was cancelled.',
      'info',
    );
  }
}

function resetBookingForm() {
  editBookingIndex = -1;
  document.getElementById('bookingForm').reset();
  fillDoctorOptions(); // show all doctors again and refresh the time list
  clearErrors([
    'bookPatient',
    'bookDepartment',
    'bookDoctor',
    'bookDate',
    'bookTime',
    'bookReason',
  ]);
  document.getElementById('bookingFormTitle').innerHTML = 'Book an Appointment';
  document.getElementById('bookingSaveButton').value = 'Book Appointment';
}

/* UNIQUE FEATURE 1: QUICK PATIENT REGISTRATION */

// The Patient ID field always shows the id the next patient will get
function showNextPatientId() {
  document.getElementById('regId').value = nextId('P', patients);
}

// READ + SEARCH
function renderPatients() {
  let keyword = document.getElementById('patientSearch').value;
  let rows = '';
  let shown = 0;

  for (const patient of patients) {
    let matches =
      containsText(patient.name, keyword) ||
      containsText(patient.phone, keyword) ||
      containsText(patient.id, keyword);
    if (matches) {
      rows +=
        '<tr>' +
        '<td>' +
        patient.id +
        '</td>' +
        '<td><strong>' +
        patient.name +
        '</strong></td>' +
        '<td>' +
        patient.phone +
        '</td>' +
        '<td>' +
        patient.gender +
        '</td>' +
        '<td>' +
        patient.bloodGroup +
        '</td>' +
        '<td>' +
        patient.dob +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='6' class='empty-row'>No patients match your search.</td></tr>";
  }
  document.getElementById('patientBody').innerHTML = rows;
  document.getElementById('patientCount').innerHTML =
    'Showing ' + shown + ' of ' + patients.length + ' patients';
}

// CREATE: runs when the registration form is submitted
function savePatient() {
  let name = document.getElementById('regName').value.trim();
  let dob = document.getElementById('regDob').value;
  let gender = getRadioValue('regGender');
  let phone = document.getElementById('regPhone').value.trim();
  let email = document.getElementById('regEmail').value.trim();
  let address = document.getElementById('regAddress').value.trim();
  let bloodGroup = document.getElementById('regBlood').value;
  let emergency = document.getElementById('regEmergency').value.trim();

  // ----- Validation -----
  let isValid = true;
  clearErrors([
    'regName',
    'regDob',
    'regGender',
    'regPhone',
    'regEmail',
    'regAddress',
    'regBlood',
    'regEmergency',
  ]);

  if (name.length < 3) {
    showError('regName', 'Name must be at least 3 characters.');
    isValid = false;
  }
  if (dob === '') {
    showError('regDob', 'Please choose the date of birth.');
    isValid = false;
  } else if (daysBetween(dob, todayString()) < 0) {
    showError('regDob', 'Date of birth cannot be in the future.');
    isValid = false;
  }
  if (gender === '') {
    showError('regGender', 'Please select an option.');
    isValid = false;
  }
  if (isValidPhone(phone) === false) {
    showError('regPhone', 'Phone must be 11 digits and start with 01.');
    isValid = false;
  } else {
    // Duplicate check: the same phone number cannot be registered twice
    for (const patient of patients) {
      if (patient.phone === phone) {
        showError(
          'regPhone',
          'This phone number is already registered to ' +
          patient.name +
          ' (' +
          patient.id +
          ').',
        );
        isValid = false;
      }
    }
  }
  if (isValidEmail(email) === false) {
    showError('regEmail', 'Please enter a valid email address.');
    isValid = false;
  }
  if (address.length < 5) {
    showError('regAddress', 'Please enter the address.');
    isValid = false;
  }
  if (bloodGroup === '') {
    showError('regBlood', 'Please choose a blood group.');
    isValid = false;
  }
  if (emergency.length < 5) {
    showError('regEmergency', 'Please enter a name and phone number.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  // ----- Save: build an object and push() it into the shared array -----
  let newPatient = {
    id: nextId('P', patients),
    name: name,
    dob: dob,
    gender: gender,
    phone: phone,
    email: email,
    address: address,
    bloodGroup: bloodGroup,
    emergencyContact: emergency,
    userId: '',
  };
  patients.push(newPatient);
  addLog('Patient', 'Registered patient ' + name + ' (' + newPatient.id + ')');

  // The new patient can now be chosen in the appointment form
  addOption(
    document.getElementById('bookPatient'),
    newPatient.id,
    newPatient.id + ' - ' + newPatient.name,
  );

  resetRegistrationForm();
  renderPatients();
  showMessage(
    'registrationMessage',
    'Patient <strong>' +
    name +
    '</strong> was registered with id <strong>' +
    newPatient.id +
    '</strong>.',
    'success',
  );
  return false;
}

function resetRegistrationForm() {
  document.getElementById('registrationForm').reset();
  clearErrors([
    'regName',
    'regDob',
    'regGender',
    'regPhone',
    'regEmail',
    'regAddress',
    'regBlood',
    'regEmergency',
  ]);
  showNextPatientId();
}

/* UNIQUE FEATURE 4: DYNAMIC SLOT BOOKING AND EMERGENCY RESCHEDULING */

// How many days after the unavailable date are searched for a free slot
const rescheduleSearchDays = 14;

let doctorUnavailability = [];
let emergencyAffected = [];
let emergencyPeriod = null;

// true when a time text "HH:MM" is inside the period start (included) to end (not included)
function timeInPeriod(time, start, end) {
  return time >= start && time < end;
}

function isDoctorUnavailable(doctorId, date, time) {
  for (const period of doctorUnavailability) {
    if (
      period.doctorId === doctorId &&
      period.date === date &&
      timeInPeriod(time, period.start, period.end)
    ) {
      return true;
    }
  }
  return false;
}

// true when the patient already has an active appointment (any doctor) at that date and time
function isPatientBusy(patientId, date, time, ignoreId) {
  for (const appointment of appointments) {
    if (
      appointment.patientId === patientId &&
      appointment.date === date &&
      appointment.time === time &&
      appointment.status !== 'Cancelled' &&
      appointment.id !== ignoreId
    ) {
      return true;
    }
  }
  return false;
}

// The date text that is "days" days after dateText (both as "YYYY-MM-DD")
function dateAfterDays(dateText, days) {
  let date = new Date(dateText + 'T00:00');
  date.setDate(date.getDate() + days);
  let month = date.getMonth() + 1;
  let day = date.getDate();
  if (month < 10) {
    month = '0' + month;
  }
  if (day < 10) {
    day = '0' + day;
  }
  return date.getFullYear() + '-' + month + '-' + day;
}

// Fill the doctor list (active doctors only)
function fillEmergencyDoctors() {
  fillDoctorSelect('emgDoctor', '');
}

// STEP 1 + 2: runs when the unavailability form is submitted
function findAffectedAppointments() {
  let doctorId = document.getElementById('emgDoctor').value;
  let date = document.getElementById('emgDate').value;
  let start = document.getElementById('emgStart').value;
  let end = document.getElementById('emgEnd').value;
  let reason = document.getElementById('emgReason').value;

  // ----- Validation -----
  let isValid = true;
  clearErrors(['emgDoctor', 'emgDate', 'emgStart', 'emgEnd', 'emgReason']);

  if (doctorId === '') {
    showError('emgDoctor', 'Please choose a doctor.');
    isValid = false;
  }
  if (date === '') {
    showError('emgDate', 'Please choose the unavailable date.');
    isValid = false;
  } else if (daysBetween(todayString(), date) < 0) {
    showError('emgDate', 'The date cannot be in the past.');
    isValid = false;
  }
  if (start === '') {
    showError('emgStart', 'Please choose the start time.');
    isValid = false;
  }
  if (end === '') {
    showError('emgEnd', 'Please choose the end time.');
    isValid = false;
  } else if (start !== '' && end <= start) {
    showError('emgEnd', 'The end time must be after the start time.');
    isValid = false;
  }
  if (reason === '') {
    showError('emgReason', 'Please choose a reason.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  // ----- Remember the unavailable period (the same period is not saved twice) -----
  let alreadySaved = false;
  for (const period of doctorUnavailability) {
    if (
      period.doctorId === doctorId &&
      period.date === date &&
      period.start === start &&
      period.end === end
    ) {
      alreadySaved = true;
    }
  }
  if (alreadySaved === false) {
    doctorUnavailability.push({
      doctorId: doctorId,
      date: date,
      start: start,
      end: end,
      reason: reason,
    });
    addLog(
      'Appointment',
      doctorName(doctorId) +
      ' marked unavailable on ' +
      date +
      ' ' +
      start +
      '-' +
      end +
      ' (' +
      reason +
      ')',
    );
  }
  emergencyPeriod = {
    doctorId: doctorId,
    date: date,
    start: start,
    end: end,
    reason: reason,
  };

  // ----- Find the affected appointments of this doctor -----
  // Only Pending and Checked-in appointments can still be moved. Completed, Cancelled
  // and In Consultation appointments are counted but left alone.
  emergencyAffected = [];
  let leftAlone = 0;
  for (const appointment of appointments) {
    if (
      appointment.doctorId === doctorId &&
      appointment.date === date &&
      timeInPeriod(appointment.time, start, end)
    ) {
      if (
        appointment.status === 'Pending' ||
        appointment.status === 'Checked-in'
      ) {
        emergencyAffected.push({
          appointmentId: appointment.id,
          patientId: appointment.patientId,
          originalDate: appointment.date,
          originalTime: appointment.time,
          status: appointment.status,
          newDate: '',
          newTime: '',
          result: 'Pending',
          notification: 'Not sent',
        });
      } else {
        leftAlone++;
      }
    }
  }
  emergencyAffected.sort(function (a, b) {
    return a.originalTime < b.originalTime
      ? -1
      : a.originalTime > b.originalTime
        ? 1
        : 0;
  });

  renderEmergency();
  refreshBookingSlots();

  let text =
    '<strong>' +
    doctorName(doctorId) +
    '</strong> is unavailable on ' +
    date +
    ' from ' +
    start +
    ' to ' +
    end +
    ' (' +
    reason +
    '). ' +
    emergencyAffected.length +
    ' appointment(s) affected.';
  if (leftAlone > 0) {
    text +=
      ' ' +
      leftAlone +
      ' other appointment(s) in this period are already Completed, Cancelled or In Consultation and were not changed.';
  }
  showMessage(
    'emergencyMessage',
    text,
    emergencyAffected.length > 0 ? 'info' : 'success',
  );
  return false;
}

// Finds the next free slot for the doctor of this appointment, starting on the unavailable date.
// Returns { date, time } or null when nothing is free within rescheduleSearchDays.
function findNextFreeSlot(appointment, period) {
  let doctor = findById(doctors, appointment.doctorId);
  let today = todayString();
  let now = nowString().substring(11); // "HH:MM" of the current time

  for (let offset = 0; offset <= rescheduleSearchDays; offset++) {
    let date = dateAfterDays(period.date, offset);
    if (daysBetween(today, date) < 0 || doctorWorksOn(doctor, date) === false) {
      continue;
    }
    for (const time of timeSlots) {
      if (date === period.date && time < period.end) {
        continue; // inside (or before) the unavailable period
      }
      if (date === today && time <= now) {
        continue; // that time has already passed today
      }
      if (isDoctorUnavailable(appointment.doctorId, date, time)) {
        continue;
      }
      if (isSlotBooked(appointment.doctorId, date, time, appointment.id)) {
        continue; // another patient already has this slot
      }
      if (isPatientBusy(appointment.patientId, date, time, appointment.id)) {
        continue; // the patient is already booked elsewhere then
      }
      return { date: date, time: time };
    }
  }
  return null;
}

// STEP 3: the "Reschedule All Appointments" button
function rescheduleAllAppointments() {
  if (emergencyPeriod === null || emergencyAffected.length === 0) {
    showMessage(
      'emergencyMessage',
      'There are no affected appointments to reschedule.',
      'error',
    );
    return;
  }
  let moved = 0;
  let notMoved = 0;

  for (const item of emergencyAffected) {
    if (item.result === 'Rescheduled') {
      continue; // already done (button clicked twice)
    }
    let appointment = findById(appointments, item.appointmentId);
    let slot = findNextFreeSlot(appointment, emergencyPeriod);

    if (slot === null) {
      item.result = 'No slot found';
      item.notification = 'Not sent - no slot';
      notMoved++;
      continue;
    }

    // A checked-in patient loses the old token: it belonged to the old date
    if (appointment.status === 'Checked-in') {
      queue = removeQueueFor(appointment.id);
    }


    // Draws the affected list, the three numbers and the summary table
    function renderEmergency() {
      let rows = '';
      let summaryRows = '';
      let done = 0;

      for (const item of emergencyAffected) {
        rows +=
          '<tr>' +
          '<td>' +
          item.patientId +
          '</td>' +
          '<td><strong>' +
          patientName(item.patientId) +
          '</strong></td>' +
          '<td>' +
          item.originalDate +
          '</td>' +
          '<td>' +
          item.originalTime +
          '</td>' +
          "<td><span class='badge " +
          appointmentColor(item.status) +
          "'>" +
          item.status +
          '</span></td>' +
          '</tr>';

        let resultColor = 'orange';
        let newText = '&mdash;';
        if (item.result === 'Rescheduled') {
          resultColor = 'green';
          newText = item.newDate + ' ' + item.newTime;
          done++;
        } else if (item.result === 'No slot found') {
          resultColor = 'red';
        }
        summaryRows +=
          '<tr>' +
          '<td><strong>' +
          patientName(item.patientId) +
          "</strong><br><span class='hint'>" +
          item.patientId +
          ' &middot; ' +
          item.appointmentId +
          '</span></td>' +
          '<td>' +
          item.originalDate +
          ' ' +
          item.originalTime +
          '</td>' +
          '<td>' +
          newText +
          '</td>' +
          "<td><span class='badge " +
          resultColor +
          "'>" +
          item.result +
          '</span></td>' +
          '<td>' +
          item.notification +
          '</td>' +
          '</tr>';
      }

      if (emergencyAffected.length === 0) {
        rows =
          "<tr><td colspan='5' class='empty-row'>No affected appointments.</td></tr>";
        summaryRows =
          "<tr><td colspan='5' class='empty-row'>Nothing to show yet.</td></tr>";
      }

      document.getElementById('emergencyBody').innerHTML = rows;
      document.getElementById('emergencySummaryBody').innerHTML = summaryRows;
      document.getElementById('emergencyCount').innerHTML =
        emergencyPeriod === null
          ? 'Submit the unavailable schedule to see the affected appointments.'
          : 'Total affected appointments: ' + emergencyAffected.length;
      document.getElementById('emgTotal').innerHTML = emergencyAffected.length;
      document.getElementById('emgDone').innerHTML = done;
      document.getElementById('emgPending').innerHTML =
        emergencyAffected.length - done;
      document.getElementById('rescheduleAllButton').disabled =
        emergencyAffected.length - done === 0;
    }

    function resetEmergencyForm() {
      document.getElementById('emergencyForm').reset();
      clearErrors(['emgDoctor', 'emgDate', 'emgStart', 'emgEnd', 'emgReason']);
      emergencyAffected = [];
      emergencyPeriod = null;
      hideMessage('emergencyMessage');
      renderEmergency();
    }

    /* START: runs once when the page has loaded (scripts are at the end of <body>) */
    if (currentUser === null) {
      showAccessDenied('Receptionist');
    } else {
      document.getElementById('welcomeName').innerHTML = currentUser.name;

      fillBookingLists();
      fillEmergencyDoctors();
      showNextPatientId();

      renderCheckin();
      renderQueueTable();
      renderDashboard();
      renderAppointments();
      renderPatients();
      renderNotifications();
      renderProfile();
      renderEmergency();
      showSection('checkinSection');
    }
