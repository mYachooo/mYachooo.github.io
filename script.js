// Importuj potrzebne funkcje z SDK Firebase v9+
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-app.js";
import { getDatabase, ref, onValue, push, remove } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-database.js";
// NOWE: Importy dla Authentication
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-auth.js";
// getAnalytics jest opcjonalne
// import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.10/firebase-analytics.js";


// Twoja konfiguracja Firebase (bez zmian)
const firebaseConfig = {
  apiKey: "AIzaSyDrIYX35tUW9MilvbrKx3InJA31nmYoDSc",
  authDomain: "szachybase.firebaseapp.com",
  databaseURL: "https://szachybase-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "szachybase",
  storageBucket: "szachybase.firebasestorage.app",
  messagingSenderId: "933829399000",
  appId: "1:933829399000:web:a682adbbc97b4c8a0862ad",
  measurementId: "G-S9C816M0PW"
};

// Zainicjuj Firebase
const app = initializeApp(firebaseConfig);
// const analytics = getAnalytics(app); // Odkomentuj jeśli używasz
const database = getDatabase(app);
// NOWE: Zainicjuj Authentication
const auth = getAuth(app);

// --- Zmienne Globalne ---
let currentUser = null; // Przechowuje stan zalogowanego użytkownika
// ZASTĄP TO PRAWDZIWYM UID ADMINISTRATORA z konsoli Firebase!
const ADMIN_UID = "TUTAJ_WKLEJ_UID_ADMINA";

