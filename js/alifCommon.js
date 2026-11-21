// ==============================================================
// alifCommon.js  |  OWNER: Alif (Doctor & Login)
// Only Alif edits this file. Pages load it in order: shohan, alif, saad, najir.
// ==============================================================

/* 
   2. SHOWING AND CLEARING ERRORS */

function showError(fieldId, message) {
  document.getElementById(fieldId + 'Error').innerHTML = message;

  // Radio-button groups have no single element with this id, so check first
  let field = document.getElementById(fieldId);
  if (field != null) {
    field.style.border = '2px solid red';
  }
}

function clearError(fieldId) {
  document.getElementById(fieldId + 'Error').innerHTML = '';

  let field = document.getElementById(fieldId);
  if (field != null) {
    field.style.border = '';
  }
}

// Clears the errors of many fields at once; fieldIds is an array
function clearErrors(fieldIds) {
  for (let i = 0; i < fieldIds.length; i++) {
    clearError(fieldIds[i]);
  }
}

/*3. MESSAGE BOXES type is "success", "error" or "info" (these are CSS classes) */

function showMessage(boxId, text, type) {
  let box = document.getElementById(boxId);
  box.innerHTML = text;
  box.className = 'message ' + type;
  box.style.display = 'block';
}

function hideMessage(boxId) {
  document.getElementById(boxId).style.display = 'none';
}

/* 9. WHO IS LOGGED IN? (dashboard pages only) */
function getLoggedInUser(expectedRole) {
  let query = window.location.search;
  let start = query.indexOf('username=');
  let found = null;

  if (start !== -1) {
    let name = query.slice(start + 9);
    let end = name.indexOf('&');
    if (end !== -1) {
      name = name.slice(0, end);
    }
    name = decodeURIComponent(name).toLowerCase();

    for (const user of users) {
      if (
        user.username.toLowerCase() === name ||
        user.email.toLowerCase() === name
      ) {
        found = user;
      }
    }
  } else {
    for (const user of users) {
      if (
        found === null &&
        user.role === expectedRole &&
        user.status === 'Active'
      ) {
        found = user;
      }
    }
  }

  // Role check with plain conditions: wrong role or inactive account = no access
  if (
    found === null ||
    found.role !== expectedRole ||
    found.status !== 'Active'
  ) {
    return null;
  }
  return found;
}

// Replaces the whole page with an "access denied" message
function showAccessDenied(roleName) {
  document.body.innerHTML =
    "<main class='container'><div class='auth-box'><div class='card'>" +
    "<h2 class='page-title'>Access denied</h2>" +
    "<p class='page-subtitle'>This page is only for the " +
    roleName +
    ' role. ' +
    'Please log in with a ' +
    roleName +
    ' account.</p>' +
    "<a href='login.html' class='btn'>Go to Login</a>" +
    '</div></div></main>';
}
