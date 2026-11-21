// OWNER: Shohan  |  Admin module  |  only Shohan edits this file

// The ids of the sections on this page (used by showSection in common.js)
const sections = [
  'statsSection',
  'workloadSection',
  'medicineSection',
  'doctorsSection',
  'patientsSection',
  'appointmentsSection',
  'activitySection',
  'notificationsSection',
  'profileSection',
];

// The admin who is logged in (null = wrong role, the page shows "Access denied")
const currentUser = getLoggedInUser('Admin');

// -1 means "adding something new"; any other number is the index being edited
let editMedicineIndex = -1;
let editDoctorIndex = -1;
let editPatientIndex = -1;

/* UNIQUE FEATURE 1: HOSPITAL STATISTICS REPORT */

function generateReport() {
  let today = todayString();

  // ----- Appointments: one loop counts everything -----
  let todayCount = 0;
  let statusNames = [
    'Pending',
    'Checked-in',
    'In Consultation',
    'Completed',
    'Cancelled',
  ];
  let statusTotals = [0, 0, 0, 0, 0]; // statusTotals[i] belongs to statusNames[i]

  for (const appointment of appointments) {
    let position = statusNames.indexOf(appointment.status);
    if (position !== -1) {
      statusTotals[position]++;
    }
    if (appointment.date === today && appointment.status !== 'Cancelled') {
      todayCount++;
    }
  }

  // ----- Waiting patients: queue tokens of today that are still waiting -----
  let waiting = 0;
  for (const entry of queue) {
    if (entry.date === today && entry.status === 'Waiting') {
      waiting++;
    }
  }

  // ----- Department-wise patient counts -----
  // For each department we collect the ids of DIFFERENT patients (seen array),
  // so a patient with two visits is counted once.
  let deptNames = [];
  let deptTotals = [];
  for (const department of departments) {
    let seen = [];
    for (const appointment of appointments) {
      if (
        appointment.department === department.name &&
        appointment.status !== 'Cancelled'
      ) {
        if (seen.indexOf(appointment.patientId) === -1) {
          seen.push(appointment.patientId);
        }
      }
    }
    deptNames.push(department.name);
    deptTotals.push(seen.length);
  }

  // ----- Show the numbers with innerHTML -----
  document.getElementById('statDoctors').innerHTML = doctors.length;
  document.getElementById('statPatients').innerHTML = patients.length;
  document.getElementById('statAppointments').innerHTML = appointments.length;
  document.getElementById('statToday').innerHTML = todayCount;
  document.getElementById('statWaiting').innerHTML = waiting;
  document.getElementById('statPending').innerHTML = statusTotals[0];
  document.getElementById('statCompleted').innerHTML = statusTotals[3];
  document.getElementById('statCancelled').innerHTML = statusTotals[4];
  document.getElementById('reportTime').innerHTML =
    'Generated at ' + nowString();

  // Cancelled appointments are shown in red when there are any (element.style)
  if (statusTotals[4] > 0) {
    document.getElementById('statCancelled').style.color = '#DC5A5F';
  } else {
    document.getElementById('statCancelled').style.color = '';
  }

  //  Bar charts
  drawBarChart('deptChart', deptNames, deptTotals, patients.length);
  drawBarChart('statusChart', statusNames, statusTotals, appointments.length);
}

// Draws simple horizontal bars. names[i] is the label of the bar with value counts[i].
// Each bar's width is set as a percentage with an inline style.
function drawBarChart(chartId, names, counts, total) {
  let html = '';

  for (let i = 0; i < names.length; i++) {
    let percent = 0;
    if (total > 0) {
      percent = Math.round((counts[i] / total) * 100);
    }
    html +=
      "<div class='bar-row'>" +
      "<div class='bar-label'>" +
      names[i] +
      '</div>' +
      "<div class='bar-track'><div class='bar-fill' style='width:" +
      percent +
      "%'></div></div>" +
      "<div class='bar-value'>" +
      counts[i] +
      '</div>' +
      '</div>';
  }

  document.getElementById(chartId).innerHTML = html;
}