// Poczekaj na załadowanie DOM
document.addEventListener('DOMContentLoaded', () => {
    // Referencje do elementów DOM (formularz, tabela, etc.)
    const scoreForm = document.getElementById('add-score-form');
    const scoresTbody = document.getElementById('scores-tbody');
    const dateInput = document.getElementById('game-date');
    const registeredByInput = document.getElementById('registered-by');
    // NOWE: Referencje do elementów logowania
    const loginForm = document.getElementById('login-form');
    const logoutSection = document.getElementById('logout-section');
    const loginButton = document.getElementById('login-button');
    const logoutButton = document.getElementById('logout-button');
    const adminEmailInput = document.getElementById('admin-email');
    const adminPasswordInput = document.getElementById('admin-password');
    const userEmailSpan = document.getElementById('user-email');
    const authStatusP = document.getElementById('auth-status');

    if (!scoreForm || !scoresTbody || !dateInput || !registeredByInput || !loginForm || !logoutSection || !loginButton || !logoutButton) {
        console.error("Brak kluczowych elementów DOM. Sprawdź ID w HTML.");
        alert("Błąd inicjalizacji interfejsu.");
        return;
    }

    // Referencja do węzła 'scores' (bez zmian)
    const scoresRef = ref(database, 'scores');

    // --- Funkcje Pomocnicze (setTodayDate - bez zmian) ---
    const setTodayDate = () => { /* ... bez zmian ... */ };

    // --- Renderowanie Danych (MODYFIKACJA!) ---
    const renderScores = (scoresArray) => {
        scoresTbody.innerHTML = '';
        scoresArray.sort((a, b) => new Date(b.date) - new Date(a.date));

        if (scoresArray.length === 0) {
             scoresTbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Brak zapisanych partii.</td></tr>';
             return;
        }

        scoresArray.forEach((score) => {
            if(!score || typeof score !== 'object' || !score.id) { return; }
            const row = scoresTbody.insertRow();
            // ... (komórki 0-5 bez zmian - data, gracze, wynik, notatki, zarejestrował) ...
            row.insertCell(0).textContent = score.date || '?';
            row.insertCell(1).textContent = score.white || '?';
            row.insertCell(2).textContent = score.black || '?';
            row.insertCell(3).textContent = score.result || '?';
            const notesCell = row.insertCell(4);
            notesCell.textContent = score.notes || '-';
            notesCell.style.whiteSpace = 'pre-wrap';
            row.insertCell(5).textContent = score.registeredBy || '?';

            const actionCell = row.insertCell(6); // Komórka akcji

            // !! KLUCZOWA ZMIANA: Pokaż przycisk Usuń tylko jeśli admin jest zalogowany !!
            if (currentUser && currentUser.uid === ADMIN_UID) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = 'Usuń';
                deleteBtn.classList.add('delete-btn');
                // Usunięcie NIE wymaga już hasła - weryfikacja będzie w Regułach Firebase
                deleteBtn.onclick = () => deleteScoreFromFirebase(score.id);
                actionCell.appendChild(deleteBtn);
            } else {
                // Można zostawić pustą komórkę lub dodać np. myślnik
                 actionCell.textContent = '-';
            }
        });
    };

    // --- Funkcje Autoryzacji ---
    const handleLogin = () => {
        const email = adminEmailInput.value;
        const password = adminPasswordInput.value;
        if (!email || !password) {
            authStatusP.textContent = "Podaj email i hasło.";
            return;
        }
        authStatusP.textContent = "Logowanie...";
        signInWithEmailAndPassword(auth, email, password)
            .then((userCredential) => {
                // Sukces logowania - onAuthStateChanged zajmie się resztą
                console.log("Zalogowano pomyślnie:", userCredential.user.email);
                authStatusP.textContent = ""; // Wyczyść status
                adminPasswordInput.value = ""; // Wyczyść pole hasła
            })
            .catch((error) => {
                console.error("Błąd logowania:", error);
                authStatusP.textContent = `Błąd logowania: ${error.message}`;
            });
    };

    const handleLogout = () => {
        signOut(auth)
            .then(() => {
                // Sukces wylogowania - onAuthStateChanged zajmie się resztą
                console.log("Wylogowano pomyślnie.");
                authStatusP.textContent = "Wylogowano.";
            })
            .catch((error) => {
                console.error("Błąd wylogowania:", error);
                authStatusP.textContent = "Błąd podczas wylogowywania.";
            });
    };

    // --- Obserwator Stanu Autoryzacji (Bardzo Ważne!) ---
    onAuthStateChanged(auth, (user) => {
        currentUser = user; // Aktualizuj globalny stan użytkownika
        if (user) {
            // Użytkownik jest zalogowany
            console.log("Stan autoryzacji: Zalogowany jako", user.email, "UID:", user.uid);
            loginForm.style.display = 'none'; // Ukryj formularz logowania
            logoutSection.style.display = 'block'; // Pokaż sekcję wylogowania
            userEmailSpan.textContent = user.email;
            authStatusP.textContent = ""; // Wyczyść ewentualne komunikaty
            // Jeśli zalogowany użytkownik NIE jest adminem (opcjonalne sprawdzenie)
            if (user.uid !== ADMIN_UID) {
                 authStatusP.textContent = "Zalogowano, ale nie posiadasz uprawnień administratora.";
            }
        } else {
            // Użytkownik jest wylogowany
            console.log("Stan autoryzacji: Wylogowany");
            loginForm.style.display = 'block'; // Pokaż formularz logowania
            logoutSection.style.display = 'none'; // Ukryj sekcję wylogowania
            userEmailSpan.textContent = '';
        }
        // !! Po zmianie stanu logowania, musimy ponownie wyrenderować tabelę,
        // !! aby poprawnie pokazać/ukryć przyciski usuwania.
        // !! Pobieramy dane ponownie, aby upewnić się, że mamy aktualną listę.
        onValue(scoresRef, (snapshot) => { // Można by zoptymalizować, by nie pobierać danych za każdym razem
             const scoresData = snapshot.val();
             const scoresArray = [];
             if (scoresData) {
                 for (const key in scoresData) { scoresArray.push({ id: key, ...scoresData[key] }); }
             }
             renderScores(scoresArray); // Renderuj z uwzględnieniem nowego stanu currentUser
         }, { onlyOnce: true }); // onlyOnce: true - pobierz tylko raz po zmianie stanu auth
                               // lub pozostaw bez tego, jeśli chcesz pełnej synchronizacji
    });

    // --- Operacje CRUD (Czytanie i Dodawanie bez zmian, Usuwanie zmienione) ---

    // CZYTANIE v9: Nasłuchuj na zmiany w czasie rzeczywistym
    onValue(scoresRef, (snapshot) => {
        const scoresData = snapshot.val();
        const scoresArray = [];
        if (scoresData) {
            for (const key in scoresData) { scoresArray.push({ id: key, ...scoresData[key] }); }
        }
        // Renderowanie wywoływane jest teraz głównie przez onAuthStateChanged,
        // ale zostawiamy je tutaj dla aktualizacji w czasie rzeczywistym.
        renderScores(scoresArray);
    }, (error) => {
        console.error("Błąd odczytu z Firebase (v9):", error);
        // alert("Nie można załadować danych z bazy."); // Może być zbyt nachalne
    });

    // TWORZENIE v9: Bez zmian w logice dodawania
    const addScore = (event) => { /* ... kod funkcji addScore bez zmian ... */
        event.preventDefault();
        const whitePlayer = document.getElementById('white-player').value.trim();
        const blackPlayer = document.getElementById('black-player').value.trim();
        const result = document.getElementById('result').value;
        const gameDate = dateInput.value;
        const notes = document.getElementById('notes').value.trim();
        const registeredBy = registeredByInput.value.trim();

        if (!whitePlayer || !blackPlayer || !result || !gameDate || !registeredBy) {
            alert("Proszę wypełnić wszystkie wymagane pola."); return;
        }

        const newScoreData = { white: whitePlayer, black: blackPlayer, result: result, date: gameDate, notes: notes, registeredBy: registeredBy };

        push(scoresRef, newScoreData)
            .then(() => { console.log("Wpis dodany (v9)."); scoreForm.reset(); setTodayDate(); })
            .catch((error) => { console.error("Błąd zapisu (v9):", error); alert("Nie udało się zapisać wyniku. Sprawdź Reguły Bezpieczeństwa."); });
    };

    // USUWANIE v9: Bezpośrednie wywołanie usunięcia (bez hasła w JS)
    const deleteScoreFromFirebase = (idToDelete) => {
        if (!idToDelete) { console.error("Brak ID do usunięcia."); return; }
        const scoreToDeleteRef = ref(database, 'scores/' + idToDelete);
        remove(scoreToDeleteRef)
            .then(() => { console.log(`Wysłano żądanie usunięcia wpisu ${idToDelete} (v9).`); })
            .catch((error) => {
                console.error(`Błąd podczas usuwania wpisu ${idToDelete} (v9):`, error);
                // Błąd może wynikać z braku uprawnień (Reguły Firebase)
                alert("Nie udało się usunąć wpisu. Możliwy brak uprawnień.");
            });
    };
    // Usuwamy funkcję requestPasswordAndDelete - jest już niepotrzebna

    // --- Inicjalizacja ---
    setTodayDate();
    scoreForm.addEventListener('submit', addScore);
    // Dodaj listenery do przycisków logowania/wylogowania
    loginButton.addEventListener('click', handleLogin);
    logoutButton.addEventListener('click', handleLogout);

    console.log("Notatnik Szachowy (Firebase v9 + Auth) zainicjalizowany.");

}); // Koniec DOMContentLoaded