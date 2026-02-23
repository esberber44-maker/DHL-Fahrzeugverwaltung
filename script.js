document.addEventListener("DOMContentLoaded", () => {
  // Screens
  const authContainer = document.getElementById("auth-container");
  const dashboardContainer = document.getElementById("dashboard-container");
  const appContainer = document.getElementById("app-container");
  
  // Elements
  const loginForm = document.getElementById("login-form");
  const registerForm = document.getElementById("register-form");
  const statusMsg = document.getElementById("status-msg");
  const dashWelcome = document.getElementById("dash-welcome");
  const inviteBadge = document.getElementById("invite-badge");
  const displayLocation = document.getElementById("display-location");
  
  const tableBody = document.querySelector("#autoTable tbody");
  const optionsList = document.getElementById("optionsList");
  const selectionModal = document.getElementById("selectionModal");
  const teamModal = document.getElementById("teamModal");
  const teamList = document.getElementById("teamList");
  const invitesModal = document.getElementById("invitesModal");
  const incomingInvitesList = document.getElementById("incomingInvitesList");
  const inviteEmailInput = document.getElementById("inviteEmail");

  // Firebase
  const FIREBASE_CONFIG = {
    apiKey: "AIzaSyAAtL3q-G9upCLf8n3W94BZCQiVHaAd8RU",
    authDomain: "dhl-baba.firebaseapp.com",
    databaseURL: "https://dhl-baba-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "dhl-baba",
    storageBucket: "dhl-baba.firebasestorage.app",
    messagingSenderId: "629484484234",
    appId: "1:629484484234:web:00e17a9e59e89bb16f5f73",
    measurementId: "G-X149J4N42X"
  };

  const ROWS_COUNT = 32;
  const TOUREN = ["Tour 1"];
  const FAHRER = ["Mitarbeiter 1"];
  const KENNZEICHEN = ["B-AB 123"];

  let currentUser = null;
  let currentStandortId = null;
  let currentStandortName = null;
  let userRole = null;
  let firebaseDbRef = null;
  let isRemoteUpdate = false;
  let lastLocalChangeTime = 0;
  
  let dynamicTouren = [...TOUREN];
  let dynamicFahrer = [...FAHRER];
  let dynamicKennzeichen = [...KENNZEICHEN];

  function loadScript(url) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = url; s.onload = resolve; s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initFirebase() {
    await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-app-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-auth-compat.js');
    await loadScript('https://www.gstatic.com/firebasejs/9.22.2/firebase-database-compat.js');

    if (!firebase.apps.length) firebase.initializeApp(FIREBASE_CONFIG);
    
    const auth = firebase.auth();
    
    // 1. Force LOCAL persistence
    await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);

    // 2. Auth State Observer - Immediate handling
    auth.onAuthStateChanged(async (user) => {
      console.log("Auth state change:", user ? user.email : "null");
      if (user) {
        currentUser = user;
        // Pre-fill email in dash welcome immediately
        dashWelcome.innerText = "Willkommen, " + (user.email.split('@')[0]);
        
        // Critical: Check user data in DB
        const db = firebase.database();
        db.ref('users/' + user.uid).on('value', (snapshot) => {
          const userData = snapshot.val();
          if (userData) {
            userRole = userData.role;
            currentStandortId = userData.standortId || user.uid;
            currentStandortName = userData.standort;
            
            const isLocCreator = (userRole === 'boss' || userRole === 'admin');
            const setupBtn = document.getElementById("dash-setup-btn");
            if (setupBtn) setupBtn.style.display = isLocCreator ? 'block' : 'none';
          }
        });
        
        initNewsWatcher();
        showDashboard();
      } else {
        showAuth();
      }
    });
  }

  function checkUserStatus(user) {
    if (!user) return;
    const db = firebase.database();
    
    // 1. User-Daten laden (Rolle und Standort)
    db.ref('users/' + user.uid).on('value', (snapshot) => {
      const userData = snapshot.val();
      if (userData) {
        userRole = userData.role;
        currentStandortId = userData.standortId || user.uid;
        currentStandortName = userData.standort;
        
        // UI Elemente aktualisieren
        const isLocCreator = (userRole === 'boss' || userRole === 'admin');
        const setupBtn = document.getElementById("dash-setup-btn");
        if (setupBtn) setupBtn.style.display = isLocCreator ? 'block' : 'none';
        
        const profileSection = document.getElementById("profile-standort-section");
        if (profileSection) profileSection.style.display = isLocCreator ? 'none' : 'block';

        // 2. Listen für diesen Standort (currentStandortId) laden - GLOBAL für diesen Standort
        // WICHTIG: Wir hören auf currentStandortId, damit JEDER im Team die gleichen Listen sieht
        db.ref('configs/' + currentStandortId).on('value', (configSnap) => {
          const config = configSnap.val();
          console.log("Config Sync für Standort:", currentStandortId, config);
          if (config) {
            dynamicTouren = config.touren || TOUREN;
            dynamicFahrer = config.fahrer || FAHRER;
            dynamicKennzeichen = config.kennzeichen || KENNZEICHEN;
            
            // Falls das Listen-Modal gerade offen ist, Werte aktualisieren
            if (listSetupModal && listSetupModal.style.display === "block") {
              const tArea = document.getElementById("setupTouren");
              const fArea = document.getElementById("setupFahrer");
              const kArea = document.getElementById("setupKennzeichen");
              if (tArea) tArea.value = dynamicTouren.join("\n");
              if (fArea) fArea.value = dynamicFahrer.join("\n");
              if (kArea) kArea.value = dynamicKennzeichen.join("\n");
            }
          }
        });
        showDashboard();
      } else {
        showDashboard(); 
      }
    });
    
    // Watch for incoming invites
    const inviteId = btoa(user.email.toLowerCase());
    db.ref('invites/' + inviteId).on('value', (snapshot) => {
      const invites = snapshot.val();
      if (invites) {
        inviteBadge.innerText = "1";
        inviteBadge.style.display = "flex";
      } else {
        inviteBadge.style.display = "none";
      }
    });
  }

  function showAuth() {
    authContainer.style.display = "block";
    dashboardContainer.style.display = "none";
    appContainer.style.display = "none";
  }

  function showDashboard() {
    authContainer.style.display = "none";
    dashboardContainer.style.display = "block";
    appContainer.style.display = "none";
  }

  function startApp(standortId) {
    dashboardContainer.style.display = "none";
    appContainer.style.display = "block";
    
    const db = firebase.database();
    displayLocation.innerText = "Fahrzeugplaner DHL - " + currentStandortName;
    document.getElementById("manage-team-btn").style.display = (userRole === 'boss' || userRole === 'admin' ? 'block' : 'none');
    
    // Listen-Synchronisierung für App-Modus sicherstellen
    db.ref('configs/' + standortId).on('value', (configSnap) => {
      const config = configSnap.val();
      if (config) {
        dynamicTouren = config.touren || TOUREN;
        dynamicFahrer = config.fahrer || FAHRER;
        dynamicKennzeichen = config.kennzeichen || KENNZEICHEN;
      }
    });

    firebaseDbRef = db.ref('plans/' + standortId);
    firebaseDbRef.on('value', snapshot => {
      const val = snapshot.val();
      if (!val || Date.now() - lastLocalChangeTime < 1500) return;
      isRemoteUpdate = true;
      localStorage.setItem('autoPlan_v5_' + standortId, JSON.stringify(val));
      loadTableData(val);
      isRemoteUpdate = false;
    });

    const localData = JSON.parse(localStorage.getItem('autoPlan_v5_' + standortId)) || [];
    loadTableData(localData);
  }

  function loadTableData(data) {
    tableBody.innerHTML = "";
    // Falls keine Daten da sind, Standard-Anzahl an Zeilen nutzen
    const count = data.length > 0 ? data.length : ROWS_COUNT;
    for (let i = 0; i < count; i++) {
      const rowData = data[i] || ["", "", ""];
      const tr = document.createElement("tr");
      for (let j = 0; j < 3; j++) {
        const td = document.createElement("td");
        td.innerText = rowData[j] || "";
        td.onclick = () => openModal(td, j);
        tr.appendChild(td);
      }
      tableBody.appendChild(tr);
    }
  }

  document.getElementById("add-row-btn").onclick = () => {
    const tr = document.createElement("tr");
    for (let j = 0; j < 3; j++) {
      const td = document.createElement("td");
      td.innerText = "";
      td.onclick = () => openModal(td, j);
      tr.appendChild(td);
    }
    tableBody.appendChild(tr);
    saveData();
  };

  document.getElementById("remove-row-btn").onclick = () => {
    const rows = tableBody.querySelectorAll("tr");
    if (rows.length > 1) {
      if (confirm("Letzte Zeile wirklich löschen?")) {
        tableBody.removeChild(rows[rows.length - 1]);
        saveData();
      }
    } else {
      alert("Es muss mindestens eine Zeile vorhanden sein.");
    }
  };

  function openModal(td, colIndex) {
    window.activeCell = td;
    optionsList.innerHTML = "";
    let options = colIndex === 0 ? dynamicTouren : (colIndex === 1 ? dynamicFahrer : dynamicKennzeichen);
    const clearBtn = document.createElement("button");
    clearBtn.innerText = "--- LEEREN ---";
    clearBtn.className = "option-btn";
    clearBtn.style.background = "#999";
    clearBtn.onclick = () => { window.activeCell.innerText = ""; saveData(); closeModal(); };
    optionsList.appendChild(clearBtn);

    options.forEach(opt => {
      const btn = document.createElement("button");
      btn.innerText = opt;
      btn.className = "option-btn";
      btn.onclick = () => { window.activeCell.innerText = opt; saveData(); closeModal(); };
      optionsList.appendChild(btn);
    });
    selectionModal.style.display = "block";
  }

  window.closeModal = () => { selectionModal.style.display = "none"; };

  function saveData() {
    const rows = [];
    document.querySelectorAll("#autoTable tbody tr").forEach(tr => {
      const row = [];
      tr.querySelectorAll("td").forEach(td => row.push(td.innerText));
      rows.push(row);
    });
    if (currentStandortId && firebaseDbRef && !isRemoteUpdate) {
      lastLocalChangeTime = Date.now();
      firebaseDbRef.set(rows);
    }
  }

  const profileModal = document.getElementById("profileModal");
  const listSetupModal = document.getElementById("listSetupModal");
  const helpModal = document.getElementById("helpModal");
  const newsModal = document.getElementById("newsModal");
  const newsContent = document.getElementById("newsContent");
  const newsBadge = document.getElementById("news-badge");
  const adminNewsPanel = document.getElementById("admin-news-panel");
  const adminNewsText = document.getElementById("adminNewsText");
  const editName = document.getElementById("editName");
  const editEmail = document.getElementById("editEmail");
  const editPassword = document.getElementById("editPassword");

  // Dashboard Actions
  document.getElementById("gear-icon").onclick = (e) => {
    e.stopPropagation();
    const menu = document.getElementById("settings-menu");
    menu.style.display = menu.style.display === "block" ? "none" : "block";
  };

  document.addEventListener("click", () => {
    document.getElementById("settings-menu").style.display = "none";
  });

  document.getElementById("dash-profile-btn").onclick = (e) => {
    e.stopPropagation();
    profileModal.style.display = "block";
    // Pre-fill current data
    firebase.database().ref('users/' + currentUser.uid).once('value', (snap) => {
      const data = snap.val();
      if (data) editName.value = data.name || "";
    });
    editEmail.value = currentUser.email;
    editPassword.value = "";
  };

  window.closeProfileModal = () => { profileModal.style.display = "none"; };
  window.closeListSetupModal = () => { listSetupModal.style.display = "none"; };
  window.closeHelpModal = () => { helpModal.style.display = "none"; };
  window.closeNewsModal = () => { newsModal.style.display = "none"; newsBadge.style.display = "none"; };

  document.getElementById("news-icon").onclick = (e) => {
    e.stopPropagation();
    newsModal.style.display = "block";
    
    // Admin Check
    const ADMIN_EMAILS = ["esberber44@gmail.com", "eren@gmail.com"]; 
    if (currentUser && ADMIN_EMAILS.includes(currentUser.email)) {
      adminNewsPanel.style.display = "block";
    } else {
      adminNewsPanel.style.display = "none";
    }
  };

  document.getElementById("send-news-btn").onclick = async () => {
    const text = adminNewsText.value.trim();
    if (!text) return;
    try {
      await firebase.database().ref('announcements').set({
        text: text,
        timestamp: Date.now()
      });
      adminNewsText.value = "";
      alert("Nachricht gesendet!");
    } catch (e) { alert("Fehler: " + e.message); }
  };

  function initNewsWatcher() {
    // 1. WATCH ANNOUNCEMENTS (GLOBAL NEWS)
    firebase.database().ref('announcements').on('value', (snap) => {
      const data = snap.val();
      updateNewsContent();
    });

    // 2. WATCH INVITES (PERSONAL NEWS)
    if (currentUser) {
      const inviteId = btoa(currentUser.email.toLowerCase());
      firebase.database().ref('invites/' + inviteId).on('value', (inviteSnap) => {
        updateNewsContent();
      });
    }
  }

  async function updateNewsContent() {
    const newsSection = document.getElementById("newsContent");
    if (!newsSection) return;
    newsSection.innerHTML = ""; 

    // A. FETCH ANNOUNCEMENTS
    const annSnap = await firebase.database().ref('announcements').once('value');
    const annData = annSnap.val();
    if (annData) {
      const annDiv = document.createElement("div");
      annDiv.style.background = "#fff3e0";
      annDiv.style.padding = "10px";
      annDiv.style.borderRadius = "4px";
      annDiv.style.borderLeft = "4px solid #ff9800";
      annDiv.style.marginBottom = "15px";
      annDiv.innerHTML = `
        <small style="color:#888;">${new Date(annData.timestamp).toLocaleString()}</small><br>
        ${annData.text.replace(/\n/g, '<br>')}
      `;
      newsSection.appendChild(annDiv);
      
      const lastRead = localStorage.getItem('lastNewsRead') || 0;
      if (annData.timestamp > lastRead && newsModal.style.display !== "block") {
        newsBadge.innerText = "!";
        newsBadge.style.display = "flex";
      }
    }

    // B. FETCH INVITES
    if (currentUser) {
      const inviteId = btoa(currentUser.email.toLowerCase());
      const inviteSnap = await firebase.database().ref('invites/' + inviteId).once('value');
      const invite = inviteSnap.val();

      if (invite) {
        const div = document.createElement("div");
        div.id = "news-invite-div";
        div.style.background = "#e3f2fd";
        div.style.padding = "10px";
        div.style.borderRadius = "4px";
        div.style.borderLeft = "4px solid #2196f3";
        div.style.marginTop = "10px";
        div.innerHTML = `
          <strong>Einladung erhalten!</strong><br>
          <p>${invite.standortName} möchte, dass du beitrittst.</p>
          <button onclick="acceptInvite('${inviteId}')" class="auth-btn" style="padding: 5px 10px; font-size: 12px; margin-top: 5px;">Annehmen</button>
          <button onclick="declineInvite('${inviteId}')" class="cancel-btn" style="padding: 5px 10px; font-size: 12px; margin-top: 5px; margin-left: 5px;">Ablehnen</button>
        `;
        newsSection.prepend(div);
        newsBadge.innerText = "!";
        newsBadge.style.display = "flex";
      }
    }
  }

  document.getElementById("dash-help-btn").onclick = (e) => {
    e.stopPropagation();
    helpModal.style.display = "block";
  };

  document.getElementById("dash-setup-btn").onclick = (e) => {
    e.stopPropagation();
    listSetupModal.style.display = "block";
    document.getElementById("setupTouren").value = dynamicTouren.join("\n");
    document.getElementById("setupFahrer").value = dynamicFahrer.join("\n");
    document.getElementById("setupKennzeichen").value = dynamicKennzeichen.join("\n");
  };

  document.getElementById("save-lists-btn").onclick = async () => {
    const touren = document.getElementById("setupTouren").value.split("\n").map(s => s.trim()).filter(s => s);
    const fahrer = document.getElementById("setupFahrer").value.split("\n").map(s => s.trim()).filter(s => s);
    const kennzeichen = document.getElementById("setupKennzeichen").value.split("\n").map(s => s.trim()).filter(s => s);
    
    try {
      await firebase.database().ref('configs/' + currentStandortId).set({
        touren, fahrer, kennzeichen
      });
      
      // Update local variables immediately so the table uses them without reload
      dynamicTouren = touren;
      dynamicFahrer = fahrer;
      dynamicKennzeichen = kennzeichen;
      
      alert("Listen gespeichert!");
      closeListSetupModal();
    } catch (e) { alert("Fehler: " + e.message); }
  };

  document.getElementById("save-profile-btn").onclick = async () => {
    // profile update logic
    const name = editName.value.trim();
    const email = editEmail.value.trim();
    const pass = editPassword.value;
    
    if (!name) return alert("Name darf nicht leer sein!");
    
    try {
      await firebase.database().ref('users/' + currentUser.uid).update({ name });
      if (email !== currentUser.email) await currentUser.updateEmail(email);
      if (pass) await currentUser.updatePassword(pass);
      alert("Profil aktualisiert!");
      closeProfileModal();
    } catch (e) { alert("Fehler: " + e.message); }
  };

  document.getElementById("createStandortBtn").onclick = async () => {
    const locName = document.getElementById("createStandortInput").value.trim();
    if (!locName) return alert("Bitte einen Standortnamen eingeben!");
    try {
      await firebase.database().ref('users/' + currentUser.uid).update({
        standort: locName,
        standortId: currentUser.uid,
        role: 'admin'
      });
      alert("Standort '" + locName + "' wurde erstellt! Du bist jetzt Administrator.");
      location.reload();
    } catch (e) { alert("Fehler: " + e.message); }
  };

  document.getElementById("dash-create-btn").onclick = () => {
    if (currentStandortId && (userRole === 'boss' || userRole === 'admin' || userRole === 'employee')) {
      startApp(currentStandortId);
    } else {
      alert("Bitte erstelle ein Konto mit Standort-Namen oder lass dich einladen, um eine Tabelle zu verwalten.");
    }
  };

  document.getElementById("dash-join-btn").onclick = async () => {
    if (!currentUser) return alert("Bitte melde dich erst an.");
    
    const db = firebase.database();
    try {
      // Direct, single-shot fetch for current status
      const userSnap = await db.ref('users/' + currentUser.uid).get();
      const userData = userSnap.val();
      
      if (userData && userData.standortId) {
        currentStandortId = userData.standortId;
        currentStandortName = userData.standort;
        userRole = userData.role;
        startApp(userData.standortId);
      } else {
        const inviteId = btoa(currentUser.email.toLowerCase());
        const inviteSnap = await db.ref('invites/' + inviteId).get();
        if (inviteSnap.val()) {
          newsModal.style.display = "block";
          alert("Du hast eine Einladung! Schau unter Nachrichten (📢) nach und klicke auf 'Annehmen'.");
        } else {
          alert("Kein Standort gefunden. Bitte lass dich erst von einem Administrator einladen.");
        }
      }
    } catch (e) {
      alert("Fehler: " + e.message);
    }
  };

  window.declineInvite = async (inviteId) => {
    if (confirm("Einladung wirklich ablehnen?")) {
      try {
        await firebase.database().ref('invites/' + inviteId).remove();
        invitesModal.style.display = "none";
        alert("Einladung wurde abgelehnt.");
      } catch (e) {
        alert("Fehler: " + e.message);
      }
    }
  };

  window.deleteAccount = async () => {
    if (!currentUser) return;
    if (confirm("⚠️ Konto und ALLE Standortdaten unwiderruflich löschen?")) {
      try {
        const uid = currentUser.uid;
        const db = firebase.database();
        
        // Get user data before deletion to check role and standort
        const userSnap = await db.ref('users/' + uid).once('value');
        const userData = userSnap.val();
        
        if (userData && (userData.role === 'boss' || userData.role === 'admin')) {
          await db.ref('plans/' + uid).remove();
          const invitesSnap = await db.ref('invites').orderByChild('standortId').equalTo(uid).once('value');
          const invites = invitesSnap.val();
          if (invites) {
            for (let key in invites) await db.ref('invites/' + key).remove();
          }
        }
        
        await db.ref('users/' + uid).remove();
        await currentUser.delete();
        location.reload();
      } catch (e) { alert("Fehler: " + e.message); }
    }
  };

  document.getElementById("dash-del-btn").onclick = window.deleteAccount;

  window.acceptInvite = async (inviteId) => {
    const db = firebase.database();
    try {
      const snap = await db.ref('invites/' + inviteId).once('value');
      const invite = snap.val();
      if (invite) {
        // Fetch existing user data to keep the name
        const userSnap = await db.ref('users/' + currentUser.uid).once('value');
        const existingData = userSnap.val() || {};
        
        await db.ref('users/' + currentUser.uid).set({
          ...existingData,
          standort: invite.standortName,
          standortId: invite.standortId,
          role: 'employee'
        });
        
        await db.ref('invites/' + inviteId).remove();
        invitesModal.style.display = "none";
        alert("Einladung angenommen! Du kannst jetzt die Tabelle öffnen.");
        location.reload(); 
      }
    } catch (e) {
      alert("Fehler beim Annehmen: " + e.message);
    }
  };

  window.closeInvitesModal = () => { invitesModal.style.display = "none"; };
  document.getElementById("back-to-dash-btn").onclick = showDashboard;
  
  const logoutAction = () => {
    firebase.auth().signOut().then(() => {
      currentUser = null;
      showAuth();
      location.reload();
    }).catch((error) => {
      console.error("Logout error:", error);
    });
  };

  document.getElementById("dash-logout-btn").onclick = logoutAction;
  document.getElementById("logout-btn").onclick = logoutAction;

  // Team Management
  window.openTeamModal = () => { teamModal.style.display = "block"; loadTeamList(); };
  window.closeTeamModal = () => { teamModal.style.display = "none"; };

  function loadTeamList() {
    const db = firebase.database();
    
    // Show Pending Invites
    db.ref('invites').orderByChild('standortId').equalTo(currentStandortId).on('value', (snapshot) => {
      teamList.innerHTML = "<h4>Offene Einladungen</h4>";
      const invites = snapshot.val();
      if (invites) {
        Object.keys(invites).forEach(key => {
          const div = document.createElement("div");
          div.style.display = "flex"; div.style.justifyContent = "space-between"; div.style.marginBottom = "5px";
          div.innerHTML = `<span>${invites[key].email}</span> <button onclick="removeInvite('${key}')" style="background:#999;color:white;border:none;border-radius:3px;padding:2px 5px;cursor:pointer;">Abbrechen</button>`;
          teamList.appendChild(div);
        });
      } else {
        const p = document.createElement("p");
        p.innerText = "Keine offenen Einladungen.";
        p.style.fontSize = "12px";
        teamList.appendChild(p);
      }

      // Show Active Members
      const memberHeader = document.createElement("h4");
      memberHeader.innerText = "Aktive Mitarbeiter";
      memberHeader.style.marginTop = "15px";
      teamList.appendChild(memberHeader);

      db.ref('users').orderByChild('standortId').equalTo(currentStandortId).on('value', (userSnap) => {
        const users = userSnap.val();
        let foundMembers = false;
        if (users) {
          // Note: teamList.innerHTML already contains the header from the outer listener
          // We need to keep the header but clear the old list items to avoid duplicates
          const activeListContainer = document.createElement("div");
          Object.keys(users).forEach(uid => {
            if (users[uid].role === 'employee') {
              foundMembers = true;
              const div = document.createElement("div");
              div.style.display = "flex"; div.style.justifyContent = "space-between"; div.style.marginBottom = "5px";
              
              // Priority: Name -> Email -> Truncated ID
              const displayName = users[uid].name || users[uid].email || (uid.length > 8 ? uid.substring(0,8) + "..." : uid);
              
              div.innerHTML = `<span>${displayName}</span> <button onclick="removeMember('${uid}')" style="background:#d40000;color:white;border:none;border-radius:3px;padding:2px 5px;cursor:pointer;">Rauswerfen</button>`;
              activeListContainer.appendChild(div);
            }
          });
          
          if (foundMembers) {
            // Remove previous active member entries if they exist (to handle real-time updates)
            const oldItems = teamList.querySelectorAll(".active-member-item");
            oldItems.forEach(el => el.remove());
            
            activeListContainer.childNodes.forEach(node => {
               const cloned = node.cloneNode(true);
               cloned.classList.add("active-member-item");
               teamList.appendChild(cloned);
            });
          }
        }
        
        if (!foundMembers) {
          const oldItems = teamList.querySelectorAll(".active-member-item");
          oldItems.forEach(el => el.remove());
          const p = document.createElement("p");
          p.innerText = "Keine aktiven Mitarbeiter.";
          p.style.fontSize = "12px";
          p.classList.add("active-member-item");
          teamList.appendChild(p);
        }
      });
    });
  }

  window.removeMember = async (uid) => {
    if (confirm("Möchtest du diesen Mitarbeiter wirklich aus deinem Standort entfernen?")) {
      try {
        await firebase.database().ref('users/' + uid).update({
          standort: null,
          standortId: null,
          role: null
        });
        alert("Mitarbeiter wurde entfernt.");
      } catch (e) {
        alert("Fehler: " + e.message);
      }
    }
  };

  window.inviteEmployee = async () => {
    const email = inviteEmailInput.value.trim().toLowerCase();
    if (!email) return;
    const inviteId = btoa(email);
    await firebase.database().ref('invites/' + inviteId).set({
      email: email, standortId: currentStandortId, standortName: currentStandortName
    });
    inviteEmailInput.value = ""; alert("Eingeladen!");
  };

  window.removeInvite = async (id) => { if (confirm("Entfernen?")) await firebase.database().ref('invites/' + id).remove(); };

  // Auth
  document.getElementById("show-register").onclick = () => { loginForm.style.display = "none"; registerForm.style.display = "block"; };
  document.getElementById("show-login").onclick = () => { registerForm.style.display = "none"; loginForm.style.display = "block"; };
  
  const emailVerifyModal = document.getElementById("emailVerifyModal");
  const resendVerifyBtn = document.getElementById("resend-verify-btn");
  window.closeVerifyModal = () => { emailVerifyModal.style.display = "none"; };

  document.getElementById("login-btn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    if (!email || !pass) return alert("Email und Passwort eingeben!");
    try { 
      // Ensure persistence is set again just before login
      await firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);
      const cred = await firebase.auth().signInWithEmailAndPassword(email, pass); 
      if (!cred.user.emailVerified) {
        emailVerifyModal.style.display = "block";
        firebase.auth().signOut();
      }
    } catch (e) { statusMsg.style.color = "#d40000"; statusMsg.innerText = e.message; }
  };

  resendVerifyBtn.onclick = async () => {
    const email = document.getElementById("email").value.trim();
    const pass = document.getElementById("password").value;
    if (!email || !pass) return alert("Bitte Email und Passwort für den Neuversand eingeben.");
    try {
      const cred = await firebase.auth().signInWithEmailAndPassword(email, pass);
      await cred.user.sendEmailVerification();
      alert("Ein neuer Bestätigungslink wurde gesendet! Bitte prüfe auch deinen Spam-Ordner.");
      firebase.auth().signOut();
    } catch (e) {
      alert("Fehler beim Senden: " + e.message);
    }
  };

  document.getElementById("forgot-password-btn").onclick = async () => {
    const email = document.getElementById("email").value.trim();
    if (!email) return alert("Bitte gib erst deine E-Mail Adresse im Feld oben ein.");
    try {
      await firebase.auth().sendPasswordResetEmail(email);
      alert("Link zum Zurücksetzen wurde gesendet!\n\n⚠️ WICHTIG: Bitte prüfe unbedingt auch deinen SPAM-ORDNER, falls du keine E-Mail findest.");
    } catch (e) { alert("Fehler: " + e.message); }
  };

  document.getElementById("register-btn").onclick = async () => {
    const nameEl = document.getElementById("reg-name");
    const locEl = document.getElementById("reg-location");
    const emEl = document.getElementById("reg-email");
    const pwEl = document.getElementById("reg-password");
    
    const name = nameEl ? nameEl.value.trim() : "";
    const loc = locEl ? locEl.value.trim() : "";
    const em = emEl ? emEl.value.trim().toLowerCase() : "";
    const pw = pwEl ? pwEl.value.trim() : "";
    
    if (!name || !em || !pw) return alert("Name, Email und Passwort ausfüllen!");

    // SECURITY: Whitelist check
    const isDhlEmail = em.endsWith("@dhl.com") || em.endsWith("@dpdhl.com") || em === "esberber44@gmail.com";
    if (!isDhlEmail) {
      alert("⚠️ Zugriff verweigert: Nur offizielle @dhl.com E-Mail-Adressen sind erlaubt!");
      return;
    }

    try {
      const cred = await firebase.auth().createUserWithEmailAndPassword(em, pw);
      await cred.user.sendEmailVerification();
      
      const userData = { 
        name: name,
        email: em
      };
      
      if (loc) {
        userData.standort = loc;
        userData.standortId = cred.user.uid;
        userData.role = 'admin';
      }
      
      await firebase.database().ref('users/' + cred.user.uid).set(userData);
      alert("Konto erstellt! Bitte bestätige deine E-Mail (Link im Posteingang), bevor du dich anmeldest.");
      firebase.auth().signOut();
      location.reload();
    } catch (e) { 
      statusMsg.style.color = "#d40000";
      statusMsg.innerText = "Fehler: " + e.message; 
    }
  };
  document.getElementById("logout-btn").onclick = () => firebase.auth().signOut();

  initFirebase();
});