/* UNIQUE FEATURE 2: DOCTOR WORKLOAD MONITOR*/

function renderWorkload() {
  let today = todayString();
  let rows = '';

  for (const doctor of doctors) {
    if (doctor.status === 'Active') {
      let total = 0;
      let completed = 0;

      for (const appointment of appointments) {
        if (
          appointment.doctorId === doctor.id &&
          appointment.date === today &&
          appointment.status !== 'Cancelled'
        ) {
          total++;
          if (appointment.status === 'Completed') {
            completed++;
          }
        }
      }
      let pending = total - completed;

      let level;
      let color;
      if (total >= hospitalRules.highWorkload) {
        level = 'High';
        color = 'red';
      } else if (total >= hospitalRules.mediumWorkload) {
        level = 'Medium';
        color = 'orange';
      } else {
        level = 'Low';
        color = 'green';
      }

      rows +=
        '<tr>' +
        '<td><strong>' +
        doctor.name +
        '</strong></td>' +
        '<td>' +
        doctor.department +
        '</td>' +
        '<td>' +
        total +
        '</td>' +
        '<td>' +
        completed +
        '</td>' +
        '<td>' +
        pending +
        '</td>' +
        "<td><span class='badge " +
        color +
        "'>" +
        level +
        '</span></td>' +
        '</tr>';
    }
  }

  if (rows === '') {
    rows = "<tr><td colspan='6' class='empty-row'>No active doctors.</td></tr>";
  }
  document.getElementById('workloadBody').innerHTML = rows;
  document.getElementById('workloadRule').innerHTML =
    "Based on today's appointments: Low = fewer than " +
    hospitalRules.mediumWorkload +
    ', Medium = ' +
    hospitalRules.mediumWorkload +
    ' to ' +
    (hospitalRules.highWorkload - 1) +
    ', High = ' +
    hospitalRules.highWorkload +
    ' or more.';
}

/* UNIQUE FEATURE 3: MEDICINE STOCK AND EXPIRY MONITOR */

// Works out the three alerts for one medicine and returns them in an object
function getMedicineFlags(medicine) {
  let daysLeft = daysBetween(todayString(), medicine.expiry); // negative = already expired
  return {
    low: medicine.quantity < medicine.minStock,
    expired: daysLeft < 0,
    soon: daysLeft >= 0 && daysLeft <= hospitalRules.expirySoonDays,
    daysLeft: daysLeft,
  };
}

