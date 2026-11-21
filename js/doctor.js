// OWNER: Alif  |  Doctor module  |  only Alif edits this file

const sections = [
  'queueSection',
  'appointmentsSection',
  'prescriptionSection',
  'timelineSection',
  'notificationsSection',
  'profileSection',
];

// The doctor who is logged in (null = wrong role, the page shows "Access denied")
const currentUser = getLoggedInUser('Doctor');
const currentDoctorId = currentUser === null ? '' : currentUser.doctorId;

/* HELPERS FOR THIS PAGE */

// Returns an array with the queue tokens of this doctor for today
function getMyQueueToday() {
  let today = todayString();
  let mine = [];
  for (const entry of queue) {
    if (entry.doctorId === currentDoctorId && entry.date === today) {
      mine.push(entry);
    }
  }
  return mine;
}

// Returns an array with the patients who have a (not cancelled) appointment with this doctor
function getMyPatients() {
  let ids = [];
  let mine = [];
  for (const appointment of appointments) {
    if (
      appointment.doctorId === currentDoctorId &&
      appointment.status !== 'Cancelled'
    ) {
      if (ids.indexOf(appointment.patientId) === -1) {
        ids.push(appointment.patientId);
        let patient = findById(patients, appointment.patientId);
        if (patient !== null) {
          mine.push(patient);
        }
      }
    }
  }
  return mine;
}

// Puts "Id - Name" options for my patients into a <select>
function fillPatientSelect(selectId) {
  let select = document.getElementById(selectId);
  let oldValue = select.value;
  select.innerHTML = '';
  addOption(select, '', '-- Select patient --');
  for (const patient of getMyPatients()) {
    addOption(select, patient.id, patient.id + ' - ' + patient.name);
  }
  select.value = oldValue;
}

/* UNIQUE FEATURE 1: SMART PATIENT QUEUE*/

// Returns the token that is being served now, or null
function findServing(myQueue) {
  for (const entry of myQueue) {
    if (entry.status === 'Serving') {
      return entry;
    }
  }
  return null;
}

// Returns the waiting token with the smallest number, or null
function findNextWaiting(myQueue) {
  let next = null;
  for (const entry of myQueue) {
    if (entry.status === 'Waiting') {
      if (next === null || entry.token < next.token) {
        next = entry;
      }
    }
  }
  return next;
}

