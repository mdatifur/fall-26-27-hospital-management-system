// OWNER: Shohan  |  Home module  |  only Shohan edits this file

// Fill the department list from the departments array (createElement + appendChild)
function fillDepartmentFilter() {
  let select = document.getElementById('doctorDepartment');
  for (const department of departments) {
    addOption(select, department.name, department.name);
  }
}

// Draw the table rows with a loop and innerHTML
function renderDoctorDirectory() {
  let keyword = document.getElementById('doctorSearch').value;
  let department = document.getElementById('doctorDepartment').value;

  let rows = '';
  let shown = 0;

  for (const doctor of doctors) {
    let matchesKeyword =
      containsText(doctor.name, keyword) ||
      containsText(doctor.specialization, keyword);
    let matchesDepartment =
      department === 'All' || doctor.department === department;

    if (doctor.status === 'Active' && matchesKeyword && matchesDepartment) {
      rows +=
        '<tr>' +
        '<td><strong>' +
        doctor.name +
        '</strong></td>' +
        '<td>' +
        doctor.specialization +
        '</td>' +
        '<td>' +
        doctor.department +
        '</td>' +
        '<td>' +
        doctor.qualification +
        '</td>' +
        '<td>' +
        doctor.fee +
        '</td>' +
        '<td>' +
        doctor.days +
        '</td>' +
        '</tr>';
      shown++;
    }
  }

  if (shown === 0) {
    rows =
      "<tr><td colspan='6' class='empty-row'>No doctors match your search.</td></tr>";
  }

  document.getElementById('doctorBody').innerHTML = rows;
  document.getElementById('doctorCount').innerHTML = shown + ' doctor(s) found';
}

// Show every doctor when the page first opens
fillDepartmentFilter();
renderDoctorDirectory();