// READ + SEARCH + ALERT COUNTS
function renderMedicines() {
  let keyword = document.getElementById('medicineSearch').value;
  let filter = document.getElementById('medicineFilter').value;

  let rows = '';
  let shown = 0;
  let lowCount = 0;
  let expiredCount = 0;
  let soonCount = 0;

  for (let i = 0; i < medicines.length; i++) {
    let medicine = medicines[i];
    let flags = getMedicineFlags(medicine);

    // Count alerts over ALL medicines (not only the ones that match the search)
    if (flags.low) {
      lowCount++;
    }
    if (flags.expired) {
      expiredCount++;
    }
    if (flags.soon) {
      soonCount++;
    }

    let matchesKeyword =
      containsText(medicine.name, keyword) ||
      containsText(medicine.category, keyword) ||
      containsText(medicine.id, keyword);
    let isOk =
      flags.low === false && flags.expired === false && flags.soon === false;
    let matchesFilter =
      filter === 'All' ||
      (filter === 'Low' && flags.low) ||
      (filter === 'Expired' && flags.expired) ||
      (filter === 'Soon' && flags.soon) ||
      (filter === 'OK' && isOk);

    if (matchesKeyword && matchesFilter) {
      let status = '';
      if (flags.expired) {
        status += "<span class='badge red'>Expired</span> ";
      }
      if (flags.soon) {
        status +=
          "<span class='badge orange'>Expires in " +
          flags.daysLeft +
          ' days</span> ';
      }
      if (flags.low) {
        status += "<span class='badge orange'>Low stock</span> ";
      }
      if (isOk) {
        status = "<span class='badge green'>OK</span>";
      }

      rows +=
        '<tr>' +
        '<td>' +
        medicine.id +
        '</td>' +
        '<td><strong>' +
        medicine.name +
        '</strong></td>' +
        '<td>' +
        medicine.category +
        '</td>' +
        '<td>' +
        medicine.quantity +
        '</td>' +
        '<td>' +
        medicine.minStock +
        '</td>' +
        '<td>' +
        medicine.expiry +
        '</td>' +
        '<td>' +
        status +
        '</td>' +
        '<td>' +
        "<button type='button' class='btn btn-small' onclick='editMedicine(" +
        i +
        ")'>Edit</button>" +
        "<button type='button' class='btn btn-small btn-danger' onclick='deleteMedicine(" +
        i +
        ")'>Delete</button>" +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='8' class='empty-row'>No medicines match your search.</td></tr>";
  }

  document.getElementById('medicineBody').innerHTML = rows;
  document.getElementById('medicineCount').innerHTML =
    'Showing ' + shown + ' of ' + medicines.length + ' medicines';
  document.getElementById('medTotal').innerHTML = medicines.length;
  document.getElementById('medLow').innerHTML = lowCount;
  document.getElementById('medExpired').innerHTML = expiredCount;
  document.getElementById('medSoon').innerHTML = soonCount;
  document.getElementById('medicineRule').innerHTML =
    'Low stock = quantity below the minimum level. ' +
    'Expiring soon = expires within ' +
    hospitalRules.expirySoonDays +
    ' days.';
}

// CREATE or UPDATE: runs when the medicine form is submitted
function saveMedicine() {
  let name = document.getElementById('medName').value.trim();
  let category = document.getElementById('medCategory').value.trim();
  let quantityText = document.getElementById('medQuantity').value;
  let minText = document.getElementById('medMin').value;
  let expiry = document.getElementById('medExpiry').value;

  // ----- Validation -----
  let isValid = true;
  clearErrors(['medName', 'medCategory', 'medQuantity', 'medMin', 'medExpiry']);

  if (name.length < 3) {
    showError('medName', 'Name must be at least 3 characters.');
    isValid = false;
  } else if (medicineNameUsedByOther(name)) {
    showError('medName', 'Another medicine already has this name.');
    isValid = false;
  }

  if (category.length < 3) {
    showError('medCategory', 'Please enter a category.');
    isValid = false;
  }

  if (quantityText === '' || Number(quantityText) < 0) {
    showError('medQuantity', 'Enter the quantity (0 or more).');
    isValid = false;
  }

  if (minText === '' || Number(minText) < 0) {
    showError('medMin', 'Enter the minimum stock level (0 or more).');
    isValid = false;
  }

  if (expiry === '') {
    showError('medExpiry', 'Please choose the expiry date.');
    isValid = false;
  }

  if (isValid === false) {
    return false;
  }

  // ----- Save -----
  if (editMedicineIndex === -1) {
    // CREATE: build a new object and push() it to the end of the array
    let newMedicine = {
      id: nextId('M', medicines),
      name: name,
      category: category,
      quantity: Number(quantityText),
      minStock: Number(minText),
      expiry: expiry,
    };
    medicines.push(newMedicine);
    addLog('Medicine', 'Added medicine ' + name + ' (' + newMedicine.id + ')');
    showMessage(
      'medicineMessage',
      'Medicine <strong>' +
        name +
        '</strong> was added with id ' +
        newMedicine.id +
        '.',
      'success',
    );
  } else {
    // UPDATE: change the properties of the object that is being edited
    let medicine = medicines[editMedicineIndex];
    medicine.name = name;
    medicine.category = category;
    medicine.quantity = Number(quantityText);
    medicine.minStock = Number(minText);
    medicine.expiry = expiry;
    addLog('Medicine', 'Updated medicine ' + name + ' (' + medicine.id + ')');
    showMessage(
      'medicineMessage',
      'Medicine <strong>' + name + '</strong> was updated.',
      'success',
    );
  }

  resetMedicineForm();
  renderMedicines();
  return false; // stay on the page
}

function medicineNameUsedByOther(name) {
  for (let i = 0; i < medicines.length; i++) {
    if (
      medicines[i].name.toLowerCase() === name.toLowerCase() &&
      i !== editMedicineIndex
    ) {
      return true;
    }
  }
  return false;
}

// Copies the medicine into the form so it can be changed
function editMedicine(index) {
  let medicine = medicines[index];
  editMedicineIndex = index;

  document.getElementById('medQuantity').value = medicine.quantity;
  document.getElementById('medMin').value = medicine.minStock;
  document.getElementById('medExpiry').value = medicine.expiry;

  document.getElementById('medicineFormTitle').innerHTML =
    'Update Medicine ' + medicine.id;
  document.getElementById('medicineSaveButton').value = 'Save Changes';
  hideMessage('medicineMessage');
}

function deleteMedicine(index) {
  let medicine = medicines[index];
  if (confirm('Delete ' + medicine.name + '?')) {
    medicines = removeAt(medicines, index);
    addLog(
      'Medicine',
      'Deleted medicine ' + medicine.name + ' (' + medicine.id + ')',
    );
    resetMedicineForm();
    renderMedicines();
    showMessage('medicineMessage', medicine.name + ' was deleted.', 'info');
  }
}

function resetMedicineForm() {
  editMedicineIndex = -1;
  document.getElementById('medicineForm').reset();
  clearErrors(['medName', 'medCategory', 'medQuantity', 'medMin', 'medExpiry']);
  document.getElementById('medicineFormTitle').innerHTML = 'Add Medicine';
  document.getElementById('medicineSaveButton').value = 'Add Medicine';
}

/* MANAGE DOCTORS: CREATE, READ, UPDATE, DELETE, SEARCH + APPROVE */

// Accounts that registered and are waiting for the admin (doctors and receptionists)
function renderPending() {
  let html = '';
  for (let i = 0; i < users.length; i++) {
    if (users[i].status === 'Pending') {
      html +=
        "<div class='log-item'>" +
        '<strong>' +
        users[i].name +
        '</strong> ' +
        "<span class='badge " +
        users[i].role.toLowerCase() +
        "'>" +
        users[i].role +
        '</span> ' +
        "<span class='hint'>" +
        users[i].email +
        '</span> ' +
        "<button type='button' class='btn btn-small btn-success' onclick='approveUser(" +
        i +
        ")'>Approve</button>" +
        '</div>';
    }
  }
  if (html === '') {
    html = "<p class='empty-row'>No accounts are waiting for approval.</p>";
  }
  document.getElementById('pendingList').innerHTML = html;
}

// Makes a pending account Active (and the doctor record, if it is a doctor)
function approveUser(index) {
  let user = users[index];
  user.status = 'Active';

  if (user.role === 'Doctor') {
    let doctor = findById(doctors, user.doctorId);
    if (doctor !== null) {
      doctor.status = 'Active';
    }
  }

  addLog(
    'Account',
    'Approved ' + user.role.toLowerCase() + ' account of ' + user.name,
  );
  addNotification(
    user.id,
    'Account',
    'Your account was approved. You can log in now.',
  );
  renderPending();
  renderDoctors();
  renderWorkload();
  showMessage(
    'doctorMessage',
    'Account of <strong>' + user.name + '</strong> was approved.',
    'success',
  );
}

// READ + SEARCH
function renderDoctors() {
  let keyword = document.getElementById('doctorSearch').value;
  let statusFilter = document.getElementById('doctorStatusFilter').value;

  let rows = '';
  let shown = 0;

  for (let i = 0; i < doctors.length; i++) {
    let doctor = doctors[i];
    let matchesKeyword =
      containsText(doctor.name, keyword) ||
      containsText(doctor.specialization, keyword) ||
      containsText(doctor.id, keyword) ||
      containsText(doctor.department, keyword);
    let matchesStatus =
      statusFilter === 'All' || doctor.status === statusFilter;

    if (matchesKeyword && matchesStatus) {
      let statusColor;
      switch (doctor.status) {
        case 'Active':
          statusColor = 'green';
          break;
        case 'Pending':
          statusColor = 'orange';
          break;
        default:
          statusColor = 'grey';
      }

      rows +=
        '<tr>' +
        '<td>' +
        doctor.id +
        '</td>' +
        '<td><strong>' +
        doctor.name +
        "</strong><br><span class='hint'>" +
        doctor.specialization +
        ' &middot; ' +
        doctor.room +
        '</span></td>' +
        '<td>' +
        doctor.department +
        '</td>' +
        '<td>' +
        doctor.fee +
        '</td>' +
        '<td>' +
        doctor.days +
        '</td>' +
        "<td><span class='badge " +
        statusColor +
        "'>" +
        doctor.status +
        '</span></td>' +
        '<td>' +
        "<button type='button' class='btn btn-small' onclick='editDoctor(" +
        i +
        ")'>Edit</button>" +
        "<button type='button' class='btn btn-small btn-danger' onclick='deleteDoctor(" +
        i +
        ")'>Delete</button>" +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='7' class='empty-row'>No doctors match your search.</td></tr>";
  }
  document.getElementById('doctorBody').innerHTML = rows;
  document.getElementById('doctorCount').innerHTML =
    'Showing ' + shown + ' of ' + doctors.length + ' doctors';
}

// CREATE or UPDATE
function saveDoctor() {
  let name = document.getElementById('docName').value.trim();
  let specialization = document
    .getElementById('docSpecialization')
    .value.trim();
  let qualification = document.getElementById('docQualification').value.trim();
  let department = document.getElementById('docDepartment').value;
  let feeText = document.getElementById('docFee').value;
  let room = document.getElementById('docRoom').value.trim();
  let days = getCheckedValues('adminDay');
  let status = getRadioValue('docStatus');

  let isValid = true;
  clearErrors([
    'docName',
    'docSpecialization',
    'docQualification',
    'docDepartment',
    'docFee',
    'docRoom',
    'adminDay',
  ]);

  if (name.length < 5) {
    showError('docName', 'Name must be at least 5 characters.');
    isValid = false;
  }
  if (specialization.length < 3) {
    showError('docSpecialization', 'Please enter the specialization.');
    isValid = false;
  }
  if (qualification.length < 3) {
    showError('docQualification', 'Please enter the qualification.');
    isValid = false;
  }
  if (department === '') {
    showError('docDepartment', 'Please choose a department.');
    isValid = false;
  }
  if (feeText === '' || Number(feeText) < 100 || Number(feeText) > 10000) {
    showError('docFee', 'Fee must be between 100 and 10000 Tk.');
    isValid = false;
  }
  if (room.length < 3) {
    showError('docRoom', 'Please enter the room.');
    isValid = false;
  }
  if (days.length === 0) {
    showError('adminDay', 'Please tick at least one day.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  if (editDoctorIndex === -1) {
    let newDoctor = {
      id: nextId('D', doctors),
      name: name,
      specialization: specialization,
      qualification: qualification,
      department: department,
      fee: Number(feeText),
      days: days.join(', '),
      room: room,
      status: status,
      userId: '',
    };
    doctors.push(newDoctor);
    addLog('Doctor', 'Added doctor ' + name + ' (' + newDoctor.id + ')');
    showMessage(
      'doctorMessage',
      'Doctor <strong>' +
        name +
        '</strong> was added with id ' +
        newDoctor.id +
        '. (A login account is made through the Register page.)',
      'success',
    );
  } else {
    let doctor = doctors[editDoctorIndex];
    doctor.name = name;
    doctor.specialization = specialization;
    doctor.qualification = qualification;
    doctor.department = department;
    doctor.fee = Number(feeText);
    doctor.room = room;
    doctor.days = days.join(', ');
    if (doctor.status !== 'Pending') {
      // a pending doctor is activated with the Approve button
      doctor.status = status;
    }
    addLog('Doctor', 'Updated doctor ' + name + ' (' + doctor.id + ')');
    showMessage(
      'doctorMessage',
      'Doctor <strong>' + name + '</strong> was updated.',
      'success',
    );
  }

  resetDoctorForm();
  renderDoctors();
  renderWorkload();
  return false;
}

function editDoctor(index) {
  let doctor = doctors[index];
  editDoctorIndex = index;

  document.getElementById('docName').value = doctor.name;
  document.getElementById('docSpecialization').value = doctor.specialization;
  document.getElementById('docQualification').value = doctor.qualification;
  document.getElementById('docDepartment').value = doctor.department;
  document.getElementById('docFee').value = doctor.fee;
  document.getElementById('docRoom').value = doctor.room;
  document.getElementById('docStatusInactive').checked =
    doctor.status === 'Inactive';
  document.getElementById('docStatusActive').checked =
    doctor.status !== 'Inactive';

  // Tick the day boxes that are in the doctor's days text
  let boxes = document.getElementsByName('adminDay');
  for (let i = 0; i < boxes.length; i++) {
    boxes[i].checked = doctor.days.indexOf(boxes[i].value) !== -1;
  }

  document.getElementById('doctorFormTitle').innerHTML =
    'Edit Doctor ' + doctor.id;
  document.getElementById('doctorSaveButton').value = 'Save Changes';
  hideMessage('doctorMessage');
}

function deleteDoctor(index) {
  let doctor = doctors[index];

  // A doctor who has appointments cannot be deleted: the appointments would point to nobody
  for (const appointment of appointments) {
    if (appointment.doctorId === doctor.id) {
      showMessage(
        'doctorMessage',
        doctor.name +
          ' has appointments, so the record cannot be deleted. ' +
          'Edit the doctor and set the status to Inactive instead.',
        'error',
      );
      return;
    }
  }

  if (confirm('Delete ' + doctor.name + '?')) {
    doctors = removeAt(doctors, index);
    addLog('Doctor', 'Deleted doctor ' + doctor.name + ' (' + doctor.id + ')');
    resetDoctorForm();
    renderDoctors();
    renderWorkload();
    showMessage('doctorMessage', doctor.name + ' was deleted.', 'info');
  }
}

function resetDoctorForm() {
  editDoctorIndex = -1;
  document.getElementById('doctorForm').reset();
  clearErrors([
    'docName',
    'docSpecialization',
    'docQualification',
    'docDepartment',
    'docFee',
    'docRoom',
    'adminDay',
  ]);
  document.getElementById('doctorFormTitle').innerHTML = 'Add Doctor';
  document.getElementById('doctorSaveButton').value = 'Add Doctor';
}

/* MANAGE PATIENTS: READ, UPDATE, DELETE, SEARCH */
function renderPatients() {
  let keyword = document.getElementById('patientSearch').value;
  let rows = '';
  let shown = 0;

  for (let i = 0; i < patients.length; i++) {
    let patient = patients[i];
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
        "</strong><br><span class='hint'>" +
        patient.email +
        '</span></td>' +
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
        patient.address +
        '</td>' +
        '<td>' +
        "<button type='button' class='btn btn-small' onclick='editPatient(" +
        i +
        ")'>Edit</button>" +
        "<button type='button' class='btn btn-small btn-danger' onclick='deletePatient(" +
        i +
        ")'>Delete</button>" +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='7' class='empty-row'>No patients match your search.</td></tr>";
  }
  document.getElementById('patientBody').innerHTML = rows;
  document.getElementById('patientCount').innerHTML =
    'Showing ' + shown + ' of ' + patients.length + ' patients';
}

function editPatient(index) {
  let patient = patients[index];
  editPatientIndex = index;

  document.getElementById('patName').value = patient.name;
  document.getElementById('patPhone').value = patient.phone;
  document.getElementById('patEmail').value = patient.email;
  document.getElementById('patAddress').value = patient.address;
  document.getElementById('patientFormLegend').innerHTML =
    'Details of ' + patient.id;
  document.getElementById('patientFormCard').style.display = 'block'; // show the hidden form
  hideMessage('patientMessage');
}

function savePatient() {
  let name = document.getElementById('patName').value.trim();
  let phone = document.getElementById('patPhone').value.trim();
  let email = document.getElementById('patEmail').value.trim();
  let address = document.getElementById('patAddress').value.trim();

  let isValid = true;
  clearErrors(['patName', 'patPhone', 'patEmail', 'patAddress']);

  if (name.length < 3) {
    showError('patName', 'Name must be at least 3 characters.');
    isValid = false;
  }
  if (isValidPhone(phone) === false) {
    showError('patPhone', 'Phone must be 11 digits and start with 01.');
    isValid = false;
  } else {
    // The phone number must not belong to a different patient
    for (let i = 0; i < patients.length; i++) {
      if (patients[i].phone === phone && i !== editPatientIndex) {
        showError(
          'patPhone',
          'This phone number belongs to ' + patients[i].name + '.',
        );
        isValid = false;
      }
    }
  }
  if (isValidEmail(email) === false) {
    showError('patEmail', 'Please enter a valid email address.');
    isValid = false;
  }
  if (address.length < 5) {
    showError('patAddress', 'Please enter the address.');
    isValid = false;
  }
  if (isValid === false) {
    return false;
  }

  let patient = patients[editPatientIndex];
  patient.name = name;
  patient.phone = phone;
  patient.email = email;
  patient.address = address;
  addLog('Patient', 'Updated details of ' + name + ' (' + patient.id + ')');
  showMessage(
    'patientMessage',
    'Patient <strong>' + name + '</strong> was updated.',
    'success',
  );
  resetPatientForm();
  renderPatients();
  return false;
}

function deletePatient(index) {
  let patient = patients[index];

  // Medical data of a patient must not be deleted by accident: refuse when records exist
  let hasRecords = false;
  for (const appointment of appointments) {
    if (appointment.patientId === patient.id) {
      hasRecords = true;
    }
  }
  for (const record of medicalRecords) {
    if (record.patientId === patient.id) {
      hasRecords = true;
    }
  }
  if (hasRecords) {
    showMessage(
      'patientMessage',
      patient.name +
        ' has appointments or medical records, so the patient cannot be deleted.',
      'error',
    );
    return;
  }

  if (confirm('Delete ' + patient.name + '?')) {
    patients = removeAt(patients, index);
    addLog(
      'Patient',
      'Deleted patient ' + patient.name + ' (' + patient.id + ')',
    );
    renderPatients();
    showMessage('patientMessage', patient.name + ' was deleted.', 'info');
  }
}

function resetPatientForm() {
  editPatientIndex = -1;
  document.getElementById('patientForm').reset();
  clearErrors(['patName', 'patPhone', 'patEmail', 'patAddress']);
  document.getElementById('patientFormCard').style.display = 'none';
}

/* MANAGE APPOINTMENTS: READ, UPDATE STATUS, DELETE, SEARCH */
function renderAppointments() {
  let keyword = document.getElementById('appointmentSearch').value;
  let statusFilter = document.getElementById('appointmentStatusFilter').value;

  let rows = '';
  let shown = 0;

  for (let i = 0; i < appointments.length; i++) {
    let appointment = appointments[i];
    let pName = patientName(appointment.patientId);
    let dName = doctorName(appointment.doctorId);

    let matchesKeyword =
      containsText(pName, keyword) ||
      containsText(dName, keyword) ||
      containsText(appointment.reason, keyword) ||
      containsText(appointment.id, keyword);
    let matchesStatus =
      statusFilter === 'All' || appointment.status === statusFilter;

    if (matchesKeyword && matchesStatus) {
      // Completed and cancelled appointments cannot be changed again
      let actions = '';
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
      actions +=
        "<button type='button' class='btn btn-small btn-danger' onclick='deleteAppointment(" +
        i +
        ")'>Delete</button>";

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
      "<tr><td colspan='8' class='empty-row'>No appointments match your search.</td></tr>";
  }
  document.getElementById('appointmentBody').innerHTML = rows;
  document.getElementById('appointmentCount').innerHTML =
    'Showing ' + shown + ' of ' + appointments.length + ' appointments';
}

function changeAppointment(index, newStatus) {
  let appointment = appointments[index];
  setAppointmentStatus(appointment, newStatus); // also updates the queue token (common.js)
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
  generateReport();
  renderWorkload();
  showMessage(
    'appointmentMessage',
    'Appointment ' + appointment.id + ' is now ' + newStatus + '.',
    'success',
  );
}

function deleteAppointment(index) {
  let appointment = appointments[index];
  if (confirm('Delete appointment ' + appointment.id + '?')) {
    queue = removeQueueFor(appointment.id);
    appointments = removeAt(appointments, index);
    addLog('Appointment', 'Deleted appointment ' + appointment.id);
    renderAppointments();
    generateReport();
    renderWorkload();
    showMessage(
      'appointmentMessage',
      'Appointment ' + appointment.id + ' was deleted.',
      'info',
    );
  }
}

/* ACTIVITY HISTORY (read only, with filters) */
function getLogColor(type) {
  switch (type) {
    case 'Doctor':
      return '#136B5F';
    case 'Patient':
      return '#2FA67F';
    case 'Appointment':
      return '#1F9D8A';
    case 'Prescription':
      return '#2E9CB5';
    case 'Medicine':
      return '#E08A2E';
    default:
      return '#6B7C84'; // Account
  }
}

function renderLog() {
  let keyword = document.getElementById('logSearch').value;
  let typeFilter = document.getElementById('logTypeFilter').value;
  let board = document.getElementById('logBoard');
  let shown = 0;

  board.innerHTML = '';

  // Newest entry first: loop from the end of the array to the start
  for (let i = activityLog.length - 1; i >= 0; i--) {
    let entry = activityLog[i];
    let matchesKeyword =
      containsText(entry.message, keyword) || containsText(entry.user, keyword);

    if (matchesKeyword && (typeFilter === 'All' || entry.type === typeFilter)) {
      // createElement + appendChild
      let item = document.createElement('div');
      item.className = 'log-item';
      item.style.borderLeftColor = getLogColor(entry.type);
      item.innerHTML =
        "<span class='log-time'>" +
        entry.time +
        ' &middot; ' +
        entry.user +
        '</span><br>' +
        "<span class='badge' style='background-color:" +
        getLogColor(entry.type) +
        "'>" +
        entry.type +
        '</span> ' +
        entry.message;
      board.appendChild(item);
      shown++;
    }
  }

  if (shown === 0) {
    board.innerHTML = "<p class='empty-row'>No activity to show.</p>";
  }
  document.getElementById('logCount').innerHTML = shown + ' entries';
}

function clearLog() {
  if (confirm('Clear the whole activity history?')) {
    activityLog = [];
    addLog('Account', 'Activity history was cleared');
    renderLog();
  }
}

/* START: runs once when the page has loaded (scripts are at the end of <body>) */
if (currentUser === null) {
  showAccessDenied('Admin');
} else {
  document.getElementById('welcomeName').innerHTML = currentUser.name;

  // Fill the department list of the doctor form
  for (const department of departments) {
    addOption(
      document.getElementById('docDepartment'),
      department.name,
      department.name,
    );
  }

  generateReport();
  renderWorkload();
  renderMedicines();
  renderPending();
  renderDoctors();
  renderPatients();
  renderAppointments();
  renderLog();
  renderNotifications();
  renderProfile();
  showSection('statsSection');
}