function renderQueue() {
  let today = todayString();
  let myQueue = getMyQueueToday();
  let serving = findServing(myQueue);
  let next = findNextWaiting(myQueue);

  let waiting = 0;
  for (const entry of myQueue) {
    if (entry.status === 'Waiting') {
      waiting++;
    }
  }

  //The three boxes at the top
  if (serving !== null) {
    document.getElementById('servingToken').innerHTML = serving.token;
    document.getElementById('servingName').innerHTML = patientName(
      serving.patientId,
    );
  } else {
    document.getElementById('servingToken').innerHTML = '-';
    document.getElementById('servingName').innerHTML = 'Nobody';
  }
  if (next !== null) {
    document.getElementById('nextToken').innerHTML = next.token;
    document.getElementById('nextName').innerHTML = patientName(next.patientId);
  } else {
    document.getElementById('nextToken').innerHTML = '-';
    document.getElementById('nextName').innerHTML = 'Nobody';
  }
  document.getElementById('waitingCount').innerHTML = waiting;

  // The queue table
  let rows = '';
  for (const entry of myQueue) {
    let appointment = findById(appointments, entry.appointmentId);
    let color;
    switch (entry.status) {
      case 'Serving':
        color = 'teal';
        break;
      case 'Completed':
        color = 'green';
        break;
      case 'Skipped':
        color = 'grey';
        break;
      default:
        color = 'orange';
    }

    // A waiting or skipped patient can be called directly
    let action = '&mdash;';
    if (entry.status === 'Waiting' || entry.status === 'Skipped') {
      action =
        "<button type='button' class='btn btn-small' onclick='callToken(" +
        findIndexById(queue, entry.id) +
        ")'>Call</button>";
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
      appointment.time +
      '</td>' +
      "<td><span class='badge " +
      color +
      "'>" +
      entry.status +
      '</span></td>' +
      '<td>' +
      action +
      '</td>' +
      '</tr>';
  }
  if (rows === '') {
    rows =
      "<tr><td colspan='5' class='empty-row'>Nobody has checked in yet today.</td></tr>";
  }
  document.getElementById('queueBody').innerHTML = rows;

  // Dashboard statistics (counted from the arrays)
  let todayCount = 0;
  let completedCount = 0;
  for (const appointment of appointments) {
    if (
      appointment.doctorId === currentDoctorId &&
      appointment.date === today &&
      appointment.status !== 'Cancelled'
    ) {
      todayCount++;
      if (appointment.status === 'Completed') {
        completedCount++;
      }
    }
  }
  document.getElementById('dashToday').innerHTML = todayCount;
  document.getElementById('dashWaiting').innerHTML = waiting;
  document.getElementById('dashCompleted').innerHTML = completedCount;
  document.getElementById('dashPatients').innerHTML = getMyPatients().length;

  let doctor = findById(doctors, currentDoctorId);
  document.getElementById('queueSubtitle').innerHTML =
    doctor.name + ' &middot; ' + doctor.room + ' &middot; ' + today;
}

// Starts serving one token: the patient is now in consultation
function startServing(entry) {
  let appointment = findById(appointments, entry.appointmentId);
  setAppointmentStatus(appointment, 'In Consultation');
  addNotification(
    accountOfPatient(entry.patientId),
    'Queue',
    'Your token ' +
      entry.token +
      ' is being served now. Please go to ' +
      findById(doctors, currentDoctorId).room +
      '.',
  );
  addLog(
    'Appointment',
    'Token ' +
      entry.token +
      ' (' +
      patientName(entry.patientId) +
      ') is being served',
  );
}

// Button "Call Next Patient": finish the current patient (if any), then call the next one
function callNextPatient() {
  let myQueue = getMyQueueToday();
  let current = findServing(myQueue);

  if (current !== null) {
    setAppointmentStatus(
      findById(appointments, current.appointmentId),
      'Completed',
    );
  }

  let next = findNextWaiting(myQueue);
  if (next === null) {
    renderQueue();
    renderAppointments();
    showMessage('queueMessage', 'No patients are waiting right now.', 'info');
    return;
  }

  startServing(next);
  renderQueue();
  renderAppointments();
  showMessage(
    'queueMessage',
    'Now serving token ' +
      next.token +
      ': ' +
      patientName(next.patientId) +
      '.',
    'success',
  );
}

// Button "Mark Current as Completed"
function completeCurrent() {
  let current = findServing(getMyQueueToday());
  if (current === null) {
    showMessage(
      'queueMessage',
      'Nobody is being served at the moment.',
      'error',
    );
    return;
  }
  setAppointmentStatus(
    findById(appointments, current.appointmentId),
    'Completed',
  );
  addLog(
    'Appointment',
    'Token ' +
      current.token +
      ' (' +
      patientName(current.patientId) +
      ') was completed',
  );
  renderQueue();
  renderAppointments();
  showMessage(
    'queueMessage',
    'Token ' + current.token + ' is completed.',
    'success',
  );
}

// Button "Skip Current": the patient goes back to waiting later (status Skipped)
function skipCurrent() {
  let current = findServing(getMyQueueToday());
  if (current === null) {
    showMessage(
      'queueMessage',
      'Nobody is being served at the moment.',
      'error',
    );
    return;
  }
  current.status = 'Skipped';
  findById(appointments, current.appointmentId).status = 'Checked-in';
  addNotification(
    accountOfPatient(current.patientId),
    'Queue',
    'Your token ' + current.token + ' was skipped. Please ask at reception.',
  );
  renderQueue();
  renderAppointments();
  showMessage(
    'queueMessage',
    'Token ' + current.token + ' was skipped.',
    'info',
  );
}

// The "Call" button of one row
function callToken(queueIndex) {
  if (findServing(getMyQueueToday()) !== null) {
    showMessage(
      'queueMessage',
      'Finish or skip the current patient first.',
      'error',
    );
    return;
  }
  let entry = queue[queueIndex];
  startServing(entry);
  renderQueue();
  renderAppointments();
  showMessage(
    'queueMessage',
    'Now serving token ' +
      entry.token +
      ': ' +
      patientName(entry.patientId) +
      '.',
    'success',
  );
}

/* MY APPOINTMENTS: READ, SEARCH, UPDATE STATUS */
function renderAppointments() {
  let keyword = document.getElementById('appointmentSearch').value;
  let statusFilter = document.getElementById('appointmentStatusFilter').value;

  let rows = '';
  let shown = 0;
  let mine = 0;

  for (let i = 0; i < appointments.length; i++) {
    let appointment = appointments[i];
    let isMine = appointment.doctorId === currentDoctorId;
    appointments;
    if (isMine) {
      mine++;
    }

    let pName = patientName(appointment.patientId);
    let matchesKeyword =
      containsText(pName, keyword) ||
      containsText(appointment.reason, keyword) ||
      containsText(appointment.id, keyword);
    let matchesStatus =
      statusFilter === 'All' || appointment.status === statusFilter;

    if (isMine && matchesKeyword && matchesStatus) {
      let actions = '&mdash;';
      if (
        appointment.status !== 'Completed' &&
        appointment.status !== 'Cancelled'
      ) {
        actions =
          "<button type='button' class='btn btn-small btn-success' onclick='changeAppointment(" +
          i +
          ', "Completed")\'>Complete</button>' +
          "<button type='button' class='btn btn-small btn-secondary' onclick='changeAppointment(" +
          i +
          ', "Cancelled")\'>Cancel</button>';
      }

      rows +=
        '<tr>' +
        '<td>' +
        appointment.id +
        '</td>' +
        '<td><strong>' +
        pName +
        '</strong></td>' +
        '<td>' +
        appointment.date +
        '</td>' +
        '<td>' +
        appointment.time +
        '</td>' +
        '<td>' +
        appointment.reason +
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
  document.getElementById('appointmentBody').innerHTML = rows;
  document.getElementById('appointmentCount').innerHTML =
    'Showing ' + shown + ' of ' + mine + ' appointments';
}

function changeAppointment(index, newStatus) {
  let appointment = appointments[index];
  setAppointmentStatus(appointment, newStatus); // also updates the queue token
  addLog(
    'Appointment',
    'Appointment ' + appointment.id + ' set to ' + newStatus,
  );
  addNotification(
    accountOfPatient(appointment.patientId),
    'Appointment',
    'Your appointment ' +
      appointment.id +
      ' on ' +
      appointment.date +
      ' is now ' +
      newStatus +
      '.',
  );
  renderAppointments();
  renderQueue();
  showMessage(
    'appointmentMessage',
    'Appointment ' + appointment.id + ' is now ' + newStatus + '.',
    'success',
  );
}

//  Schedule a follow-up visit (CREATE an appointment)

// When the date changes, show which time slots are still free
function refreshFollowSlots() {
  fillTimeSlots(
    'followTime',
    currentDoctorId,
    document.getElementById('followDate').value,
    '',
  );
}

function saveFollowUp() {
  let patientId = document.getElementById('followPatient').value;
  let date = document.getElementById('followDate').value;
  let time = document.getElementById('followTime').value;
  let note = document.getElementById('followNote').value.trim();
  let doctor = findById(doctors, currentDoctorId);

  let isValid = true;
  clearErrors(['followPatient', 'followDate', 'followTime', 'followNote']);

  if (patientId === '') {
    showError('followPatient', 'Please choose a patient.');
    isValid = false;
  }

  if (date === '') {
    showError('followDate', 'Please choose a date.');
    isValid = false;
  } else if (daysBetween(todayString(), date) < 1) {
    showError('followDate', 'The follow-up must be on a future date.');
    isValid = false;
  } else if (doctorWorksOn(doctor, date) === false) {
    showError(
      'followDate',
      'You do not see patients on ' +
        weekdayName(date) +
        ' (your days: ' +
        doctor.days +
        ').',
    );
    isValid = false;
  }

  if (time === '') {
    showError('followTime', 'Please choose a free time.');
    isValid = false;
  } else if (isSlotBooked(currentDoctorId, date, time, '')) {
    showError('followTime', 'This time is already booked.');
    isValid = false;
  }

  if (note.length < 3) {
    showError('followNote', 'Please write a short note.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  let newAppointment = {
    id: nextId('A', appointments),
    patientId: patientId,
    doctorId: currentDoctorId,
    department: doctor.department,
    date: date,
    time: time,
    reason: 'Follow-up: ' + note,
    status: 'Pending',
  };
  appointments.push(newAppointment);

  // A follow-up record, so it also appears in the medical timeline
  medicalRecords.push({
    id: nextId('MR', medicalRecords),
    patientId: patientId,
    doctorId: currentDoctorId,
    date: date,
    type: 'Follow-up',
    title: 'Follow-up: ' + note,
    details:
      'Scheduled follow-up visit with ' + doctor.name + ' at ' + time + '.',
  });

  addNotification(
    accountOfPatient(patientId),
    'Appointment',
    'A follow-up visit was booked for you on ' +
      date +
      ' at ' +
      time +
      ' with ' +
      doctor.name +
      '.',
  );
  addLog(
    'Appointment',
    'Follow-up ' +
      newAppointment.id +
      ' scheduled for ' +
      patientName(patientId),
  );

  document.getElementById('followForm').reset();
  refreshFollowSlots();
  renderAppointments();
  renderQueue();
  showMessage(
    'appointmentMessage',
    'Follow-up ' +
      newAppointment.id +
      ' was scheduled for ' +
      patientName(patientId) +
      ' on ' +
      date +
      ' at ' +
      time +
      '.',
    'success',
  );
  return false;
}

/*UNIQUE FEATURE 2: DIGITAL PRESCRIPTION BUILDER */

// The text of one prescription as a "paper" box
function prescriptionHtml(rx) {
  let followUp = rx.followUp === '' ? 'None' : rx.followUp;
  return (
    "<div class='prescription-paper'>" +
    '<h4>Prescription ' +
    rx.id +
    '</h4>' +
    "<p class='hint'>" +
    rx.date +
    ' &middot; ' +
    doctorName(rx.doctorId) +
    '</p>' +
    '<p><strong>Patient:</strong> ' +
    patientName(rx.patientId) +
    ' (' +
    rx.patientId +
    ')</p>' +
    '<p><strong>Diagnosis:</strong> ' +
    rx.diagnosis +
    '</p>' +
    '<p><strong>Medicine:</strong> ' +
    rx.medicine +
    ' &middot; ' +
    rx.dosage +
    ' &middot; ' +
    rx.frequency +
    ' &middot; for ' +
    rx.duration +
    '</p>' +
    '<p><strong>Instructions:</strong> ' +
    rx.instructions +
    '</p>' +
    '<p><strong>Recommended tests:</strong> ' +
    rx.tests +
    '</p>' +
    '<p><strong>Follow-up date:</strong> ' +
    followUp +
    '</p>' +
    '</div>'
  );
}

function renderPrescriptions() {
  let keyword = document.getElementById('rxSearch').value;
  let rows = '';
  let shown = 0;
  let mine = 0;

  for (let i = 0; i < prescriptions.length; i++) {
    let rx = prescriptions[i];
    let isMine = rx.doctorId === currentDoctorId;
    if (isMine) {
      mine++;
    }
    let matches =
      containsText(patientName(rx.patientId), keyword) ||
      containsText(rx.medicine, keyword) ||
      containsText(rx.diagnosis, keyword);

    if (isMine && matches) {
      rows +=
        '<tr>' +
        '<td>' +
        rx.id +
        '</td>' +
        '<td>' +
        rx.date +
        '</td>' +
        '<td>' +
        patientName(rx.patientId) +
        '</td>' +
        '<td>' +
        rx.diagnosis +
        '</td>' +
        '<td>' +
        rx.medicine +
        ' ' +
        rx.dosage +
        '</td>' +
        '<td>' +
        (rx.followUp === '' ? '&mdash;' : rx.followUp) +
        '</td>' +
        '<td>' +
        "<button type='button' class='btn btn-small' onclick='previewPrescription(" +
        i +
        ")'>Preview</button>" +
        "<button type='button' class='btn btn-small btn-danger' onclick='deletePrescription(" +
        i +
        ")'>Delete</button>" +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='7' class='empty-row'>No prescriptions found.</td></tr>";
  }
  document.getElementById('rxBody').innerHTML = rows;
  document.getElementById('rxCount').innerHTML =
    'Showing ' + shown + ' of ' + mine + ' prescriptions';
}

function previewPrescription(index) {
  document.getElementById('rxPreview').innerHTML = prescriptionHtml(
    prescriptions[index],
  );
}

// CREATE: runs when the prescription form is submitted
function savePrescription() {
  let patientId = document.getElementById('rxPatient').value;
  let diagnosis = document.getElementById('rxDiagnosis').value.trim();
  let medicine = document.getElementById('rxMedicine').value.trim();
  let dosage = document.getElementById('rxDosage').value.trim();
  let frequency = document.getElementById('rxFrequency').value;
  let duration = document.getElementById('rxDuration').value.trim();
  let instructions = document.getElementById('rxInstructions').value.trim();
  let tests = document.getElementById('rxTests').value.trim();
  let followUp = document.getElementById('rxFollowUp').value;

  // ----- Validation -----
  let isValid = true;
  clearErrors([
    'rxPatient',
    'rxDiagnosis',
    'rxMedicine',
    'rxDosage',
    'rxFrequency',
    'rxDuration',
    'rxInstructions',
    'rxFollowUp',
  ]);

  if (patientId === '') {
    showError('rxPatient', 'Please choose a patient.');
    isValid = false;
  }
  if (diagnosis.length < 3) {
    showError('rxDiagnosis', 'Please enter the diagnosis.');
    isValid = false;
  }
  if (medicine.length < 2) {
    showError('rxMedicine', 'Please enter the medicine name.');
    isValid = false;
  }
  if (isEmpty(dosage)) {
    showError('rxDosage', 'Please enter the dosage.');
    isValid = false;
  }
  if (frequency === '') {
    showError('rxFrequency', 'Please choose how often.');
    isValid = false;
  }
  if (isEmpty(duration)) {
    showError('rxDuration', 'Please enter the duration.');
    isValid = false;
  }
  if (instructions.length < 3) {
    showError('rxInstructions', 'Please write the instructions.');
    isValid = false;
  }
  if (followUp !== '' && daysBetween(todayString(), followUp) < 1) {
    showError('rxFollowUp', 'The follow-up date must be in the future.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  // Save: build an object and push() it
  if (tests === '') {
    tests = 'None';
  }
  let newPrescription = {
    id: nextId('RX', prescriptions),
    patientId: patientId,
    doctorId: currentDoctorId,
    date: todayString(),
    diagnosis: diagnosis,
    medicine: medicine,
    dosage: dosage,
    frequency: frequency,
    duration: duration,
    instructions: instructions,
    tests: tests,
    followUp: followUp,
  };
  prescriptions.push(newPrescription);
  addLog(
    'Prescription',
    'Prescription ' +
      newPrescription.id +
      ' was written for ' +
      patientName(patientId),
  );
  addNotification(
    accountOfPatient(patientId),
    'Prescription',
    'A new prescription was added to your health record by ' +
      doctorName(currentDoctorId) +
      '.',
  );

  document.getElementById('rxPreview').innerHTML =
    prescriptionHtml(newPrescription);
  resetPrescriptionForm();
  renderPrescriptions();
  renderTimeline();
  showMessage(
    'rxMessage',
    'Prescription ' + newPrescription.id + ' was added.',
    'success',
  );
  return false;
}

function resetPrescriptionForm() {
  document.getElementById('rxForm').reset();
  clearErrors([
    'rxPatient',
    'rxDiagnosis',
    'rxMedicine',
    'rxDosage',
    'rxFrequency',
    'rxDuration',
    'rxInstructions',
    'rxFollowUp',
  ]);
}

function deletePrescription(index) {
  let rx = prescriptions[index];
  if (confirm('Delete prescription ' + rx.id + '?')) {
    prescriptions = removeAt(prescriptions, index);
    addLog('Prescription', 'Prescription ' + rx.id + ' was deleted');
    document.getElementById('rxPreview').innerHTML =
      "<p class='empty-row'>Add or choose a prescription to preview it here.</p>";
    renderPrescriptions();
    renderTimeline();
    showMessage('rxMessage', 'Prescription ' + rx.id + ' was deleted.', 'info');
  }
}

/* UNIQUE FEATURE 3: PATIENT MEDICAL TIMELINE */
function renderTimeline() {
  let patientId = document.getElementById('timelinePatient').value;
  let box = document.getElementById('timelineList');
  box.innerHTML = '';

  if (patientId === '') {
    document.getElementById('timelineSummary').innerHTML = '';
    box.innerHTML =
      "<p class='empty-row'>Choose a patient to see the timeline.</p>";
    return;
  }

  let items = [];

  // 1. Previous (completed) appointments
  for (const appointment of appointments) {
    if (
      appointment.patientId === patientId &&
      appointment.status === 'Completed'
    ) {
      items.push({
        date: appointment.date,
        type: 'Appointment',
        color: 'blue',
        title: 'Appointment with ' + doctorName(appointment.doctorId),
        details:
          'Reason: ' + appointment.reason + ' (' + appointment.time + ')',
      });
    }
  }

  // 2. Diagnoses, lab reports and follow-up visits
  for (const record of medicalRecords) {
    if (record.patientId === patientId) {
      let color = 'teal';
      if (record.type === 'Lab Report') {
        color = 'orange';
      } else if (record.type === 'Follow-up') {
        color = 'grey';
      }
      items.push({
        date: record.date,
        type: record.type,
        color: color,
        title: record.title + ' (' + doctorName(record.doctorId) + ')',
        details: record.details,
      });
    }
  }

  // 3. Prescriptions
  for (const rx of prescriptions) {
    if (rx.patientId === patientId) {
      items.push({
        date: rx.date,
        type: 'Prescription',
        color: 'green',
        title:
          rx.medicine + ' ' + rx.dosage + ' (' + doctorName(rx.doctorId) + ')',
        details:
          'Diagnosis: ' +
          rx.diagnosis +
          '. ' +
          rx.frequency +
          ' for ' +
          rx.duration +
          '. ' +
          rx.instructions,
      });
    }
  }

  sortByDate(items, false); // oldest first

  let today = todayString();
  for (const item of items) {
    let upcoming =
      item.date > today ? " <span class='badge grey'>Upcoming</span>" : '';
    let element = document.createElement('div');
    element.className = 'timeline-item';
    element.innerHTML =
      "<span class='log-time'>" +
      item.date +
      '</span>' +
      upcoming +
      '<br>' +
      "<span class='badge " +
      item.color +
      "'>" +
      item.type +
      '</span> <strong>' +
      item.title +
      '</strong>' +
      '<p>' +
      item.details +
      '</p>';
    box.appendChild(element);
  }

  if (items.length === 0) {
    box.innerHTML = "<p class='empty-row'>No records for this patient yet.</p>";
  }
  document.getElementById('timelineSummary').innerHTML =
    items.length + ' event(s) for ' + patientName(patientId);
}

/* START: runs once when the page has loaded (scripts are at the end of <body>) */

if (currentUser === null) {
  showAccessDenied('Doctor');
} else {
  document.getElementById('welcomeName').innerHTML = currentUser.name;

  fillPatientSelect('followPatient');
  fillPatientSelect('rxPatient');
  fillPatientSelect('timelinePatient');
  refreshFollowSlots();

  renderQueue();
  renderAppointments();
  renderPrescriptions();
  renderTimeline();
  renderNotifications();
  renderProfile();
  showSection('queueSection');
}
