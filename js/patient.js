// OWNER: Saad  |  Patient module  |  only Saad edits this file

// The ids of the sections on this page (used by showSection in common.js)
const sections = [
  'queueSection',
  'doctorsSection',
  'bookingSection',
  'recordSection',
  'notificationsSection',
  'profileSection',
];

// The patient who is logged in (null = wrong role, the page shows "Access denied")
const currentUser = getLoggedInUser('Patient');
const currentPatientId = currentUser === null ? '' : currentUser.patientId;

/* UNIQUE FEATURE 1: SMART DOCTOR FINDER */

// Fill the two filter lists. Each specialization is added once (indexOf check).
function fillFinderFilters() {
  let specializations = [];
  for (const doctor of doctors) {
    if (
      doctor.status === 'Active' &&
      specializations.indexOf(doctor.specialization) === -1
    ) {
      specializations.push(doctor.specialization);
    }
  }
  for (const name of specializations) {
    addOption(document.getElementById('finderSpecialization'), name, name);
  }
  for (const department of departments) {
    addOption(
      document.getElementById('finderDepartment'),
      department.name,
      department.name,
    );
  }
}

// Draws one card for every doctor that matches the search and the two filters
function renderDoctorCards() {
  let keyword = document.getElementById('finderSearch').value;
  let specialization = document.getElementById('finderSpecialization').value;
  let department = document.getElementById('finderDepartment').value;

  let container = document.getElementById('doctorCards');
  let shown = 0;
  container.innerHTML = '';

  for (const doctor of doctors) {
    let matchesName = containsText(doctor.name, keyword);
    let matchesSpecialization =
      specialization === 'All' || doctor.specialization === specialization;
    let matchesDepartment =
      department === 'All' || doctor.department === department;

    if (
      doctor.status === 'Active' &&
      matchesName &&
      matchesSpecialization &&
      matchesDepartment
    ) {
      let card = document.createElement('div');
      card.className = 'doctor-card';
      card.innerHTML =
        '<h4>' +
        doctor.name +
        '</h4>' +
        "<p><span class='badge teal'>" +
        doctor.specialization +
        '</span></p>' +
        '<p><strong>Qualification:</strong> ' +
        doctor.qualification +
        '</p>' +
        '<p><strong>Department:</strong> ' +
        doctor.department +
        '</p>' +
        '<p><strong>Fee:</strong> ' +
        doctor.fee +
        ' Tk</p>' +
        '<p><strong>Available:</strong> ' +
        doctor.days +
        '</p>' +
        "<button type='button' class='btn btn-small btn-secondary' onclick='viewDoctor(\"" +
        doctor.id +
        '")\'>View details</button>' +
        "<button type='button' class='btn btn-small' onclick='startBooking(\"" +
        doctor.id +
        '")\'>Book appointment</button>';
      container.appendChild(card);
      shown++;
    }
  }

  if (shown === 0) {
    container.innerHTML =
      "<p class='empty-row'>No doctors match your search.</p>";
  }
  document.getElementById('finderCount').innerHTML = shown + ' doctor(s) found';
}

// "View details": shows more about one doctor in a box above the cards
function viewDoctor(doctorId) {
  let doctor = findById(doctors, doctorId);
  document.getElementById('doctorDetails').innerHTML =
    "<div class='result-box'>" +
    '<h3>' +
    doctor.name +
    '</h3>' +
    '<p>' +
    doctor.specialization +
    ' &middot; ' +
    doctor.department +
    ' department</p>' +
    '<p><strong>Qualification:</strong> ' +
    doctor.qualification +
    '</p>' +
    '<p><strong>Room:</strong> ' +
    doctor.room +
    ' &middot; <strong>Consultation fee:</strong> ' +
    doctor.fee +
    ' Tk</p>' +
    '<p><strong>Available days:</strong> ' +
    doctor.days +
    '</p>' +
    "<button type='button' class='btn btn-small' onclick='startBooking(\"" +
    doctor.id +
    '")\'>Book appointment</button> ' +
    "<button type='button' class='btn btn-small btn-secondary' onclick='closeDoctorDetails()'>Close</button>" +
    '</div>';
}

