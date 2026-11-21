
/* 
   7. DATE HELPERS Dates are kept as text "YYYY-MM-DD", like <input type="date"> gives.Date is a built-in JavaScript object; here we only use it to readtoday's date, count days and find the weekday. */

// Today's date as "YYYY-MM-DD"
function todayString() {
  let now = new Date();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  if (month < 10) {
    month = '0' + month;
  }
  if (day < 10) {
    day = '0' + day;
  }
  return now.getFullYear() + '-' + month + '-' + day;
}

// Number of days from firstDate to secondDate (negative if secondDate is earlier)
function daysBetween(firstDate, secondDate) {
  let oneDay = 1000 * 60 * 60 * 24; // milliseconds in one day
  let difference =
    new Date(secondDate + 'T00:00') - new Date(firstDate + 'T00:00');
  return Math.round(difference / oneDay);
}

// The current date and time as "YYYY-MM-DD HH:MM" (for the activity log)
function nowString() {
  let now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  if (hours < 10) {
    hours = '0' + hours;
  }
  if (minutes < 10) {
    minutes = '0' + minutes;
  }
  return todayString() + ' ' + hours + ':' + minutes;
}

// The weekday of a date text as "Sun", "Mon", ...
function weekdayName(dateText) {
  let names = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return names[new Date(dateText + 'T00:00').getDay()];
}

// true when the doctor sees patients on that date's weekday
function doctorWorksOn(doctor, dateText) {
  return doctor.days.indexOf(weekdayName(dateText)) !== -1;
}

/*8. APPOINTMENT SLOT HELPERS (Receptionist and Patient booking forms) */

// true when the doctor already has an active appointment at that date and time.
// ignoreId is the appointment being edited (it must not conflict with itself).
function isSlotBooked(doctorId, date, time, ignoreId) {
  for (const appointment of appointments) {
    if (
      appointment.doctorId === doctorId &&
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

// Adds one <option> to a <select> (createElement + appendChild)
function addOption(select, value, text) {
  let option = document.createElement('option');
  option.value = value;
  option.text = text;
  select.appendChild(option);
  return option;
}

// Fills a <select> with the time slots; slots that are already booked are
// shown as "(booked)" and cannot be chosen. Keeps the chosen time if possible.
function fillTimeSlots(selectId, doctorId, date, ignoreId) {
  let select = document.getElementById(selectId);
  let oldValue = select.value;

  select.innerHTML = '';
  addOption(select, '', '-- Select time --');

  for (const time of timeSlots) {
    if (
      doctorId !== '' &&
      date !== '' &&
      isSlotBooked(doctorId, date, time, ignoreId)
    ) {
      let option = addOption(select, time, time + ' (booked)');
      option.disabled = true;
    } else {
      addOption(select, time, time);
    }
  }
  select.value = oldValue;
  if (select.value !== oldValue) {
    select.value = ''; // the old time is no longer free
  }
}

/* 12. KEEPING THE QUEUE AND THE APPOINTMENTS IN STEPThe queue array and the appointments array describe the same visit,so when one changes the other must change too. */

function setAppointmentStatus(appointment, newStatus) {
  appointment.status = newStatus;

  let token = null;
  for (const entry of queue) {
    if (entry.appointmentId === appointment.id) {
      token = entry;
    }
  }
  if (token === null) {
    return;
  }

  switch (newStatus) {
    case 'Completed':
      token.status = 'Completed';
      break;
    case 'In Consultation':
      token.status = 'Serving';
      break;
    case 'Cancelled':
      token.status = 'Skipped';
      break;
    case 'Checked-in':
      token.status = 'Waiting';
      break;
  }
}

// Returns a new queue array without the tokens of one appointment
function removeQueueFor(appointmentId) {
  let kept = [];
  for (const entry of queue) {
    if (entry.appointmentId !== appointmentId) {
      kept.push(entry);
    }
  }
  return kept;
}

/*13. BOOKING DATE CHECK (Receptionist and Patient booking forms) Returns "" when the date is fine, otherwise the error message to show. */

function getDateProblem(doctor, date) {
  if (date === '') {
    return 'Please choose a date.';
  }
  if (daysBetween(todayString(), date) < 0) {
    return 'The date cannot be in the past.';
  }
  if (doctorWorksOn(doctor, date) === false) {
    return (
      doctor.name +
      ' does not see patients on ' +
      weekdayName(date) +
      ' (available: ' +
      doctor.days +
      ').'
    );
  }
  return '';
}

// Fills a doctor <select> with the ACTIVE doctors of one department
// (department "" = all departments). Keeps the chosen doctor if still listed.
function fillDoctorSelect(selectId, department) {
  let select = document.getElementById(selectId);
  let oldValue = select.value;

  select.innerHTML = '';
  addOption(select, '', '-- Select doctor --');
  for (const doctor of doctors) {
    if (
      doctor.status === 'Active' &&
      (department === '' || doctor.department === department)
    ) {
      addOption(
        select,
        doctor.id,
        doctor.name + ' (' + doctor.specialization + ')',
      );
    }
  }
  select.value = oldValue;
  if (select.value !== oldValue) {
    select.value = '';
  }
}
