// ==============================================================
// shohanCommon.js  |  OWNER: Shohan (Admin & Home)
// Only Shohan edits this file. Pages load it in order: shohan, alif, saad, najir.
// ==============================================================

function showSection(sectionId) {
  for (let i = 0; i < sections.length; i++) {
    let section = document.getElementById(sections[i]);
    let navButton = document.getElementById('nav-' + sections[i]);

    if (sections[i] === sectionId) {
      section.style.display = 'block';
      navButton.className = 'active';
    } else {
      section.style.display = 'none';
      navButton.className = '';
    }
  }
}

/* 
   5. SEARCH HELPER true when "text" contains "keyword", ignoring upper/lower case.Uses the string methods toLowerCase() and indexOf().*/

function containsText(text, keyword) {
  return String(text).toLowerCase().indexOf(keyword.toLowerCase()) !== -1;
}

/*6. ARRAY HELPERS */

// Finds the position (index) of the object whose id matches, or -1
function findIndexById(list, id) {
  for (let i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      return i;
    }
  }
  return -1;
}

// Returns the object whose id matches, or null when there is none
function findById(list, id) {
  let index = findIndexById(list, id);
  if (index === -1) {
    return null;
  }
  return list[index];
}

// Returns a NEW array without the element at "index".
// slice() copies part of an array and concat() joins two arrays.
function removeAt(list, index) {
  return list.slice(0, index).concat(list.slice(index + 1));
}

// Makes the next id, e.g. nextId("P", patients) gives "P-1007"
// and nextId("A", appointments) gives "A-2018".
// It looks for the biggest number already used and adds 1.
function nextId(prefix, list) {
  let biggest = 0;
  let digits = 3;
  for (let i = 0; i < list.length; i++) {
    let numberText = list[i].id.slice(prefix.length + 1); // "P-1006" -> "1006"
    digits = numberText.length;
    if (Number(numberText) > biggest) {
      biggest = Number(numberText);
    }
  }

  // Add zeros at the front until the number has enough digits: 8 -> "008"
  let newNumber = String(biggest + 1);
  while (newNumber.length < digits) {
    newNumber = '0' + newNumber;
  }
  return prefix + '-' + newNumber;
}

// Sorts a list of objects by their "date" property (simple bubble sort).
// newestFirst = true puts the latest date first, false puts the oldest first.
// Dates are "YYYY-MM-DD" texts, so comparing the texts also compares the dates.
function sortByDate(list, newestFirst) {
  for (let i = 0; i < list.length - 1; i++) {
    for (let j = 0; j < list.length - 1 - i; j++) {
      let swap;
      if (newestFirst) {
        swap = list[j].date < list[j + 1].date;
      } else {
        swap = list[j].date > list[j + 1].date;
      }
      if (swap) {
        let temp = list[j];
        list[j] = list[j + 1];
        list[j + 1] = temp;
      }
    }
  }
  return list;
}

// Short names for ids: patientName("P-1001") gives "Farhan Kabir"
function patientName(patientId) {
  let patient = findById(patients, patientId);
  if (patient === null) {
    return 'Unknown patient';
  }
  return patient.name;
}

function doctorName(doctorId) {
  let doctor = findById(doctors, doctorId);
  if (doctor === null) {
    return 'Unknown doctor';
  }
  return doctor.name;
}

// A badge colour for each appointment status (switch, like the demo)
function appointmentColor(status) {
  switch (status) {
    case 'Completed':
      return 'green';
    case 'Cancelled':
      return 'red';
    case 'Checked-in':
      return 'blue';
    case 'In Consultation':
      return 'teal';
    default:
      return 'orange'; // Pending
  }
}

/*10. ACTIVITY LOG AND NOTIFICATIONS */

// Writes one entry into the activity log (the Admin reads it)
function addLog(type, message) {
  activityLog.push({
    time: nowString(),
    user: currentUser.username,
    type: type,
    message: message,
  });
}

// Makes a new notification for the user with this id
function addNotification(userId, type, message) {
  if (userId === '') {
    return;
  }
  notifications.push({
    id: nextId('N', notifications),
    userId: userId,
    type: type,
    message: message,
    date: todayString(),
    read: false,
  });
}

// Finds the account of a patient or doctor record (or "" when it has none)
function accountOfPatient(patientId) {
  let patient = findById(patients, patientId);
  if (patient === null) {
    return '';
  }
  return patient.userId;
}

function accountOfDoctor(doctorId) {
  let doctor = findById(doctors, doctorId);
  if (doctor === null) {
    return '';
  }
  return doctor.userId;
}

// Shows the notifications of the logged-in user, newest at the bottom
// (needs  <div id="notificationList">  and  <span id="notificationCount">)
function renderNotifications() {
  let list = document.getElementById('notificationList');
  let shown = 0;
  let unread = 0;
  list.innerHTML = '';

  for (let i = notifications.length - 1; i >= 0; i--) {
    let note = notifications[i];
    if (note.userId === currentUser.id) {
      let item = document.createElement('div');
      item.className = note.read ? 'log-item' : 'log-item unread';
      let button = '';
      if (note.read === false) {
        button =
          " <button type='button' class='btn btn-small btn-secondary' onclick='markRead(" +
          i +
          ")'>Mark as read</button>";
        unread++;
      }
      item.innerHTML =
        "<span class='log-time'>" +
        note.date +
        '</span><br>' +
        "<span class='badge blue'>" +
        note.type +
        '</span> ' +
        note.message +
        button;
      list.appendChild(item);
      shown++;
    }
  }

  if (shown === 0) {
    list.innerHTML = "<p class='empty-row'>You have no notifications.</p>";
  }
  document.getElementById('notificationCount').innerHTML =
    unread + ' unread of ' + shown;
}

function markRead(index) {
  notifications[index].read = true;
  renderNotifications();
}

function markAllRead() {
  for (const note of notifications) {
    if (note.userId === currentUser.id) {
      note.read = true;
    }
  }
  renderNotifications();
}