function closeDoctorDetails() {
  document.getElementById('doctorDetails').innerHTML = '';
}

// "Book appointment": opens the booking form with this doctor already chosen
function startBooking(doctorId) {
  document.getElementById('bookDoctor').value = doctorId;
  refreshBookingSlots();
  showSection('bookingSection');
  showMessage(
    'bookingMessage',
    'Choose a date and a time to book with ' + doctorName(doctorId) + '.',
    'info',
  );
}

/* MY APPOINTMENTS: BOOK, READ, SEARCH, CANCEL */

// When the doctor or the date changes: show the doctor's days and the free time slots
function refreshBookingSlots() {
  let doctorId = document.getElementById('bookDoctor').value;
  let doctor = findById(doctors, doctorId);

  if (doctor === null) {
    document.getElementById('bookDoctorInfo').innerHTML = '';
  } else {
    document.getElementById('bookDoctorInfo').innerHTML =
      'Available: ' + doctor.days + ' &middot; Fee ' + doctor.fee + ' Tk';
  }
  fillTimeSlots(
    'bookTime',
    doctorId,
    document.getElementById('bookDate').value,
    '',
  );
}

// READ + SEARCH (only this patient's appointments)
function renderMyAppointments() {
  let keyword = document.getElementById('bookingSearch').value;
  let statusFilter = document.getElementById('bookingStatusFilter').value;

  let rows = '';
  let shown = 0;
  let mine = 0;

  for (let i = 0; i < appointments.length; i++) {
    let appointment = appointments[i];
    let isMine = appointment.patientId === currentPatientId;
    if (isMine) {
      mine++;
    }

    let dName = doctorName(appointment.doctorId);
    let matchesKeyword =
      containsText(dName, keyword) ||
      containsText(appointment.reason, keyword) ||
      containsText(appointment.id, keyword);
    let matchesStatus =
      statusFilter === 'All' || appointment.status === statusFilter;

    if (isMine && matchesKeyword && matchesStatus) {
      // Only a Pending appointment can be cancelled by the patient
      let action = '&mdash;';
      if (appointment.status === 'Pending') {
        action =
          "<button type='button' class='btn btn-small btn-danger' onclick='cancelMyAppointment(" +
          i +
          ")'>Cancel</button>";
      }

      rows +=
        '<tr>' +
        '<td>' +
        appointment.id +
        '</td>' +
        '<td><strong>' +
        dName +
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
        action +
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
    'Showing ' + shown + ' of ' + mine + ' appointments';
}

// CREATE: runs when the booking form is submitted
function saveBooking() {
  let doctorId = document.getElementById('bookDoctor').value;
  let date = document.getElementById('bookDate').value;
  let time = document.getElementById('bookTime').value;
  let reason = document.getElementById('bookReason').value.trim();

  // ----- Validation -----
  let isValid = true;
  clearErrors(['bookDoctor', 'bookDate', 'bookTime', 'bookReason']);

  let doctor = findById(doctors, doctorId);
  if (doctor === null) {
    showError('bookDoctor', 'Please choose a doctor.');
    isValid = false;
  } else {
    let problem = getDateProblem(doctor, date);
    if (problem !== '') {
      showError('bookDate', problem);
      isValid = false;
    }
  }

  if (time === '') {
    showError('bookTime', 'Please choose a free time.');
    isValid = false;
  } else if (doctor !== null && isSlotBooked(doctorId, date, time, '')) {
    // The same doctor cannot have two appointments at the same date and time
    showError(
      'bookTime',
      'This time is already booked. Please choose another one.',
    );
    isValid = false;
  } else if (hasOwnAppointmentAt(date, time)) {
    showError(
      'bookTime',
      'You already have another appointment at that date and time.',
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

  // ----- Save: build an object and push() it. A booked appointment starts as Pending. -----
  let newAppointment = {
    id: nextId('A', appointments),
    patientId: currentPatientId,
    doctorId: doctorId,
    department: doctor.department,
    date: date,
    time: time,
    reason: reason,
    status: 'Pending',
  };
  appointments.push(newAppointment);

  addLog(
    'Appointment',
    'Patient ' + currentUser.name + ' booked appointment ' + newAppointment.id,
  );
  addNotification(
    currentUser.id,
    'Appointment',
    'Your appointment ' +
      newAppointment.id +
      ' with ' +
      doctor.name +
      ' on ' +
      date +
      ' at ' +
      time +
      ' is booked (Pending).',
  );
  addNotification(
    doctor.userId,
    'Appointment',
    'New appointment ' +
      newAppointment.id +
      ' on ' +
      date +
      ' at ' +
      time +
      ' (' +
      currentUser.name +
      ').',
  );

  resetBookingForm();
  renderMyAppointments();
  renderDashboard();
  renderNotifications();
  showMessage(
    'bookingMessage',
    'Appointment <strong>' +
      newAppointment.id +
      '</strong> was booked with ' +
      doctor.name +
      ' on ' +
      date +
      ' at ' +
      time +
      '. Status: Pending.',
    'success',
  );
  return false;
}

// true when this patient already has an active appointment at the same date and time
function hasOwnAppointmentAt(date, time) {
  for (const appointment of appointments) {
    if (
      appointment.patientId === currentPatientId &&
      appointment.date === date &&
      appointment.time === time &&
      appointment.status !== 'Cancelled'
    ) {
      return true;
    }
  }
  return false;
}

function cancelMyAppointment(index) {
  let appointment = appointments[index];
  if (confirm('Cancel appointment ' + appointment.id + '?')) {
    setAppointmentStatus(appointment, 'Cancelled');
    addLog(
      'Appointment',
      'Patient ' +
        currentUser.name +
        ' cancelled appointment ' +
        appointment.id,
    );
    addNotification(
      accountOfDoctor(appointment.doctorId),
      'Appointment',
      'Appointment ' +
        appointment.id +
        ' on ' +
        appointment.date +
        ' was cancelled by the patient.',
    );
    renderMyAppointments();
    renderQueueTracker();
    renderDashboard();
    showMessage(
      'bookingMessage',
      'Appointment ' + appointment.id + ' was cancelled.',
      'info',
    );
  }
}

function resetBookingForm() {
  document.getElementById('bookingForm').reset();
  clearErrors(['bookDoctor', 'bookDate', 'bookTime', 'bookReason']);
  refreshBookingSlots();
}

/* UNIQUE FEATURE 2: LIVE QUEUE TRACKE */
function renderQueueTracker() {
  let today = todayString();
  let list = document.getElementById('trackerList');
  let found = 0;
  list.innerHTML = '';

  for (const appointment of appointments) {
    if (
      appointment.patientId === currentPatientId &&
      appointment.date === today &&
      appointment.status !== 'Cancelled'
    ) {
      found++;

      let doctor = findById(doctors, appointment.doctorId);
      let myToken = null; // my queue entry (null = not checked in yet)
      for (const entry of queue) {
        if (entry.appointmentId === appointment.id) {
          myToken = entry;
        }
      }

      let box = document.createElement('div');
      box.className = 'result-box';
      let html =
        '<h3>' +
        doctor.name +
        ' &middot; ' +
        doctor.room +
        '</h3>' +
        '<p>Appointment ' +
        appointment.id +
        ' at ' +
        appointment.time +
        ' &middot; Status: ' +
        "<span class='badge " +
        appointmentColor(appointment.status) +
        "'>" +
        appointment.status +
        '</span></p>';

      if (myToken === null) {
        html +=
          '<p>You have not checked in yet. Please go to the reception desk to get your token.</p>';
      } else {
        // Count the patients ahead and find the token that is being served
        let ahead = 0;
        let servingText = 'nobody yet';
        for (const entry of queue) {
          if (
            entry.doctorId === myToken.doctorId &&
            entry.date === myToken.date
          ) {
            if (entry.status === 'Serving') {
              servingText = 'token ' + entry.token;
            }
            if (
              (entry.status === 'Waiting' || entry.status === 'Serving') &&
              entry.token < myToken.token
            ) {
              ahead++;
            }
          }
        }

        html +=
          "<div class='stats-grid'>" +
          "<div><div class='hint'>My token</div><div class='big'>" +
          myToken.token +
          '</div></div>' +
          "<div><div class='hint'>Currently serving</div><div class='big'>" +
          servingText.replace('token ', '') +
          '</div></div>' +
          "<div><div class='hint'>Patients ahead</div><div class='big'>" +
          ahead +
          '</div></div>' +
          '</div>';

        // The message depends on my token's status
        switch (myToken.status) {
          case 'Waiting':
            html +=
              '<p><strong>Estimated waiting time: about ' +
              ahead * hospitalRules.minutesPerPatient +
              ' minutes.</strong> ' +
              "<span class='hint'>(Estimate only: " +
              ahead +
              ' patient(s) ahead x ' +
              hospitalRules.minutesPerPatient +
              ' minutes each. The real time can be different.)</span></p>';
            break;
          case 'Serving':
            html +=
              '<p><strong>It is your turn now. Please go in to ' +
              doctor.name +
              '.</strong></p>';
            break;
          case 'Completed':
            html += '<p>Your visit is completed. Thank you!</p>';
            break;
          default:
            html +=
              '<p>Your token was skipped. Please ask at the reception desk.</p>';
        }
      }

      box.innerHTML = html;
      list.appendChild(box);
    }
  }

  if (found === 0) {
    list.innerHTML = "<p class='empty-row'>You have no appointment today.</p>";
  }
}

/* UNIQUE FEATURE 3: PERSONAL HEALTH RECORD */
function renderHealthRecord() {
  let today = todayString();

  // Newest first. Each list below only gets records of MY patient id.
  let history = []; // diagnoses
  let labs = []; // lab reports
  let followUps = []; // follow-up dates
  let myPrescriptions = [];
  let previous = []; // completed appointments

  for (const record of medicalRecords) {
    if (record.patientId === currentPatientId) {
      if (record.type === 'Diagnosis') {
        history.push(record);
      } else if (record.type === 'Lab Report') {
        labs.push(record);
      } else if (record.type === 'Follow-up') {
        followUps.push({
          date: record.date,
          doctorId: record.doctorId,
          note: record.title,
        });
      }
    }
  }
  for (const rx of prescriptions) {
    if (rx.patientId === currentPatientId) {
      myPrescriptions.push(rx);
      if (rx.followUp !== '') {
        followUps.push({
          date: rx.followUp,
          doctorId: rx.doctorId,
          note: 'Advised in prescription ' + rx.id,
        });
      }
    }
  }
  for (const appointment of appointments) {
    if (
      appointment.patientId === currentPatientId &&
      appointment.status === 'Completed'
    ) {
      previous.push(appointment);
    }
  }

  sortByDate(history, true);
  sortByDate(labs, true);
  sortByDate(followUps, true);
  sortByDate(myPrescriptions, true);
  sortByDate(previous, true);

  // ----- Medical history -----
  let rows = '';
  for (const record of history) {
    rows +=
      '<tr><td>' +
      record.date +
      '</td><td><strong>' +
      record.title +
      '</strong></td><td>' +
      doctorName(record.doctorId) +
      '</td><td>' +
      record.details +
      '</td></tr>';
  }
  document.getElementById('historyBody').innerHTML =
    rows === '' ? emptyRow(4, 'No medical history yet.') : rows;

  // ----- Prescriptions -----
  rows = '';
  for (const rx of myPrescriptions) {
    rows +=
      '<tr><td>' +
      rx.date +
      '</td><td>' +
      doctorName(rx.doctorId) +
      '</td>' +
      '<td><strong>' +
      rx.medicine +
      '</strong> ' +
      rx.dosage +
      '</td>' +
      '<td>' +
      rx.frequency +
      ' for ' +
      rx.duration +
      '</td>' +
      '<td>' +
      rx.instructions +
      '</td><td>' +
      rx.tests +
      '</td></tr>';
  }
  document.getElementById('prescriptionBody').innerHTML =
    rows === '' ? emptyRow(6, 'No prescriptions yet.') : rows;

  // ----- Laboratory reports -----
  rows = '';
  for (const record of labs) {
    rows +=
      '<tr><td>' +
      record.date +
      '</td><td><strong>' +
      record.title +
      '</strong></td><td>' +
      record.details +
      '</td></tr>';
  }
  document.getElementById('labBody').innerHTML =
    rows === '' ? emptyRow(3, 'No laboratory reports yet.') : rows;

  // ----- Follow-up dates (upcoming ones are marked) -----
  rows = '';
  for (const item of followUps) {
    let mark =
      item.date >= today ? " <span class='badge orange'>Upcoming</span>" : '';
    rows +=
      '<tr><td>' +
      item.date +
      mark +
      '</td><td>' +
      doctorName(item.doctorId) +
      '</td><td>' +
      item.note +
      '</td></tr>';
  }
  document.getElementById('followBody').innerHTML =
    rows === '' ? emptyRow(3, 'No follow-up visits.') : rows;

  // ----- Previous appointments -----
  rows = '';
  for (const appointment of previous) {
    rows +=
      '<tr><td>' +
      appointment.date +
      '</td><td>' +
      appointment.time +
      '</td><td>' +
      doctorName(appointment.doctorId) +
      '</td><td>' +
      appointment.reason +
      '</td></tr>';
  }
  document.getElementById('previousBody').innerHTML =
    rows === '' ? emptyRow(4, 'No previous appointments.') : rows;

  document.getElementById('recordSubtitle').innerHTML =
    'Record of ' +
    patientName(currentPatientId) +
    ' (' +
    currentPatientId +
    '). Only you can see this page.';
}

// A table row that says there is nothing to show
function emptyRow(columns, text) {
  return (
    "<tr><td colspan='" + columns + "' class='empty-row'>" + text + '</td></tr>'
  );
}

/* DASHBOARD STATISTICS (counted from the arrays) */
function renderDashboard() {
  let today = todayString();
  let activeDoctors = 0;
  let upcoming = 0;
  let myRx = 0;
  let myLabs = 0;

  for (const doctor of doctors) {
    if (doctor.status === 'Active') {
      activeDoctors++;
    }
  }
  for (const appointment of appointments) {
    if (
      appointment.patientId === currentPatientId &&
      appointment.date >= today &&
      appointment.status !== 'Cancelled' &&
      appointment.status !== 'Completed'
    ) {
      upcoming++;
    }
  }
  for (const rx of prescriptions) {
    if (rx.patientId === currentPatientId) {
      myRx++;
    }
  }
  for (const record of medicalRecords) {
    if (record.patientId === currentPatientId && record.type === 'Lab Report') {
      myLabs++;
    }
  }

  document.getElementById('dashDoctors').innerHTML = activeDoctors;
  document.getElementById('dashUpcoming').innerHTML = upcoming;
  document.getElementById('dashPrescriptions').innerHTML = myRx;
  document.getElementById('dashLabs').innerHTML = myLabs;
}

/* START: runs once when the page has loaded (scripts are at the end of <body>) */
if (currentUser === null) {
  showAccessDenied('Patient');
} else {
  document.getElementById('welcomeName').innerHTML = currentUser.name;

  // Fill the doctor list of the booking form with ACTIVE doctors
  fillDoctorSelect('bookDoctor', '');
  fillFinderFilters();

  renderDashboard();
  renderQueueTracker();
  renderDoctorCards();
  renderMyAppointments();
  renderHealthRecord();
  renderNotifications();
  renderProfile();
  refreshBookingSlots();
  showSection('queueSection');
}
